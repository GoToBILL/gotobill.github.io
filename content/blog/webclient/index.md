---
title: "Spring WebClient와 논블로킹 I/O"
date: "2025-10-08"
description: "Spring WebClient를 활용한 비동기 HTTP 클라이언트 구현"
category: "개발"
tags: ["Spring", "WebClient", "Reactive", "Netty"]
---

## WebClient란?

| 항목 | RestTemplate | WebClient |
|------|-------------|-----------|
| **방식** | 동기/블로킹 | 비동기/논블로킹 |
| **스레드 모델** | 요청당 스레드 대기 | Netty 이벤트 루프 |
| **동시 처리** | 1000개 요청 = 1000개 스레드 | 1000개 요청 = 소수의 스레드 |
| **상태** | 더 이상 권장하지 않음 | 권장 |

>
> **WebClient는 Netty 기반 논블로킹 HTTP 클라이언트입니다.**
>
> \
> 소수의 이벤트 루프 스레드로 수천 개의 동시 연결을 처리할 수 있습니다.
>
> \
> Spring 5부터 RestTemplate 대신 WebClient 사용을 권장합니다.
>
> \
> Netty의 이벤트 루프 방식이 어떻게 동작하는지 자세히 알고 싶다면 [Netty 이벤트 루프 완전 정복](../netty-eventloop)을 참고하세요.

## Project Reactor와 Reactive Types

### Project Reactor란?

**Project Reactor**는 Pivotal(현 VMware)이 개발한 리액티브 프로그래밍 라이브러리입니다.

Reactive Streams 표준을 구현한 JVM 기반 라이브러리로, 비동기 논블로킹 애플리케이션을 쉽게 작성할 수 있게 해줍니다.

Spring WebFlux는 내부적으로 Project Reactor를 사용합니다. WebClient가 반환하는 Mono와 Flux가 바로 Project Reactor가 제공하는 타입입니다.

**계층 구조:**

```
Reactive Streams (스펙)
    ↓ 구현체
Project Reactor (라이브러리) ← Mono/Flux/Scheduler 제공
    ↓ Spring 통합
Spring WebFlux 모듈 ← Netty + Reactor 조합
    ├─ WebFlux Server: 논블로킹 웹 서버 (@Controller, @RestController)
    └─ WebClient: 논블로킹 HTTP 클라이언트 (RestTemplate 대체)
```

**Spring WebFlux vs WebClient:**

| 구분 | Spring WebFlux | WebClient |
|------|---------------|-----------|
| **역할** | 서버 사이드 프레임워크 | 클라이언트 사이드 HTTP 클라이언트 |
| **용도** | 리액티브 웹 애플리케이션 구축 | 외부 API 호출 |
| **포함 관계** | 모듈 전체 | WebFlux 모듈의 일부 |
| **예시** | `@RestController`로 API 제공 | `webClient.get()`으로 API 호출 |

**@RestController는 MVC와 WebFlux 모두 사용합니다:**

```groovy
// Spring MVC (Tomcat, 블로킹)
implementation 'org.springframework.boot:spring-boot-starter-web'
```

```java
@RestController
public class UserController {
    @GetMapping("/users/{id}")
    public User getUser(@PathVariable Long id) {  // 블로킹 방식
        return userService.getUser(id);  // User 객체 반환
    }
}
```

```groovy
// Spring WebFlux (Netty, 논블로킹)
implementation 'org.springframework.boot:spring-boot-starter-webflux'
```

```java
@RestController
public class UserController {
    @GetMapping("/users/{id}")
    public Mono<User> getUser(@PathVariable Long id) {  // 논블로킹 방식
        return userService.getUser(id);  // Mono<User> 반환
    }
}
```

**차이점:**

| 구분 | Spring MVC | Spring WebFlux |
|------|-----------|---------------|
| **의존성** | spring-boot-starter-web | spring-boot-starter-webflux |
| **서버** | Tomcat (블로킹) | Netty (논블로킹) |
| **애노테이션** | `@RestController` | `@RestController` (동일!) |
| **반환 타입** | `User`, `List<User>` | `Mono<User>`, `Flux<User>` |
| **스레드 모델** | 요청당 스레드 | 이벤트 루프 |

>
> **Project Reactor는 Spring이 만든 것이 아닙니다.**
>
> \
> Pivotal(VMware)이 개발한 독립적인 라이브러리입니다.
>
> \
> Spring WebFlux와 WebClient가 이를 채택하여 사용하는 것입니다.

**가장 흔한 조합: Spring MVC + WebClient**

서버는 Spring MVC를 사용하고, HTTP 클라이언트만 WebClient를 사용하는 경우가 많습니다.

```groovy
// 서버: Spring MVC (Tomcat), 클라이언트: WebClient (Netty)
implementation 'org.springframework.boot:spring-boot-starter-web'      // MVC 서버
implementation 'org.springframework.boot:spring-boot-starter-webflux'  // WebClient 사용
```

```java
@RestController  // MVC 컨트롤러 (Tomcat에서 실행)
@RequiredArgsConstructor
public class UserController {

    private final WebClient webClient;  // WebClient만 사용 (Netty)

    @GetMapping("/users/{id}")
    public Mono<User> getUser(@PathVariable Long id) {
        // 외부 API 호출은 WebClient (논블로킹)
        return webClient.get()
            .uri("/external-api/users/{id}", id)
            .retrieve()
            .bodyToMono(User.class);
    }
}
```

**정리:**

- **서버 선택**: Spring MVC (Tomcat) 또는 Spring WebFlux (Netty)
- **클라이언트 선택**: RestTemplate (블로킹) 또는 WebClient (논블로킹)
- **조합 가능**: MVC 서버 + WebClient 클라이언트 (가장 흔함)

### Mono와 Flux

Project Reactor는 두 가지 핵심 타입을 제공합니다.

**Mono<T>**

0개 또는 1개의 데이터를 비동기로 전달합니다.

단일 결과를 반환하는 API 호출에 사용합니다.

```java
Mono<User> user = webClient.get()
    .uri("/users/1")
    .retrieve()
    .bodyToMono(User.class);  // 단일 User 객체
```

**Flux<T>**

0개 이상의 데이터를 비동기로 전달합니다.

여러 결과를 반환하는 API 호출이나 스트리밍에 사용합니다.

```java
Flux<User> users = webClient.get()
    .uri("/users")
    .retrieve()
    .bodyToFlux(User.class);  // 여러 User 객체
```

### 왜 Mono/Flux를 사용하는가?

**핵심: User 객체를 반환하려면 User 객체가 있어야 합니다.**

```java
// 동기 방식: User를 반환하려면 User 객체를 만들어야 함
public User getUser(Long id) {
    // 1. API 호출
    // 2. 응답 대기... (5초)
    // 3. User 객체 생성
    User user = restTemplate.getForObject("/users/" + id, User.class);
    return user;  // 4. 반환 (5초 후)
}

// 호출
User user = getUser(1L);  // 5초 블로킹
System.out.println(user.getName());
```

User 객체를 만들려면 API 응답이 필요합니다.

API 응답이 올 때까지 스레드는 아무것도 못하고 대기합니다.

**그럼 Mono는 뭐가 다른가?**

Mono는 User 객체가 없어도 만들 수 있습니다.

```java
// 비동기 방식: Mono는 User 없이도 만들 수 있음
public Mono<User> getUser(Long id) {
    return webClient.get()
        .uri("/users/{id}", id)
        .retrieve()
        .bodyToMono(User.class);  // Mono 생성 (User 객체 없음!)
    // 즉시 반환 (HTTP 요청도 아직 안 보냄)
}

// 호출
Mono<User> mono = getUser(1L);  // 0.001초 (즉시 반환)
mono.subscribe(user -> {
    System.out.println(user.getName());  // subscribe 시점에 HTTP 요청
});
```

**Mono = "나중에 User가 올 거야"라는 약속**

User 객체가 실제로 없어도 Mono는 만들 수 있습니다. 그래서 즉시 반환 가능합니다.

**구체적인 예시: 1000명 동시 요청**

**동기 방식의 문제점**

```java
// 1000명이 동시에 요청
for (int i = 1; i <= 1000; i++) {
    User user = getUser(i);  // 각각 5초 블로킹
}

// 필요한 것:
// - 1000개 스레드 (각 요청마다 1개)
// - 각 스레드는 5초 동안 블로킹
// - 메모리: 1000개 × 1MB (스택) = 1GB
```

**비동기 방식의 해결책**

```java
// 1000명이 동시에 요청
for (int i = 1; i <= 1000; i++) {
    Mono<User> mono = getUser(i);  // 즉시 반환 (0.001초)
    mono.subscribe(user -> process(user));
}

// 필요한 것:
// - 4개 Netty 스레드 (CPU 코어 수)
// - 블로킹 없음
// - 메모리: 4개 × 1MB = 4MB
```

Netty 스레드 4개가 1000개 요청을 논블로킹으로 처리합니다.

**핵심 차이**

| 방식 | 반환 | 메서드 완료 시점 | 1000명 요청 시 필요 스레드 |
|------|------|----------------|------------------------|
| **동기** | User 객체 | API 응답 후 (5초 후) | 1000개 |
| **비동기** | Mono (약속) | 즉시 (0.001초) | 4개 |

**그냥 객체를 쓰면 안 되는 이유**

객체를 반환하려면 객체를 만들어야 하고, 객체를 만들려면 API 응답이 필요하고, API 응답을 기다리면 스레드가 블로킹됩니다.

Mono를 쓰면 객체 없이도 "나중에 줄게"라는 약속을 반환할 수 있어서, 스레드가 블로킹되지 않습니다.

### Mono/Flux 실행 방식

Mono와 Flux는 subscribe 전까지 실행되지 않습니다.

```java
// 1. Mono 생성 (아직 HTTP 요청 안 보냄, 레시피만 작성)
Mono<User> mono = webClient.get()
    .uri("/users/1")
    .retrieve()
    .bodyToMono(User.class);

// 2-1. Controller에서 반환 (Spring이 subscribe)
return mono;  // Spring이 자동으로 subscribe → 실제 HTTP 요청 전송

// 2-2. 직접 subscribe (즉시 실행)
mono.subscribe(user -> {
    log.info("User: {}", user.getName());
});  // subscribe 호출 시점에 HTTP 요청 전송
```

>
> **Lazy Execution**
>
> \
> Mono/Flux는 subscribe를 호출하기 전까지 아무것도 실행하지 않습니다.
>
> \
> 이를 **Lazy Execution**(지연 실행)이라고 합니다.
>
> \
> Controller에서 Mono를 반환하면 Spring이 자동으로 subscribe를 호출합니다.

## 의존성 설정

```groovy
implementation 'org.springframework.boot:spring-boot-starter-webflux'
```

## WebClient 설정

>
> **HttpClient vs WebClient**
>
> \
> **HttpClient** (Netty): 네트워크 통신 계층. 
> 
> 소켓 연결, 바이트 읽기/쓰기, 타임아웃 등 네트워크 레벨 처리
>
> \
> **WebClient** (Spring): 애플리케이션 계층. 
> 
> URI 구성, JSON 변환, Reactive 스트림 처리 등 개발자 친화적 기능 제공
>
> \
> **WebClient가 내부적으로 HttpClient를 사용합니다.** HttpClient가 실제 네트워크 통신을 담당하고, WebClient가 이를 편리하게 사용할 수 있도록 감싸는 구조입니다.

### 기본 설정

```java
@Configuration
public class WebClientConfig {

    @Value("${api.base-url}")
    private String baseUrl;

    @Bean
    public WebClient webClient() {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000)
                .responseTimeout(Duration.ofSeconds(30))
                .doOnConnected(conn ->
                        conn.addHandlerLast(new ReadTimeoutHandler(30, TimeUnit.SECONDS))
                                .addHandlerLast(new WriteTimeoutHandler(30, TimeUnit.SECONDS))
                );

        ExchangeStrategies exchangeStrategies = ExchangeStrategies.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                .build();

        return WebClient.builder()
                .baseUrl(baseUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .exchangeStrategies(exchangeStrategies)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}
```

### 주요 설정 항목

**타임아웃 종류**

`CONNECT_TIMEOUT_MILLIS`
서버와 TCP 연결을 맺을 때까지의 타임아웃입니다.

`responseTimeout`
요청을 보낸 후 전체 응답을 받을 때까지의 타임아웃입니다.

`ReadTimeoutHandler`
서버로부터 응답 데이터를 읽는 중 타임아웃입니다. 데이터를 읽다가 30초 동안 아무 데이터도 오지 않으면 실패합니다.

`WriteTimeoutHandler`
서버로 요청 데이터를 쓰는 중 타임아웃입니다. 데이터를 보내다가 30초 동안 전송이 안 되면 실패합니다.

**메모리 버퍼**

`maxInMemorySize`
메모리 버퍼 크기 제한을 설정합니다. 기본값은 256KB입니다.

>
> **대용량 파일 처리 시 주의**
>
> \
> 이미지나 대용량 파일을 처리할 때는 반드시 maxInMemorySize를 적절히 설정해야 합니다.
>
> \
> 그렇지 않으면 **DataBufferLimitException**이 발생합니다.

**WebClient 빌더**

`baseUrl`
모든 요청에 공통으로 사용할 기본 URL을 설정합니다.

`clientConnector`
HTTP 클라이언트 커넥터를 설정합니다. 

**HttpClient**는 Netty의 설정 객체이고, **ReactorClientHttpConnector**는 이 설정을 Spring WebFlux가 사용할 수 있도록 감싸는 어댑터입니다.

`exchangeStrategies`
메시지 인코딩/디코딩 전략을 설정합니다.

`defaultHeader`
모든 요청에 기본으로 포함될 헤더를 설정합니다.

## 기본 사용법

### 메서드 체이닝 구조

```java
webClient
    .post()                          // HTTP 메서드 선택
    .uri("/path")                    // 요청 URI 설정
    .bodyValue(requestBody)          // 요청 본문 설정
    .retrieve()                      // 응답 가져오기
    .bodyToMono(ResponseType.class)  // 응답을 Mono로 변환
    .map(this::transform)            // 데이터 변환
    .doOnNext(this::logSuccess)      // 성공 시 로깅
    .doOnError(this::logError);      // 에러 시 로깅

private ResponseType transform(ResponseType response) {
    return response;
}

private void logSuccess(ResponseType response) {
    log.info("API 호출 성공: {}", response);
}

private void logError(Throwable error) {
    log.error("API 호출 실패: {}", error.getMessage());
}
```

## Reactive 스트림 처리

### Controller와 Service 예시

**시나리오:** 우리 서버가 외부 User API를 호출하여 사용자 정보를 가져옵니다.

```
Client → 우리 서버 (Controller) → Service → WebClient → 외부 User API 서버
```

```java
// 우리 서버의 Controller
@RestController
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/api/users/{id}")  // 클라이언트가 우리 서버에 요청
    public Mono<User> getUser(@PathVariable Long id) {
        return userService.getUser(id);  // Mono<User> 즉시 반환
    }
}

// 우리 서버의 Service (외부 API 호출)
@Service
@RequiredArgsConstructor
public class UserService {

    private final WebClient webClient;  // 외부 API 호출용

    public Mono<UserDTO> getUser(Long userId) {
        return webClient.get()
                .uri("/users/{id}", userId)  // 외부 User API 서버로 요청
                .retrieve()
                .bodyToMono(User.class)
                .doOnNext(user -> log.info("외부 API에서 사용자 조회 성공: {}", user.getName()))
                .map(user -> new UserDTO(user.getId(), user.getName()))
                .subscribe(
                    successData -> {
                        log.info("성공: {}", successData);
                        handleSuccess(successData);  // 성공 시 처리 로직
                    },
                    error -> {
                        log.error("실패", error);
                        handleError(error);  // 에러 시 처리 로직
                    },
                    () -> {
                        log.info("완료");  // 완료 시 처리 로직 (선택)
                    }
                );
    }

    private void handleSuccess(UserDTO userDTO) {
        // 사용자 정보를 캐시에 저장하거나 이벤트 발행
    }

    private void handleError(Throwable error) {
        // 에러 알림 전송 또는 폴백 처리
    }
}
```

### 비동기 처리 흐름 (Netty 이벤트 루프)

```
[메인 스레드 (http-nio-exec-1)]
    1. Client 요청 수신
        ↓
    2. webClient.get().uri("/users/1")
        .retrieve()
        .bodyToMono(User.class)
        .doOnNext(...)
        .map(...)  호출
        ↓
    3. Mono<User> 객체만 생성 (빈 깡통, 실제 HTTP 요청은 아직 안 보냄)
        ↓
    4. Controller 메서드가 Mono<User> 반환 (빈 깡통만, Client는 아직 응답 못 받음)
        ↓
    5. 메인 스레드 해제 (다른 요청 처리 가능)

    6. Spring이 Mono를 subscribe() 호출하고 대기 ← 실제 실행 시작!
        ↓
══════════════════════════════  스레드 전환 ══════════════════════════════ 

[Netty 이벤트 루프 스레드 (reactor-http-nio-2)]
    7. 실제 HTTP 요청 전송 (외부 API로)
        ↓
    8. 응답 대기 (블로킹 없음, 이벤트 루프는 다른 작업 처리)
        ↓
    9. 응답 수신 (JSON 데이터)
        ↓
    10. bodyToMono: JSON → User 객체 변환
        ↓
    11. doOnNext: 변환된 User로 로깅/상태 업데이트 (데이터는 변경 안 함)
        ↓
    12. map: User를 다른 형태로 변환 (예: UserDTO)
        ↓
    13. Mono에 실제 데이터 채움 (빈 깡통에 피자 담기)
        ↓
    14. Client에게 최종 응답 전달 ← Client는 실제 데이터를 1번만 받음!
```

**데이터 흐름 요약:**
```
응답 JSON
    ↓
bodyToMono → User 객체
    ↓
doOnNext → User (그대로 통과, 로깅만)
    ↓
map → UserDTO (변환)
    ↓
subscribe 람다 → UserDTO를 받아서 최종 처리
```

>
> **논블로킹의 핵심**
>
> \
> 메인 스레드는 블로킹되지 않고 즉시 반환됩니다.
>
> \
> Netty 이벤트 루프 스레드가 비동기로 처리합니다.
>
> \
> **doOnNext는 데이터를 변경하지 않고**, **map은 데이터를 변환**하며, **subscribe 람다는 최종 변환된 데이터를 받아서 처리**합니다.

## URI 구성 방법

### Path Variable 사용

```java
webClient
    .post()
    .uri("/users/{id}/posts/{postId}", userId, postId)
    .retrieve()
    .bodyToMono(Post.class);
```

**결과 URI:** `/users/123/posts/456` (userId=123, postId=456일 때)

### Query Parameter 사용

```java
webClient
    .get()
    .uri(uriBuilder -> uriBuilder
        .path("/users")
        .queryParam("name", "John")
        .queryParam("age", 30)
        .build())
    .retrieve()
    .bodyToFlux(User.class);
```

**결과 URI:** `/users?name=John&age=30`

### 동적 파라미터

```java
Map<String, Object> params = Map.of(
    "status", "ACTIVE",
    "limit", 100
);

webClient
    .get()
    .uri(uriBuilder -> uriBuilder
        .path("/items")
        .queryParam("status", "{status}")
        .queryParam("limit", "{limit}")
        .build(params))
    .retrieve()
    .bodyToFlux(Item.class);
```

**결과 URI:** `/items?status=ACTIVE&limit=100`

## 응답 처리

### retrieve() 사용

간단한 응답 처리에 적합합니다.

```java
Mono<User> user = webClient
    .get()
    .uri("/users/{id}", userId)
    .retrieve()
    .bodyToMono(User.class);
```

### exchangeToMono() 사용

상태 코드, 헤더 등 세밀한 제어가 필요할 때 사용합니다.

```java
Mono<User> user = webClient
    .get()
    .uri("/users/{id}", userId)
    .exchangeToMono(response -> {
        if (response.statusCode().is2xxSuccessful()) {
            return response.bodyToMono(User.class);
        } else if (response.statusCode().is4xxClientError()) {
            return response.bodyToMono(String.class)
                .flatMap(errorBody -> Mono.error(
                    new CustomException("Client error: " + errorBody)
                ));
        } else {
            return response.createException()
                .flatMap(Mono::error);
        }
    });
```

>
> **exchangeToMono() 사용 시 주의**
>
> \
> 반드시 응답 본문을 소비해야 합니다.
> 그렇지 않으면 메모리 누수가 발생할 수 있습니다.
> 
> \
> 본문 소비 방법 **3가지**:
> ``` java
> response.bodyToMono(...) - 직접 읽기
> response.createException() - 자동으로 읽어서 예외에 포함
> response.releaseBody() - 본문 버리기
> ```

## 에러 핸들링

### onStatus로 상태 코드별 처리

```java
webClient
    .get()
    .uri("/users/{id}", userId)
    .retrieve()
    .onStatus(HttpStatusCode::is4xxClientError, response -> {
        return response.bodyToMono(String.class)
            .flatMap(errorBody -> Mono.error(
                new CustomException("Client error: " + errorBody)
            ));
    })
    .onStatus(HttpStatusCode::is5xxServerError, response -> {
        return response.createException()
            .flatMap(Mono::error);
    })
    .bodyToMono(User.class);
```

### doOnError로 에러 로깅

```java
webClient.get()
    .uri("/api")
    .retrieve()
    .bodyToMono(Data.class)
    .doOnError(error ->
        log.error("API 호출 실패: {}", error.getMessage())
    )
    .onErrorResume(error -> {
        return Mono.just(Data.defaultValue());
    });
```

## 주요 연산자

### doOnNext: 사이드 이펙트 처리

데이터를 변경하지 않고 로깅, 상태 업데이트 등을 수행합니다.

```java
webClient.get()
    .uri("/data")
    .retrieve()
    .bodyToMono(Data.class)
    .doOnNext(data -> {
        log.info("데이터 수신: {}", data);
        updateProgress(50);
    })
    .map(this::transform);
```

#### map: 즉시 값으로 변환

일반 값을 반환할 때 사용합니다.

```java
webClient.get()
    .uri("/users")
    .retrieve()
    .bodyToFlux(User.class)  // Flux<User>
    .map(user -> user.getName())  // User → String
    .collectList();  // Mono<List<String>>
```

**결과:** `["John", "Jane", "Bob"]`

**동작:**
```
User(id=1, name="John") → "John"
User(id=2, name="Jane") → "Jane"
User(id=3, name="Bob") → "Bob"
```

### flatMap: Mono/Flux로 변환

변환 과정에서 추가 비동기 작업(API 호출, DB 조회 등)이 필요할 때 사용합니다.

```java
webClient.get()
    .uri("/users")
    .retrieve()
    .bodyToFlux(User.class)  // Flux<User>
    .flatMap(user ->
        webClient.get()
            .uri("/users/{id}/posts", user.getId())  // 각 User마다 API 호출
            .retrieve()
            .bodyToFlux(Post.class)  // User → Flux<Post>
    )
    .collectList();  // Mono<List<Post>>
```

**결과:** `[Post(user1의 글1), Post(user1의 글2), Post(user2의 글1), ...]`

**동작:**
```
User(1) → API 호출 /users/1/posts → [Post1, Post2]
User(2) → API 호출 /users/2/posts → [Post3]
User(3) → API 호출 /users/3/posts → [Post4, Post5]

최종: [Post1, Post2, Post3, Post4, Post5] (평탄화됨)
```

**왜 flatMap인가?**

map을 쓰면 중첩됩니다:
```java
.map(user -> webClient.get()...bodyToFlux(Post.class))
// 결과: Flux<Flux<Post>>  ← 이중 Flux!

.flatMap(user -> webClient.get()...bodyToFlux(Post.class))
// 결과: Flux<Post>  ← 평탄화!
```

### filter: 필터링

```java
webClient.get()
    .uri("/users")
    .retrieve()
    .bodyToFlux(User.class)
    .filter(user -> user.getAge() >= 18)
    .collectList();
```

### collectList: Flux를 List로 변환

```java
Mono<List<User>> users = webClient.get()
    .uri("/users")
    .retrieve()
    .bodyToFlux(User.class)
    .collectList();
```

## 타임아웃 설정

### 요청별 타임아웃

```java
webClient.get()
    .uri("/slow-api")
    .retrieve()
    .bodyToMono(Response.class)
    .timeout(Duration.ofSeconds(10));
```

## 실전 패턴

### Retry 설정

```java
webClient.get()
    .uri("/api/data")
    .retrieve()
    .bodyToMono(Data.class)
    .retryWhen(Retry.backoff(3, Duration.ofSeconds(2))
        .maxBackoff(Duration.ofSeconds(10))
        .filter(throwable -> throwable instanceof TimeoutException)
    );
```

**설정 설명:**

- `backoff(3, Duration.ofSeconds(2))`: 최대 3번 재시도, 초기 대기 2초
- `maxBackoff(Duration.ofSeconds(10))`: 최대 대기 시간 10초
- `filter(...)`: TimeoutException일 때만 재시도

**재시도 간격 (Exponential Backoff):**

대기 시간이 2배씩 증가합니다:

```
1차 실패 → 2초 대기 (2 × 2^0)
2차 실패 → 4초 대기 (2 × 2^1)
3차 실패 → 8초 대기 (2 × 2^2)
4차 실패 → 최종 실패
```

**왜 지수적으로 증가하나?**

서버가 과부하 상태일 때 계속 빠르게 재시도하면 부담이 가중됩니다. 대기 시간을 점진적으로 늘려서 서버 회복 시간을 확보합니다.

### 폴백 처리

API 호출 실패 시 기본값을 반환하여 애플리케이션이 중단되지 않도록 합니다.

```java
webClient.get()
    .uri("/users/{id}", 999)
    .retrieve()
    .bodyToMono(User.class)
    .onErrorResume(error -> {
        log.error("사용자 조회 실패, 익명 사용자 반환", error);
        return Mono.just(new User(0L, "익명"));
    });
```

**동작:**
```
정상: /users/999 → User(999, "John") 반환
실패: /users/999 → 404 에러 → User(0, "익명") 반환 (에러 대신 기본값)
```

### 병렬 요청 처리

여러 API를 동시에 호출하고 결과를 합칩니다.

```java
Mono<User> userMono = webClient.get().uri("/users/{id}", id)
    .retrieve().bodyToMono(User.class);

Mono<List<Post>> postsMono = webClient.get().uri("/users/{id}/posts", id)
    .retrieve().bodyToFlux(Post.class).collectList();

Mono.zip(userMono, postsMono)
    .map(tuple -> {
        User user = tuple.getT1();  // 첫 번째 결과
        List<Post> posts = tuple.getT2();  // 두 번째 결과
        return new UserWithPosts(user, posts);
    });
```

**실행 흐름:**
```
userMono 요청 전송 → 논블로킹 대기
postsMono 요청 전송 → 논블로킹 대기
  ↓
이벤트 루프는 다른 작업 처리 (블로킹 없음!)
  ↓
User 응답 도착 → userMono에 채움
Post 응답 도착 → postsMono에 채움
  ↓
두 개 모두 준비되면 → zip의 map 실행
```

## 주의사항

### subscribe() 사용 구분

>
> **핵심 원칙: Mono/Flux는 "레시피"이고, subscribe()는 "실행 버튼"입니다.**
>
> \
> Mono/Flux는 subscribe 전까지 아무것도 실행하지 않습니다. (Lazy Execution)
>
> \
> Mono/Flux를 반환하면 받는 쪽에서 subscribe하고, void 반환이면 직접 subscribe해야 실행됩니다.

**실행 흐름:**

```
1. Mono 생성 (레시피 작성)
   Mono<User> mono = webClient.get()...bodyToMono(User.class)
   → HTTP 요청 아직 안 보냄!

2-1. Mono 반환 (레시피 전달)
   return mono;
   → 받는 쪽(Spring/호출자)이 subscribe → 실행

2-2. void 반환 (레시피 바로 실행)
   mono.subscribe();
   → 직접 subscribe → 실행
```

**Controller - Mono 반환**

```java
@GetMapping("/users")
public Mono<User> getUser() {
    return webClient.get()
        .uri("/users/1")
        .retrieve()
        .bodyToMono(User.class);
    // Spring이 subscribe → Client에게 응답 전달
}
```

**Controller - void 반환**

```java
@PostMapping("/notifications")
public void sendNotification() {
    webClient.post()
        .uri("/notifications")
        .bodyValue(data)
        .retrieve()
        .bodyToMono(Void.class)
        .subscribe();
    // void니까 직접 subscribe → 알림만 보내고 응답은 안 줌
}
```

**Service - Mono 반환**

```java
public Mono<User> getUser(Long id) {
    return webClient.get()
        .uri("/users/{id}", id)
        .retrieve()
        .bodyToMono(User.class);
    // Controller가 받아서 처리
}
```

**Service - void 반환**

```java
public void processAsync(Long id) {
    webClient.post()
        .uri("/process")
        .retrieve()
        .bodyToMono(Void.class)
        .subscribe();
    // 결과 필요 없으니 직접 subscribe
}
```

**잘못된 예 - Mono 반환인데 subscribe까지**

```java
@GetMapping("/users")
public Mono<User> getUser() {
    Mono<User> mono = webClient.get()...;
    mono.subscribe();  // 1차 실행 (결과는 버려짐)
    return mono;       // Spring이 2차 실행 (중복!)
}
```

### block()은 개발/테스트 용도로만

>
> **프로덕션 코드에서 block() 사용 금지**
>
> \
> block()을 사용하면 논블로킹의 이점을 모두 잃습니다.
>
> \
> 테스트 코드에서만 허용됩니다.

**프로덕션**(잘못됨)

```java
public User getUser(Long id) {
    return webClient.get()
        .uri("/users/{id}", id)
        .retrieve()
        .bodyToMono(User.class)
        .block();
}
```

**프로덕션**(올바름)

```java
public Mono<User> getUser(Long id) {
    return webClient.get()
        .uri("/users/{id}", id)
        .retrieve()
        .bodyToMono(User.class);
}
```

**테스트**(허용)

```java
@Test
void testGetUser() {
    User user = webClient.get()
        .uri("/users/{id}", 1)
        .retrieve()
        .bodyToMono(User.class)
        .block();

    assertThat(user.getName()).isEqualTo("John");
}
```

### 트랜잭션 경계 주의

>
> **subscribe() 내부는 별도 스레드에서 실행됩니다.**
>
> \
> 외부 트랜잭션과 분리되므로, 트랜잭션이 필요한 경우 별도 서비스로 분리해야 합니다.

```java
@Transactional
public String processData(...) {
    mono.subscribe(
        data -> {
            separateTransactionalService.saveData(data);
        }
    );
    return requestId;
}
```

### 스레드 로깅으로 비동기 흐름 확인

```java
log.info("Thread [{}]: API 호출 시작", Thread.currentThread().getName());

mono.doOnNext(data -> {
    log.info("Thread [{}]: 응답 수신", Thread.currentThread().getName());
});
```

**출력 예시**

```
Thread [http-nio-8080-exec-1]: API 호출 시작
Thread [reactor-http-nio-2]: 응답 수신
```

## 실전 예제: 메뉴 추출 API 스레드 분석

실제 운영 중인 메뉴 추출 API의 로그를 통해 WebClient의 비동기 처리를 분석합니다.

### 핵심 요약

**메인 스레드**(http-nio-8080-exec-5): Mono 레시피 구성 및 subscribe() 호출 → 즉시 반환 (190ms)

**Netty 스레드**(reactor-http-nio-2): 실제 HTTP 요청, 응답 처리, DB 저장 (5.8초)

### 스레드 전환 시점

**Phase 1: 메인 스레드**(http-nio-8080-exec-5)

```java
@PostMapping("/menu/extract")
public ApiResponse<MenuExtractionStartResponse> startMenuExtraction(...) {
    String requestId = extractionService.startMenuExtraction(userId, storeId, image);
    return ApiResponse.success(new MenuExtractionStartResponse(requestId));
    // 190ms만에 응답 반환
}
```

```java
public String startMenuExtraction(Long userId, Long storeId, MultipartFile image) {
    // 1. Progress 초기화 및 DB 저장 (동기)
    String requestId = UUID.randomUUID().toString();
    progressRepository.saveAndFlush(progress);

    // 2. WebClient Mono 생성 (레시피만 만듦)
    geminiService.extractTextFromImage(imageBytes, mimeType)
        .doOnNext(...)
        .map(this::parseExtractedText)
        .subscribe(...); // 실행 예약만 하고 즉시 다음 라인으로

    log.info("Thread [{}]: 즉시 반환 - Request ID: {}",requestId)
    return requestId; // 즉시 반환 (5초를 기다리지 않음!)
}
```

**로그:**
```
19:04:04.039 [http-nio-8080-exec-5] 메뉴 추출 시작
19:04:04.121 [http-nio-8080-exec-5] Gemini API 호출 시작
19:04:04.229 [http-nio-8080-exec-5] 즉시 반환 - Request ID: dcf4cb95-...
```

**Phase 2: Netty 스레드**(reactor-http-nio-2)

Netty 스레드가 비동기로 처리 시작

```java
public Mono<String> extractTextFromImage(byte[] imageBytes, String mimeType) {
    log.info("Thread [{}]: Gemini API 호출 시작 - 이미지 크기: {} bytes",
            Thread.currentThread().getName(), imageBytes.length);

    String base64Image = Base64.getEncoder().encodeToString(imageBytes);
    Map<String, Object> requestBody = buildGeminiRequest(base64Image, mimeType);

    return webClient.post()
            .uri("/models/{model}:generateContent?key={key}", modelName, apiKey)
            .bodyValue(requestBody)
            .retrieve()
            .bodyToMono(Map.class)
            .doOnNext(response ->
                log.info("Thread [{}]: Gemini API 응답 수신", Thread.currentThread().getName())
            )
            .map(this::extractTextFromResponse)
            .doOnError(error ->
                log.error("Thread [{}]: Gemini API 호출 실패 - {}",
                        Thread.currentThread().getName(), error.getMessage(), error)
            );
}

```

```java
geminiService.extractTextFromImage(imageBytes, mimeType)
    .doOnNext(text -> {
        log.info("텍스트 파싱 시작"); // reactor-http-nio-2
        progressRepository.save(progress); // Netty 스레드에서 DB 쿼리
    })
    .map(this::parseExtractedText) // reactor-http-nio-2
    .subscribe(
        items -> {
            log.info("DB 저장 요청 - {} 개 아이템", items.size());
            menuPersistenceService.saveMenuItemsWithProgress(storeId, items, requestId);
        },
        error -> log.error("메뉴 추출 실패")
    );
```

**로그:**
```
19:04:09.976 [reactor-http-nio-2] Gemini API 응답 수신
19:04:09.977 [reactor-http-nio-2] 텍스트 추출 성공
19:04:09.977 [reactor-http-nio-2] 텍스트 파싱 시작
19:04:09.981 [reactor-http-nio-2] DB 저장 요청 - 14 개 아이템
19:04:09.983 [reactor-http-nio-2] DB 트랜잭션 시작
19:04:10.024 [reactor-http-nio-2] DB 트랜잭션 완료 - 14개 아이템 추가
```

### 전체 흐름 다이어그램

```
[Client 요청]
    ↓
[http-nio-8080-exec-5] ← 메인 스레드
    ↓
    1. 컨트롤러 진입
    2. Progress 초기화 (DB 저장)
    3. WebClient Mono 생성 (레시피만)
    4. subscribe() 호출 (실행 예약)
    5. requestId 즉시 반환 ← 190ms
    ↓
[Client 응답 완료]

━━━━━━━━━━━━━━━━━━━━━━━━━

[reactor-http-nio-2] ← Netty 스레드
    ↓
    1. HTTP 요청 전송
    2. Gemini API 응답 수신
    3. JSON 파싱
    4. DTO 변환
    5. DB 저장 (14개 INSERT)
    6. Progress 완료 처리
    ↓
[완료]
```

### 핵심 포인트

**1. subscribe()의 두 얼굴**

```java
geminiService.extractTextFromImage(...)
    .subscribe(...); // 호출은 메인 스레드, 실행은 Netty 스레드

log.info("즉시 반환"); // subscribe() 후 바로 실행됨
```

- **subscribe() 호출**: http-nio-8080-exec-5
- **subscribe 내부 콜백**: reactor-http-nio-2

**2. 메인 스레드는 블로킹 안 됨**

시간 증거:
- 메인 스레드 종료: 19:04:04.229
- Netty 응답 수신: 19:04:09.976
- **차이: 5.7초** ← 메인 스레드는 기다리지 않았음!

**3. Netty 스레드에서 DB 작업**

```
19:04:09.981 [reactor-http-nio-2] DB 저장 요청
Hibernate: insert into food_items ...
```

모든 DB 쿼리가 Netty 스레드에서 실행됩니다.

>
> **트랜잭션 주의**
>
> \
> Netty 스레드는 메인 스레드와 **다른 스레드**입니다.
>
> \
> `@Transactional`은 스레드 로컬 방식으로 동작하므로, 메인 스레드의 트랜잭션은 Netty 스레드에 적용되지 않습니다.
>
> \
> subscribe() 내부에서 DB 작업이 필요하면 **별도 트랜잭션 서비스**를 호출해야 합니다.

**올바른 예:**
```java
public String startExtraction(...) {
    progressRepository.save(progress);

    webClient.get()...subscribe(items -> {
        persistenceService.saveMenuItems(items);  // 새 트랜잭션 시작
    });

    return requestId;
}

@Service
public class PersistenceService {
    @Transactional  // Netty 스레드에서 새 트랜잭션 시작
    public void saveMenuItems(List<MenuItem> items) {
        menuRepository.saveAll(items);
    }
}
```

**4. 실행 시간 비교**

동기 방식 (RestTemplate):
```
사용자 대기: 5.8초
```

비동기 방식 (WebClient):
```
사용자 대기: 190ms
백그라운드 처리: 5.8초
```

### 결론

**Mono는 레시피**

```java
Mono<String> recipe = webClient.get()...  // 실행 안 됨 (메인 스레드)
recipe.subscribe();                       // 실행 예약 (메인 스레드)
// 실제 실행은 Netty 스레드에서
```

**스레드 전환 자동**

개발자가 스레드를 명시적으로 관리할 필요 없음. WebClient가 알아서 Netty 스레드로 전환합니다.
**논블로킹의 이점**

메인 스레드는 즉시 반환하고, Netty 스레드가 백그라운드에서 처리. 사용자는 5초가 아닌 190ms만 대기합니다.

