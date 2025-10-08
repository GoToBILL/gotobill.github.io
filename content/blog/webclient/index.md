---
title: "WebClient 완전 정복 가이드"
date: "2025-10-08"
description: "Spring WebClient를 활용한 비동기 HTTP 클라이언트 구현"
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

**프로덕션 (잘못됨)**

```java
public User getUser(Long id) {
    return webClient.get()
        .uri("/users/{id}", id)
        .retrieve()
        .bodyToMono(User.class)
        .block();
}
```

**프로덕션 (올바름)**

```java
public Mono<User> getUser(Long id) {
    return webClient.get()
        .uri("/users/{id}", id)
        .retrieve()
        .bodyToMono(User.class);
}
```

**테스트 (허용)**

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