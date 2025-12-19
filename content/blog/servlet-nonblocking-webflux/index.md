---
title: "Servlet 논블로킹 I/O와 Spring WebFlux"
date: "2025-12-16"
description: "Servlet 3.1+ 논블로킹 I/O의 동작 원리와 Spring MVC vs WebFlux의 차이를 알아봅니다."
category: "개발"
tags: ["Servlet", "Spring", "WebFlux", "NIO", "Reactive"]
---

## Servlet API의 기본 I/O

Servlet API는 기본적으로 **블로킹 I/O**입니다.

```java
@PostMapping("/upload")
public String upload(HttpServletRequest request) throws IOException {
    InputStream is = request.getInputStream();
    byte[] buffer = new byte[1024];
    int len;

    while ((len = is.read(buffer)) != -1) {  // 데이터 없으면 블로킹
        // 처리
    }
    return "ok";
}
```

`read()` 호출 시 데이터가 준비되지 않았으면 스레드는 **대기 상태**가 됩니다. 이 스레드는 다른 요청을 처리할 수 없습니다.

### 블로킹의 문제점

```
요청 1 → [Thread-1] ████████████████████████████ (100ms 점유)
요청 2 → [Thread-2] ████████████████████████████ (100ms 점유)
요청 3 → [Thread-3] ████████████████████████████ (100ms 점유)
...
요청 201 → 스레드 풀 고갈 → 대기 또는 거부
```

**maxThreads=200**일 때, 각 요청이 100ms씩 블로킹되면 초당 최대 **2000 TPS**가 한계입니다.

## Servlet 3.1+ 논블로킹 I/O

Servlet 3.1(Java EE 7, 2013)부터 **AsyncContext**와 **ReadListener/WriteListener**로 논블로킹 I/O가 가능합니다.

![블로킹 vs 논블로킹 I/O 비교](./blockingVsNonblocking.png)

### ReadListener 사용법

```java
@WebServlet(urlPatterns = "/async-upload", asyncSupported = true)
public class AsyncUploadServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) {
        AsyncContext asyncContext = req.startAsync();
        ServletInputStream input = req.getInputStream();

        input.setReadListener(new ReadListener() {

            @Override
            public void onDataAvailable() throws IOException {
                // 데이터가 준비됐을 때만 호출됨
                while (input.isReady() && !input.isFinished()) {
                    int b = input.read();  // 즉시 반환 (블로킹 없음)
                    // 처리
                }
            }

            @Override
            public void onAllDataRead() throws IOException {
                // 모든 데이터 읽기 완료
                asyncContext.complete();
            }

            @Override
            public void onError(Throwable t) {
                asyncContext.complete();
            }
        });
    }
}
```

### 동작 원리

| 구분 | 블로킹 (기본) | 논블로킹 (ReadListener) |
|------|--------------|------------------------|
| `read()` 호출 | 데이터 없으면 대기 | `isReady()` 체크 후 읽음 |
| 스레드 동작 | 데이터 올 때까지 점유 | 콜백으로 즉시 반환 |
| 데이터 도착 시 | 블로킹 해제 후 계속 | `onDataAvailable()` 호출 |

**핵심**: `isReady()`가 `true`일 때만 `read()`를 호출하면 블로킹이 발생하지 않습니다.

### WriteListener

응답 쓰기도 마찬가지입니다.

```java
ServletOutputStream output = resp.getOutputStream();

output.setWriteListener(new WriteListener() {

    @Override
    public void onWritePossible() throws IOException {
        // 쓰기 가능할 때만 호출됨
        while (output.isReady()) {
            byte[] data = getNextChunk();
            if (data == null) {
                asyncContext.complete();
                return;
            }
            output.write(data);  // Kernel Buffer에 공간 있으니 즉시 반환
        }
    }

    @Override
    public void onError(Throwable t) {
        asyncContext.complete();
    }
});
```

## Spring MVC vs Spring WebFlux

Spring에서는 이 차이가 **MVC**와 **WebFlux**로 나뉩니다.

### Spring MVC (블로킹)

```java
@RestController
public class UserController {

    @GetMapping("/users/{id}")
    public User getUser(@PathVariable("id") Long id) {
        // DB 조회 동안 스레드 블로킹
        return userRepository.findById(id);
    }
}
```

**내부 동작**:
```
요청 → Tomcat Worker Thread 할당
         → DB 쿼리 (블로킹 대기)
         → 응답 반환
         → 스레드 반환
```

### Spring WebFlux (논블로킹)

```java
@RestController
public class UserController {

    @GetMapping("/users/{id}")
    public Mono<User> getUser(@PathVariable("id") Long id) {
        // 논블로킹, 콜백 기반
        return userRepository.findById(id);
    }
}
```

**내부 동작**:
```
요청 → Event Loop Thread가 ReadListener 등록 후 즉시 반환
         → [데이터 도착] → onDataAvailable() 콜백
         → DB 쿼리 (R2DBC, 논블로킹)
         → [결과 도착] → WriteListener로 응답
```

### 비교 표

| 구분 | Spring MVC | Spring WebFlux |
|------|------------|----------------|
| I/O 모델 | 블로킹 | 논블로킹 |
| 스레드 모델 | Thread-per-Request | Event Loop |
| 기본 서버 | Tomcat (Servlet) | Netty (또는 Tomcat) |
| DB 드라이버 | JDBC (블로킹) | R2DBC (논블로킹) |
| 반환 타입 | `User`, `List<User>` | `Mono<User>`, `Flux<User>` |
| 적합한 상황 | 일반 CRUD, 블로킹 I/O | 대량 동시 연결, 스트리밍 |

## Tomcat vs Netty

WebFlux는 두 가지 서버 위에서 동작할 수 있습니다.

### WebFlux on Tomcat

```
WebFlux (Reactor)
       ↓
Servlet 3.1+ API (ReadListener/WriteListener)
       ↓
Tomcat NIO Connector
```

Tomcat 위에서 WebFlux를 실행하면 **Servlet 3.1+ 논블로킹 API**를 사용합니다.

### WebFlux on Netty (기본값)

```
WebFlux (Reactor)
       ↓
Netty Channel Handler (직접 논블로킹)
       ↓
Netty NIO
```

Netty는 Servlet 없이 **직접 논블로킹 I/O**를 구현합니다.

### 성능 차이

| 구분 | Tomcat + WebFlux | Netty + WebFlux |
|------|------------------|-----------------|
| 레이어 | Servlet API 경유 | 직접 NIO |
| 오버헤드 | 약간 있음 | 최소 |
| 메모리 | Servlet 컨테이너 메모리 | 경량 |
| 기존 Servlet 호환 | 가능 (Filter 등) | 불가 |

**실제 차이는 미미**합니다. 기존 Servlet Filter나 Spring Security가 필요하면 Tomcat, 순수 WebFlux만 쓸 거면 Netty가 적합합니다.

## 언제 무엇을 써야 하는가

### Spring MVC를 선택해야 하는 경우

- 대부분의 일반적인 웹 애플리케이션
- JDBC 기반 DB 사용 (JPA, MyBatis)
- 블로킹 라이브러리 의존성이 많은 경우
- 팀이 명령형 프로그래밍에 익숙한 경우

### Spring WebFlux를 선택해야 하는 경우

- **대량의 동시 연결** (채팅, 알림, 실시간 피드)
- **스트리밍 데이터** 처리
- **마이크로서비스 간 통신**이 많은 경우
- **R2DBC** 등 논블로킹 DB 드라이버 사용 가능한 경우

### 주의사항

```java
// WebFlux에서 블로킹 코드 사용 - 안티패턴
@GetMapping("/users/{id}")
public Mono<User> getUser(@PathVariable("id") Long id) {
    // JDBC는 블로킹! Event Loop를 블로킹시킴
    User user = jdbcTemplate.queryForObject(...);  // 절대 하면 안 됨
    return Mono.just(user);
}
```

WebFlux에서 블로킹 코드를 사용하면 **Event Loop가 블로킹**되어 전체 애플리케이션 성능이 급격히 저하됩니다.

**해결책**: 블로킹 코드는 별도 스케줄러에서 실행

```java
@GetMapping("/users/{id}")
public Mono<User> getUser(@PathVariable("id") Long id) {
    return Mono.fromCallable(() -> jdbcTemplate.queryForObject(...))
               .subscribeOn(Schedulers.boundedElastic());  // 별도 스레드 풀
}
```

## 요약

**핵심 포인트**

1. Servlet API는 기본적으로 **블로킹**입니다. `read()`/`write()` 호출 시 스레드가 대기합니다.
2. Servlet 3.1+의 **ReadListener/WriteListener**로 논블로킹 I/O가 가능합니다.
3. **Spring MVC**는 블로킹, **Spring WebFlux**는 논블로킹 모델입니다.
4. WebFlux는 **Tomcat**(Servlet API 경유) 또는 **Netty**(직접 NIO) 위에서 동작합니다.
5. WebFlux에서 **블로킹 코드 사용은 금물**입니다. 불가피하면 별도 스케줄러를 사용하세요.
