---
title: "Tomcat 요청 처리 흐름과 Thread 모델"
date: "2025-12-13"
description: "Tomcat의 요청 처리 파이프라인과 NIO Thread 모델을 상세히 알아봅니다."
category: "개발"
tags: ["Tomcat", "Java", "Thread", "NIO", "Connection Pool"]
---

## 요청 처리 전체 흐름

클라이언트 요청이 Tomcat을 거쳐 Servlet까지 도달하는 과정을 알아봅니다.

![톰캣 리퀘스트 과정](./tomcatRequest.png)
### 처리 단계별 설명

| 단계 | 컴포넌트 | 역할 |
|------|----------|------|
| 1 | **Connector** | 소켓 연결 수락, HTTP 파싱 |
| 2 | **Engine** | Host 헤더로 가상 호스트 결정 |
| 3 | **Host** | URL 경로로 Context 결정 |
| 4 | **Context** | web.xml 기반 Wrapper 결정 |
| 5 | **Wrapper** | Filter 체인 실행 후 Servlet 호출 |
| 6 | **Servlet** | 비즈니스 로직 처리, 응답 생성 |

## Connector 내부 구조 (Coyote)

Connector는 단순히 요청을 받는 게 아닙니다. 내부적으로 세 가지 컴포넌트가 계층적으로 동작합니다.

![톰캣 커넥터](./connectorStructure.png)

### ProtocolHandler

프로토콜별로 요청을 처리하는 최상위 컴포넌트입니다. `server.xml`에서 `protocol` 속성으로 지정합니다.

```xml
<Connector port="8080" protocol="org.apache.coyote.http11.Http11NioProtocol" />
```

### Endpoint

Acceptor, Poller, Worker 스레드를 관리하는 주체입니다. 소켓 레벨 I/O를 담당하며, NIO/NIO2/APR 중 어떤 방식으로 I/O를 처리할지 결정합니다.

### Processor

HTTP 바이트 스트림을 파싱해서 Request/Response 객체를 생성합니다. 요청 처리 후 Keep-Alive 여부에 따라 소켓을 재사용할지 결정합니다.

## NIO Thread 모델

Tomcat NIO는 세 종류의 스레드가 협력하여 요청을 처리합니다.

![tomcat nio](./tomcatNio.png)

### Acceptor Thread

새로운 TCP 연결을 수락합니다.

```java
// 의사 코드
class Acceptor implements Runnable {
    private ServerSocketChannel serverSocket;

    public void run() {
        while (running) {
            // 1. 새 연결 대기 (블로킹)
            SocketChannel socket = serverSocket.accept();

            // 2. Non-blocking 모드로 전환
            socket.configureBlocking(false);

            // 3. Poller에 등록 요청
            poller.register(socket);
        }
    }
}
```

**특징**:
- 보통 1개로 충분 (accept()는 매우 빠름)
- 병목 가능성 거의 없음

### Poller Thread

I/O 이벤트를 감지하고 Worker에 작업을 할당합니다.

```java
// 의사 코드
class Poller implements Runnable {
    private Selector selector;
    private Queue<SocketChannel> registerQueue;

    public void run() {
        while (running) {
            // 1. 대기 중인 소켓 등록
            registerPending();

            // 2. I/O 이벤트 대기 (타임아웃: 1초)
            selector.select(1000);

            // 3. 준비된 이벤트 처리
            Iterator<SelectionKey> keys = selector.selectedKeys().iterator();
            while (keys.hasNext()) {
                SelectionKey key = keys.next();
                keys.remove();

                if (key.isReadable()) {
                    // READ 이벤트: Worker Thread에 작업 위임
                    SocketChannel socket = (SocketChannel) key.channel();
                    executor.execute(new SocketProcessor(socket));
                }
            }
        }
    }
}
```

**특징**:
- CPU 코어 수에 따라 1-2개
- 보통 1개로 수만 개 연결 처리 가능
- 연결 수가 10만 이상이면 Poller 개수 증가 고려

### Worker Thread

실제 요청을 처리합니다.

```java
// 의사 코드
class SocketProcessor implements Runnable {
    private SocketChannel socket;

    public void run() {
        try {
            // 1. HTTP 파싱
            HttpRequest request = parseHttpRequest(socket);
            HttpResponse response = new HttpResponse(socket);

            // 2. Container Pipeline 실행
            // Engine → Host → Context → Wrapper
            getContainer().invoke(request, response);

            // 3. 응답 전송
            response.finishResponse();

            // 4. Keep-Alive 처리
            if (request.isKeepAlive()) {
                poller.register(socket);  // 다음 요청 대기
            } else {
                socket.close();
            }

        } catch (Exception e) {
            handleError(e);
        }
    }
}
```

## Thread Pool 구조

![톰캣 스레드풀](./tomcatTread.png)

### Thread Pool 설정

```xml
<Executor name="tomcatThreadPool"
          namePrefix="catalina-exec-"
          maxThreads="200"          <!-- 최대 스레드 수 -->
          minSpareThreads="10"      <!-- 최소 유휴 스레드 -->
          maxIdleTime="60000"       <!-- 유휴 스레드 제거 시간 (ms) -->
          prestartminSpareThreads="true"  <!-- 시작 시 minSpareThreads 생성 -->
          maxQueueSize="100"        <!-- 작업 큐 크기 -->
          />

<Connector port="8080"
           protocol="HTTP/1.1"
           executor="tomcatThreadPool" />
```

### Thread 생성 순서

1. **요청 도착**
2. **현재 스레드 수 < corePoolSize**: 새 스레드 생성
3. **corePoolSize <= 현재 스레드 수 < maximumPoolSize**: 큐에 추가
4. **큐 가득참**: 새 스레드 생성 (최대 maximumPoolSize까지)
5. **maximumPoolSize 도달**: RejectedExecutionException

```
예: corePoolSize=10, maxPoolSize=200, queueSize=100

요청 1-10:    즉시 새 스레드 생성 (10개)
요청 11-110:  큐에 대기 (100개)
요청 111-200: 새 스레드 생성 (90개 추가, 총 100개)
요청 201+:    거부 (RejectedExecutionException)
```

**Tomcat의 TaskQueue 특징**: 일반 ThreadPoolExecutor와 달리 큐가 차지 않아도 스레드가 부족하면 새 스레드를 생성합니다. 이는 응답성 향상을 위한 설계입니다.

## Filter Chain 실행

```
Request
  ↓
ApplicationFilterChain
  ├── Filter 1: CharacterEncodingFilter
  ├── Filter 2: LoggingFilter
  ├── Filter 3: AuthenticationFilter
  └── Servlet: DispatcherServlet (Spring MVC)
       ↓
    Spring Interceptor Chain
       ├── Interceptor 1
       ├── Interceptor 2
       └── Controller
  ↓
Response
```

### Filter vs Interceptor

| 구분 | Filter | Interceptor |
|------|--------|-------------|
| **레벨** | Servlet 레벨 | Spring MVC 레벨 |
| **실행 시점** | DispatcherServlet 이전 | DispatcherServlet 이후 |
| **용도** | 인코딩, 인증, 로깅 | 권한 체크, 공통 로직 |
| **예외 처리** | web.xml error-page | @ExceptionHandler |

## Connection 관리

### Keep-Alive 동작 원리

![Keep-Alive 동작 원리](./HTTPKeep.webp)

**HTTP/1.0 (Keep-Alive 없음)**:
```
Client → Server: GET /page1
Client ← Server: 200 OK (연결 종료)

Client → Server: GET /page2 (새 연결)
Client ← Server: 200 OK (연결 종료)

→ 요청마다 TCP 3-way handshake 반복 (비효율)
```

**HTTP/1.1 (Keep-Alive 기본)**:
```
Client → Server: GET /page1
Client ← Server: 200 OK (Connection: keep-alive)

Client → Server: GET /page2 (같은 연결)
Client ← Server: 200 OK (Connection: keep-alive)

→ 하나의 TCP 연결로 여러 요청 처리
```

**Keep-Alive 설정**:
```xml
<Connector port="8080"
           protocol="HTTP/1.1"
           maxKeepAliveRequests="100"   <!-- 하나의 연결에서 최대 요청 수 -->
           keepAliveTimeout="60000"     <!-- Keep-Alive 타임아웃 (ms) -->
           />
```

**최적화 가이드**:
- 웹 브라우저: `maxKeepAliveRequests=100`, `keepAliveTimeout=60초`
- API 클라이언트: `maxKeepAliveRequests=1000`, `keepAliveTimeout=300초`
- 로드밸런서 뒤: `keepAliveTimeout`을 LB 타임아웃보다 길게 설정

### Connection Timeout

```xml
<Connector port="8080"
           protocol="HTTP/1.1"
           connectionTimeout="20000"  <!-- 20초 -->
           />
```

**동작**:
1. 클라이언트 연결 수립
2. HTTP 요청 헤더 대기 (connectionTimeout 시작)
3. 20초 내에 요청 헤더 도착 안 하면 연결 종료

**주의**: `connectionTimeout`은 **요청 헤더 읽기 타임아웃**입니다. Servlet 실행 시간과는 무관합니다.

### maxConnections vs acceptCount

![Connection Queue 관리](./tomcatQueue.png)

```xml
<Connector maxConnections="10000"
           acceptCount="100"
           maxThreads="200" />
```

**요청 처리 과정**:

| 동시 연결 수 | 상태 |
|-------------|------|
| 1 ~ 10000 | 정상 처리 (Poller가 관리) |
| 10001 ~ 10100 | OS 큐 대기 (TCP backlog) |
| 10101+ | Connection Refused |

### 거절/대기 시나리오 상세

![Thread Pool 거절/대기 시나리오](./threadPoolReject.png)

각 설정값에 따라 4가지 시나리오가 발생합니다.

| 시나리오 | 스레드 | 연결 | Backlog | 결과 |
|---------|--------|------|---------|------|
| **정상 처리** | 여유 있음 | 여유 있음 | 비어있음 | 즉시 Worker 할당 |
| **스레드 부족** | FULL | 여유 있음 | 비어있음 | Poller에서 대기, 스레드 반환 시 처리 |
| **연결 한도 초과** | FULL | FULL | 일부 사용 | OS Backlog 대기, TCP 3-way 완료 대기 |
| **완전 거절** | FULL | FULL | FULL | Connection Refused 에러 |

**핵심**: `maxConnections`이 가득 차도 `acceptCount` 만큼은 OS 레벨에서 대기할 수 있습니다. 이 큐마저 가득 차면 클라이언트는 연결 자체가 거부됩니다.

## Thread 상태 전환

![스레드 상태](./threadState.png)

### 주요 Thread 상태

| 상태 | 설명 |
|------|------|
| **NEW** | 스레드 생성됨 |
| **RUNNABLE** | 실행 대기 또는 I/O 대기 |
| **BLOCKED** | synchronized 락 획득 대기 |
| **WAITING** | wait(), join() 호출로 무기한 대기 |
| **TIMED_WAITING** | sleep(), wait(ms) 호출로 시간 제한 대기 |
| **TERMINATED** | 실행 완료 |

### Thread Dump 생성

```bash
# PID 확인
jps -v

# Thread Dump 생성
jstack <PID> > thread_dump.txt

# 또는
kill -3 <PID>  # catalina.out에 출력
```

### Thread Dump 예시

```
"catalina-exec-1" #25 daemon prio=5 os_prio=0 tid=0x00007f8c8c001000 nid=0x1a2b runnable
   java.lang.Thread.State: RUNNABLE
        at java.net.SocketInputStream.socketRead0(Native Method)
        at com.mysql.cj.protocol.ReadAheadInputStream.fill(ReadAheadInputStream.java:101)
        - locked <0x00000000e0a12345>
        at com.example.service.UserService.findById(UserService.java:45)

"catalina-exec-2" #26 daemon prio=5 os_prio=0 tid=0x00007f8c8c002000 nid=0x1a2c waiting for monitor entry
   java.lang.Thread.State: BLOCKED (on object monitor)
        at com.example.service.CampaignService.getCampaigns(CampaignService.java:78)
        - waiting to lock <0x00000000e0a12345>
```

### 분석 포인트

**BLOCKED 상태 스레드**:
```
- waiting to lock <0x00000000e0a12345>
```
동일한 객체를 대기하는 스레드가 많으면 병목입니다. synchronized 범위를 축소하거나 Lock을 세분화하세요.

**RUNNABLE + Native Method**:
```
at java.net.SocketInputStream.socketRead0(Native Method)
```
DB 쿼리 대기 또는 외부 API 호출입니다. Connection Pool 튜닝이나 타임아웃 설정을 확인하세요.

## 요약

**핵심 포인트**

1. NIO Thread 모델은 **Acceptor**(연결 수락) → **Poller**(이벤트 감지) → **Worker**(요청 처리)로 구성됩니다.
2. **maxConnections**가 가득 차면 **acceptCount**(OS backlog)에 대기하고, 이마저 가득 차면 Connection Refused가 발생합니다.
3. **Keep-Alive**를 활용하면 TCP 연결 재사용으로 성능이 향상됩니다.
4. Thread Dump로 **BLOCKED** 상태 스레드를 분석하면 병목 지점을 찾을 수 있습니다.

다음 포스트에서는 Tomcat 성능 튜닝 방법을 상세히 알아보겠습니다.
