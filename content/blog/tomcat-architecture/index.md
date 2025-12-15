---
title: "Tomcat 아키텍처 완벽 가이드"
date: "2025-12-12"
description: "Tomcat의 핵심 컴포넌트 구조와 Connector, Container 계층을 상세히 알아봅니다."
tags: ["Tomcat", "Java", "Web Server", "Architecture", "Spring Boot"]
---

## Tomcat 아키텍처 개요

Tomcat은 단순한 웹 서버가 아닙니다. 여러 계층의 컴포넌트가 유기적으로 연결된 **Servlet Container**입니다.

![Tomcat 전체 컴포넌트 계층도](./Tomcat.png)

### 핵심 컴포넌트

| 컴포넌트 | 역할 | 설명 |
|---------|------|------|
| **Server** | 최상위 컨테이너 | Tomcat 인스턴스 전체, 포트 8005로 shutdown 명령 수신 |
| **Service** | Connector와 Engine 묶음 | 하나의 Engine에 여러 Connector 연결 가능 |
| **Connector** | 요청 수신 | HTTP, AJP 프로토콜 처리, Socket 연결 관리 |
| **Engine** | 요청 라우팅 | 가상 호스트로 요청 전달 |
| **Host** | 가상 호스트 | 도메인별 애플리케이션 격리 |
| **Context** | 웹 애플리케이션 | WAR 파일 하나당 하나의 Context |
| **Wrapper** | Servlet | Servlet 인스턴스를 감싸는 컨테이너 |

## Connector와 Container

Tomcat 내부는 크게 두 부분으로 나뉩니다.

![톰캣 커넥터](./tomcatConnec.png)

### Coyote (Connector)

네트워크 레벨을 담당합니다.

- **ProtocolHandler**: HTTP/1.1, HTTP/2, AJP 등 프로토콜별 처리
- **Endpoint**: 소켓 연결 관리, I/O 처리
- **Processor**: HTTP 요청 파싱, 응답 생성

### Catalina (Container)

비즈니스 로직 실행을 담당합니다.

- **Engine**: Host 헤더 기반 라우팅
- **Host**: 도메인별 애플리케이션 관리
- **Context**: 웹 애플리케이션 단위
- **Wrapper**: Servlet 인스턴스 관리

## server.xml 구조

![톰캣 서버 xml](./tomcatServer.png)

## Connector 종류

### NIO (Non-blocking I/O)

```xml
<Connector port="8080"
           protocol="org.apache.coyote.http11.Http11NioProtocol"
           maxThreads="200"
           maxConnections="10000" />
```

**특징**:
- Java NIO 사용
- Selector 기반 I/O 멀티플렉싱
- 메모리 효율적 (연결당 Thread 불필요)
- **Spring Boot 기본값**

### NIO2 (Async I/O)

```xml
<Connector port="8080"
           protocol="org.apache.coyote.http11.Http11Nio2Protocol"
           maxThreads="200" />
```

**특징**:
- Java 7+ AsynchronousSocketChannel 사용
- 완전한 비동기 I/O
- NIO보다 약간 높은 성능 (벤치마크 환경 의존적)

![nio vs nio2](./niovsnio2.png)

### 핵심 차이점
![nio vs nio2 핵심 차이점](./niodiffrence.png)


### APR (Apache Portable Runtime)

```xml
<Connector port="8080"
           protocol="org.apache.coyote.http11.Http11AprProtocol"
           maxThreads="200" />
```

**특징**:
- Native C 라이브러리 사용
- OpenSSL 직접 연동 (SSL/TLS 성능 우수)
- 리눅스 epoll, BSD kqueue 활용
- 설치 복잡함 (별도 라이브러리 필요)

**Native C 라이브러리란?**

NIO/NIO2는 Java 코드가 JVM을 통해 OS 시스템콜을 호출합니다. APR은 Tomcat이 직접 만든 C 라이브러리(libtcnative)를 통해 OS를 호출합니다.

```
NIO:  Java 코드 → JVM (JNI) → OS 시스템콜
APR:  Java 코드 → libtcnative.so (C) → OS 시스템콜
```

JVM을 거치지 않고 C 코드가 직접 OS와 통신하므로 오버헤드가 줄어듭니다.

**왜 OpenSSL이 빠른가?**

Java SSL(JSSE)과 OpenSSL의 차이:

| 구분 | Java SSL | OpenSSL |
|------|----------|---------|
| 구현 언어 | Java (JVM 위에서 실행) | C (네이티브 코드) |
| 최적화 | 범용적 | CPU 명령어 최적화 (AES-NI 등) |
| 성능 | 기준 | 2-3배 빠름 |

OpenSSL은 CPU의 하드웨어 암호화 명령어(AES-NI)를 직접 활용합니다. Java SSL은 JVM 바이트코드로 실행되어 이런 최적화가 제한적입니다.

**언제 APR을 사용해야 하나?**
- HTTPS 트래픽이 전체의 대부분일 때
- SSL 핸드셰이크가 빈번할 때 (짧은 연결이 많은 경우)
- 대용량 정적 파일 서빙이 필요할 때 (sendfile 활용)

![BIO vs NIO vs APR 비교](./tomcatConnector.png)

## Connector 주요 파라미터

```xml
<Connector port="8080"
           protocol="HTTP/1.1"

           <!-- Thread Pool -->
           maxThreads="200"           <!-- 최대 Worker Thread 수 -->
           minSpareThreads="10"       <!-- 최소 유휴 Thread 수 -->

           <!-- Connection Pool -->
           maxConnections="10000"     <!-- 최대 동시 연결 수 -->
           acceptCount="100"          <!-- 대기열 크기 (OS backlog) -->

           <!-- Timeout -->
           connectionTimeout="20000"  <!-- Socket read timeout (ms) -->
           keepAliveTimeout="60000"   <!-- Keep-Alive timeout -->

           <!-- Keep-Alive -->
           maxKeepAliveRequests="100" <!-- 하나의 연결에서 최대 요청 수 -->

           <!-- I/O -->
           compression="on"           <!-- 응답 압축 -->
           compressionMinSize="2048"  <!-- 압축 최소 크기 -->
           />
```

### maxConnections vs maxThreads

| 설정 | 설명 |
|------|------|
| **maxConnections** | 동시에 유지할 수 있는 TCP 연결 수 (NIO 기본값: 10000) |
| **maxThreads** | 요청을 처리할 Worker Thread 수 (기본값: 200) |

예: `maxConnections=10000`, `maxThreads=200`이면 10000개 연결 중 200개만 동시 처리, 나머지는 대기합니다.

### acceptCount 동작 원리

- maxConnections 초과 시 OS 레벨 backlog에 대기
- acceptCount=100이면 큐에 100개까지 대기
- 큐도 가득차면 클라이언트는 **Connection Refused** 에러 수신

## Container 계층 구조

### Engine

가상 호스트로 요청을 라우팅합니다.

```xml
<Engine name="Catalina" defaultHost="localhost">
  <Host name="localhost" appBase="webapps" />
  <Host name="www.example.com" appBase="webapps-example" />
</Engine>
```

**요청 처리 흐름**:

1. HTTP Host 헤더 확인: `Host: www.example.com`
2. 매칭되는 Host 컴포넌트 선택
3. 매칭 실패 시 defaultHost 사용

### Host

도메인별 웹 애플리케이션을 격리합니다.

```xml
<Host name="localhost"
      appBase="webapps"
      unpackWARs="true"      <!-- WAR 압축 해제 -->
      autoDeploy="true"      <!-- 자동 배포 -->
      deployOnStartup="true" <!-- 시작 시 배포 -->
      >

  <!-- Valve: Host 레벨 필터 -->
  <Valve className="org.apache.catalina.valves.AccessLogValve"
         directory="logs"
         prefix="localhost_access_log"
         suffix=".txt"
         pattern="%h %l %u %t &quot;%r&quot; %s %b" />
</Host>
```

### Context

웹 애플리케이션 단위입니다.

```xml
<!-- conf/Catalina/localhost/myapp.xml -->
<Context path="/myapp"
         docBase="/var/webapps/myapp"
         reloadable="true"
         >

  <!-- Context별 DataSource -->
  <Resource name="jdbc/mydb"
            auth="Container"
            type="javax.sql.DataSource"
            maxTotal="20"
            maxIdle="10"
            driverClassName="com.mysql.cj.jdbc.Driver"
            url="jdbc:mysql://localhost:3306/mydb" />
</Context>
```

**Context 생성 방법**:

1. **자동 배포**: `webapps/myapp.war` 또는 `webapps/myapp/` 디렉토리
2. **명시적 정의**: `conf/Catalina/localhost/myapp.xml`
3. **server.xml**: 권장하지 않음 (재시작 필요)

### Wrapper

Servlet 인스턴스를 관리합니다.

```
Context: /myapp
├── Wrapper: /hello  → HelloServlet 인스턴스
├── Wrapper: /api/*  → ApiServlet 인스턴스
└── Wrapper: *.jsp   → JspServlet 인스턴스
```

**Servlet 생명주기**:

```java
public class MyServlet extends HttpServlet {

    @Override
    public void init(ServletConfig config) throws ServletException {
        // 1. 초기화 (서버 시작 시 또는 첫 요청 시)
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) {
        // 2. 서비스 (요청마다 호출)
    }

    @Override
    public void destroy() {
        // 3. 소멸 (서버 종료 시)
    }
}
```

**주의**: Servlet은 기본적으로 **싱글톤**입니다. 멀티 스레드 환경에서 동일 인스턴스를 공유하므로 Thread-Safe하게 작성해야 합니다.

```java
// 잘못된 예: 인스턴스 변수 사용
public class BadServlet extends HttpServlet {
    private int count = 0;  // 여러 스레드가 공유 - Race Condition

    protected void doGet(HttpServletRequest req, HttpServletResponse resp) {
        count++;  // 동시성 이슈
    }
}

// 올바른 예: 로컬 변수 사용
public class GoodServlet extends HttpServlet {
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) {
        int count = 0;  // 각 스레드마다 독립적
        count++;
    }
}
```

## ClassLoader 계층 구조

```
Bootstrap ClassLoader (JRE)
    ↓
System ClassLoader (CLASSPATH)
    ↓
Common ClassLoader (tomcat/lib/*.jar)
    ↓
WebApp ClassLoader (/WEB-INF/lib/*.jar, /WEB-INF/classes)
```

**ClassLoader 격리의 장점**:

```
webapps/app1
├── WEB-INF/lib/jackson-2.13.jar   ← App1은 2.13 사용

webapps/app2
├── WEB-INF/lib/jackson-2.15.jar   ← App2는 2.15 사용

→ 같은 Tomcat에서 버전 충돌 없이 동작
```

## 요약

**핵심 포인트**

1. Tomcat은 **Coyote**(Connector)와 **Catalina**(Container) 두 부분으로 구성됩니다.
2. **NIO Connector**가 Spring Boot 기본값이며 대부분의 경우 충분합니다.
3. **maxConnections**는 연결 수, **maxThreads**는 동시 처리 수를 의미합니다.
4. Container 계층은 **Engine → Host → Context → Wrapper** 순서로 요청을 처리합니다.
5. Servlet은 싱글톤이므로 **Thread-Safe**하게 작성해야 합니다.

다음 포스트에서는 Tomcat의 요청 처리 흐름과 Thread 모델을 상세히 알아보겠습니다.
