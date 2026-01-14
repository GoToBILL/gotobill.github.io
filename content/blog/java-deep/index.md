---
title: "Java 심화: Exception, Java 8, Immutable"
date: "2025-09-25"
description: "Checked/Unchecked Exception, Java 8 기능, Mutable/Immutable 객체를 공식 문서 기반으로 정리합니다."
category: "개발"
tags: ["Java", "Exception", "Java8", "Immutable"]
---

## Checked vs Unchecked Exception

### Exception 계층 구조

```
Throwable
├── Error (Unchecked)
│   ├── OutOfMemoryError
│   ├── StackOverflowError
│   └── ...
└── Exception
    ├── RuntimeException (Unchecked)
    │   ├── NullPointerException
    │   ├── IllegalArgumentException
    │   └── ...
    └── Checked Exceptions
        ├── IOException
        ├── SQLException
        └── ...
```

### Checked vs Unchecked (JLS 11.1.1)

| 구분 | Checked Exception | Unchecked Exception |
|------|------------------|---------------------|
| 상속 | Exception (RuntimeException 제외) | RuntimeException, Error |
| 컴파일 체크 | 반드시 처리 (try-catch 또는 throws) | 처리 강제 안 함 |
| 복구 가능성 | 복구 가능한 상황 | 프로그래밍 오류 |
| 예시 | IOException, SQLException | NullPointerException, IllegalArgumentException |

**Checked Exception 예시**

```java
// 반드시 처리해야 함
public void readFile(String path) throws IOException {
    FileInputStream fis = new FileInputStream(path);
    // ...
}

// 또는
public void readFile(String path) {
    try {
        FileInputStream fis = new FileInputStream(path);
    } catch (IOException e) {
        // 예외 처리
    }
}
```

**Unchecked Exception 예시**

```java
// 처리 강제 안 함 (하지만 방어 코드 권장)
public void process(String str) {
    if (str == null) {
        throw new IllegalArgumentException("str cannot be null");
    }
    System.out.println(str.length());
}
```

### 왜 Checked Exception이 필요한가?

Oracle 공식 문서의 설계 의도:

1. **메서드 계약(Contract)의 일부**: 메서드가 어떤 예외 상황을 발생시킬 수 있는지 명시
2. **과거 방식의 문제 해결**: -1, null 반환 방식은 에러 무시를 쉽게 만듦
3. **복구 가능성 기준**: 호출자가 합리적으로 복구할 수 있는 상황

**RuntimeException이 Unchecked인 이유** (JLS):

> RuntimeException은 모든 곳에서 발생할 수 있고, 수가 많아서 모든 메서드에 선언하면 프로그램 명확성이 크게 저하된다.

---

### Spring 트랜잭션 롤백 정책

**기본 규칙**:
- **RuntimeException, Error**: 롤백
- **Checked Exception**: 커밋 (롤백 안 함)

```java
@Transactional
public void process() throws IOException {
    // 비즈니스 로직
    repository.save(entity);
    throw new IOException();  // 롤백 안 됨!
}

@Transactional
public void process() {
    repository.save(entity);
    throw new RuntimeException();  // 롤백됨
}
```

**왜 이런 정책인가?**

Spring은 EJB 규약을 따른다. Checked Exception은 **비즈니스적으로 의미 있는 예외 상황으로, 호출자가 처리할 수 있다고 가정한다.** 반면 Unchecked Exception은 복구 불가능한 시스템 오류(버그)로 본다.

Spring이 Checked를 자동 롤백 안 하는 이유는 **이건 개발자가 의도적으로 던진 거니까, 롤백 여부도 개발자가 결정해라**라는 철학이다.

**커스터마이징**

```java
// Checked Exception도 롤백
@Transactional(rollbackFor = IOException.class)
public void process() throws IOException {
    // ...
}

// RuntimeException도 롤백 안 함
@Transactional(noRollbackFor = IllegalArgumentException.class)
public void process() {
    // ...
}
```

**Spring Data JPA의 예외 변환**

Spring Data JPA는 JPA/JDBC 예외를 자동으로 `DataAccessException`(RuntimeException)으로 변환한다.

| 구분 | @Repository 필요? | 예외 변환 |
|------|------------------|----------|
| 일반 @Repository 클래스 | 필수 | AOP 프록시로 변환 |
| Spring Data JPA Repository | 자동 | 인터페이스 프록시에서 자동 |

```java
// Spring Data JPA (자동)
interface UserRepository extends JpaRepository<User, Long> { }

// 일반 JPA (명시적)
@Repository  // 이거 있어야 예외 변환
class UserRepositoryImpl {
    @PersistenceContext EntityManager em;
}
```

변환 메커니즘은 `PersistenceExceptionTranslationPostProcessor`가 담당한다. 

Spring Data JPA Repository 인터페이스는 `SimpleJpaRepository`를 통해 내부적으로 예외 변환이 되어 있다.

**IOException은 왜 변환 안 하는가?**

IOException은 **영속성 계층과 무관**하다. 파일 I/O는 데이터베이스 작업이 아니므로 Spring Data의 예외 변환 범위에 포함되지 않는다. 

파일 작업에서 트랜잭션 롤백이 필요하면 `rollbackFor`로 명시해야 한다.

```java
@Transactional(rollbackFor = IOException.class)
public void saveWithFile(Entity entity, MultipartFile file) throws IOException {
    repository.save(entity);
    fileService.upload(file);  // IOException 발생 시 entity도 롤백
}
```

---

### try-with-resources (JLS 14.20.3)

파일, DB 연결 같은 리소스는 사용 후 반드시 `close()`를 호출해야 합니다. 

Java 7 이전에는 이렇게 했습니다:

```java
// Java 7 이전: finally에서 직접 close()
FileInputStream fis = null;
try {
    fis = new FileInputStream("file.txt");
    // 리소스 사용
} catch (IOException e) {
    // 예외 처리
} finally {
    if (fis != null) {
        try {
            fis.close();  // close()도 예외를 던질 수 있음
        } catch (IOException e) {
            // close 예외 처리... 복잡해집니다
        }
    }
}
```

문제점:
- `close()` 호출을 잊기 쉬움
- `close()` 자체도 예외를 던질 수 있어서 중첩 try-catch 필요
- 코드가 장황해짐

**try-with-resources**: try () 괄호 안에 리소스를 선언하면 블록이 끝날 때 자동으로 `close()`가 호출됩니다. 

단, `AutoCloseable` 인터페이스를 구현한 객체만 사용 가능합니다.

```java
public interface AutoCloseable {
    void close() throws Exception;
}
```

`FileInputStream`, `BufferedReader`, `Connection` 등 I/O 관련 클래스들이 이를 구현하고 있습니다.

```java
// Java 7+: 자동으로 close() 호출
try (FileInputStream fis = new FileInputStream("file.txt");
     BufferedReader br = new BufferedReader(new InputStreamReader(fis))) {
    // 리소스 사용
} catch (IOException e) {
    // 예외 처리
}
// fis, br 자동으로 close() 호출
```

**닫힘 순서**: 선언의 **역순** (LIFO)

위 예시에서 `br.close()` → `fis.close()` 순서로 닫힌다.

**Suppressed Exceptions**

try 블록에서 예외가 발생했는데, `close()`를 호출할 때도 예외가 발생하면 어떻게 될까요?

```java
try (MyResource r = new MyResource()) {
    throw new RuntimeException("try에서 발생");  // 1. 먼저 발생
}  // 2. 블록 끝나서 r.close() 호출 → 여기서도 예외 발생하면?
```

예외가 2개인데 하나만 던질 수 있습니다. Java는 try 블록 예외를 메인으로 던지고, close() 예외는 뒤에 붙여둡니다.

```java
catch (Exception e) {
    System.out.println(e.getMessage());  // "try에서 발생" (메인 예외)

    // close()에서 발생한 예외는 getSuppressed()로 꺼냄
    for (Throwable t : e.getSuppressed()) {
        System.out.println(t.getMessage());  // "close에서 발생"
    }
}
```

try 블록 예외가 메인인 이유는, 그게 실제 비즈니스 로직에서 발생한 진짜 문제이고, close() 예외는 정리 작업 중 발생한 부수적인 문제이기 때문입니다.

**Java 9 개선**

Java 9 이전에는 try () 괄호 안에서 리소스를 선언과 동시에 초기화해야 했습니다.

```java
// Java 7~8: 괄호 안에서 무조건 선언해야 함
try (FileInputStream fis = new FileInputStream("file.txt")) {
    // ...
}
```

Java 9부터는 이미 선언된 변수도 사용할 수 있습니다. 

단, 그 변수가 effectively final(값이 변경되지 않는 변수)이어야 합니다.

```java
// Java 9+: 밖에서 선언하고, 괄호 안에는 변수명만
FileInputStream fis = new FileInputStream("file.txt");
try (fis) {  // 변수명만 넣어도 됨
    // ...
}
```

이게 유용한 경우는, 리소스를 조건에 따라 다르게 생성하거나, 생성 로직이 복잡할 때입니다.

```java
// 조건에 따라 다른 스트림 생성
InputStream is;
if (compressed) {
    is = new GZIPInputStream(new FileInputStream(file));
} else {
    is = new FileInputStream(file);
}
try (is) {  // Java 9+에서만 가능
    // ...
}
```

---

## Java 8 주요 기능

### 람다 표현식

**함수형 인터페이스**: 추상 메서드가 **정확히 하나**인 인터페이스입니다.

`@FunctionalInterface`를 붙이면 컴파일러가 검증해줍니다.

```java
@FunctionalInterface
public interface Calculator {
    int calculate(int a, int b);  // 추상 메서드는 하나만 가능
    // default, static 메서드는 여러 개 가능
}

@FunctionalInterface
public interface BadCalculator {
    int calculate(int a, int b);
    int anotherMethod();  // 컴파일 에러! 추상 메서드가 2개
}
```

`@FunctionalInterface`가 없어도 동작하지만, 붙이면 실수로 추상 메서드를 2개 이상 만들 때 바로 에러로 알 수 있습니다.

```java
// 람다 표현식 사용
Calculator add = (a, b) -> a + b;
Calculator multiply = (a, b) -> a * b;

System.out.println(add.calculate(5, 3));  // 8
```

**주요 함수형 인터페이스** (java.util.function):

| 인터페이스 | 메서드 | 설명 |
|-----------|--------|------|
| `Predicate<T>` | `boolean test(T t)` | 조건 검사 |
| `Function<T, R>` | `R apply(T t)` | 변환 |
| `Consumer<T>` | `void accept(T t)` | 소비 (반환 없음) |
| `Supplier<T>` | `T get()` | 공급 (인자 없음) |

```java
Predicate<String> isEmpty = s -> s.isEmpty();
Function<String, Integer> length = s -> s.length();
Consumer<String> print = s -> System.out.println(s);
Supplier<String> supplier = () -> "Hello";
```

---

### Stream API

**중간 연산 vs 최종 연산**

```java
List<String> result = list.stream()
    .filter(s -> s.startsWith("a"))  // 중간 연산 (지연)
    .map(String::toUpperCase)         // 중간 연산 (지연)
    .sorted()                         // 중간 연산 (지연)
    .collect(Collectors.toList());    // 최종 연산 (실행)
```

| 구분 | 중간 연산 | 최종 연산 |
|------|----------|----------|
| 반환 | Stream | 결과값 (List, int 등) |
| 실행 시점 | 지연 (Lazy) | 즉시 (Eager) |
| 예시 | filter, map, sorted | collect, forEach, count |

**지연 평가**(Lazy Evaluation)

```java
list.stream()
    .filter(s -> {
        System.out.println("filter: " + s);
        return s.startsWith("a");
    })
    .map(s -> {
        System.out.println("map: " + s);
        return s.toUpperCase();
    })
    .findFirst();  // 최종 연산 - 여기서 실제 실행

// 출력: 첫 번째 매칭 요소까지만 처리
```

**이점**:
- 필요한 만큼만 처리 (Short-Circuit)
- 메모리 효율적
- 무한 스트림 처리 가능

---

### Optional

**null 안전한 처리**

```java
// Bad
User user = repository.findById(id);
if (user != null) {
    String email = user.getEmail();
    if (email != null) {
        // ...
    }
}

// Good
Optional<User> user = repository.findById(id);
user.map(User::getEmail)
    .filter(email -> email.contains("@"))
    .ifPresent(email -> sendEmail(email));
```

`map()`은 Optional이 **값을 가지고 있을 때만** 동작합니다. empty이면 함수를 실행하지 않고 그대로 `Optional.empty()`를 반환합니다.

**orElse vs orElseGet**

```java
// orElse: Optional에 값이 있든 없든 createDefault()가 무조건 실행됨
String value1 = optional.orElse(createDefault());

// orElseGet: Optional이 비어있을 때만 createDefault() 실행됨
String value2 = optional.orElseGet(() -> createDefault());
```

**차이점**: `orElse()`는 메서드 호출 전에 인자를 먼저 계산하므로, Optional에 값이 있어도 `createDefault()`가 실행됩니다. 

반면 `orElseGet()`은 람다를 넘기기 때문에 실제로 값이 필요할 때만 실행됩니다.

```java
// Bad - 값이 있어도 DB 쿼리 실행
optional.orElse(repository.findDefault());

// Good - 값이 없을 때만 DB 쿼리 실행
optional.orElseGet(() -> repository.findDefault());
```

---

### 메서드 참조

```java
// 1. 정적 메서드 참조
Function<String, Integer> parser = Integer::parseInt;

// 2. 특정 객체의 인스턴스 메서드
String str = "Hello";
Supplier<Integer> lengthGetter = str::length;

// 3. 임의 객체의 인스턴스 메서드
Function<String, String> upper = String::toUpperCase;

// 4. 생성자 참조
Supplier<List<String>> listFactory = ArrayList::new;
```

```java
// 람다 → 메서드 참조
list.stream().map(s -> s.toUpperCase());   // 람다
list.stream().map(String::toUpperCase);    // 메서드 참조

list.forEach(x -> System.out.println(x));  // 람다
list.forEach(System.out::println);         // 메서드 참조
```

**메서드 참조 사용 조건**

메서드 참조는 람다가 **메서드 하나만 호출**하고, 파라미터를 **그대로 전달**할 때만 사용 가능합니다.

```java
// 메서드 참조 가능
s -> s.toUpperCase()       // String::toUpperCase
s -> Integer.parseInt(s)   // Integer::parseInt

// 메서드 참조 불가능
s -> s.substring(0, 5)              // 파라미터를 가공해서 전달
s -> Integer.parseInt(s.trim())     // 여러 메서드 호출
s -> s != null ? s.toUpperCase() : "default"  // 조건문 포함
```

---

## Mutable vs Immutable 객체

### Immutable 객체 만드는 방법

**1. 클래스를 final로 선언**

```java
public final class ImmutablePerson {
    // 서브클래스가 mutable 동작을 추가하는 것 방지
}
```

**2. 모든 필드를 private final로**

```java
public final class ImmutablePerson {
    private final String name;
    private final int age;

    public ImmutablePerson(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public String getName() { return name; }
    public int getAge() { return age; }
    // setter 없음
}
```

**3. mutable 필드에 대한 방어적 복사**

```java
public final class Period {
    private final Date start;
    private final Date end;

    public Period(Date start, Date end) {
        // 생성자에서 방어적 복사
        this.start = new Date(start.getTime());
        this.end = new Date(end.getTime());

        if (this.start.compareTo(this.end) > 0) {
            throw new IllegalArgumentException();
        }
    }

    public Date getStart() {
        // getter에서 방어적 복사
        return new Date(start.getTime());
    }

    public Date getEnd() {
        return new Date(end.getTime());
    }
}
```

**방어적 복사가 없으면?**

```java
Date start = new Date();
Period period = new Period(start, end);
start.setTime(0);  // 외부에서 내부 상태 변경 가능!
// 왜 why? 
// 단순히 this.start = start; 했으면 참조를 하기 때문에 start가 바뀔 경우 this.start도 바뀜.
```

---

### Immutable 객체의 장점

**1. 스레드 안전성**

불변 객체는 상태가 바뀌지 않으므로 여러 스레드가 동시에 읽어도 문제없습니다.

```java
// Mutable - 동기화 필요
class MutableCounter {
    private int count = 0;
    public synchronized void increment() { count++; }  // 동기화 필수
}

// Immutable - 동기화 불필요
final String name = "hello";  // 여러 스레드에서 그냥 읽으면 됨
```

**2. 캐싱과 재사용**

값이 변하지 않으니까 같은 값을 가진 객체를 재사용할 수 있습니다.

```java
String s1 = "hello";
String s2 = "hello";
System.out.println(s1 == s2);  // true - String Pool에서 같은 객체 재사용

Integer i1 = 127;
Integer i2 = 127;
System.out.println(i1 == i2);  // true - Integer Cache (-128 ~ 127)
```

**3. 해시 키로 안전**

HashMap의 키는 hashCode로 버킷 위치를 결정합니다. 키가 mutable이면 값을 바꿨을 때 hashCode가 달라져서 데이터를 찾을 수 없게 됩니다.

```java
// Mutable 객체를 키로 쓰면 위험
List<String> key = new ArrayList<>();
key.add("a");
map.put(key, "value");

key.add("b");  // 키 변경 -> hashCode 변경
map.get(key);  // null! 버킷 위치가 달라져서 못 찾음

// Immutable 객체는 hashCode가 변하지 않아서 안전
String key2 = "hello";
map.put(key2, "value");
map.get(key2);  // "value" - 항상 찾을 수 있음
```

**4. 실패 원자성**

메서드 실행 중 예외가 발생해도 객체가 중간 상태로 남지 않습니다.

```java
// Mutable - 예외 발생 시 중간 상태로 남을 수 있음
class MutableAccount {
    private int balance;
    private String owner;

    public void update(int balance, String owner) {
        this.balance = balance;  // 여기까지 실행됨
        validate(owner);         // 여기서 예외 발생하면?
        this.owner = owner;      // balance만 바뀌고 owner는 안 바뀐 상태
    }
}

// Immutable - 새 객체를 만들어서 반환하므로 원본은 그대로
class ImmutableAccount {
    private final int balance;
    private final String owner;

    public ImmutableAccount update(int balance, String owner) {
        validate(owner);  // 예외 발생하면 새 객체 생성 자체가 안 됨
        return new ImmutableAccount(balance, owner);  // 원본은 영향 없음
    }
}
```

---

### Java Record (Java 14+)

```java
// 불변 클래스를 간단하게 생성
public record Point(int x, int y) {
    // 자동 생성:
    // - private final 필드
    // - 생성자
    // - getter (x(), y())
    // - equals(), hashCode(), toString()
}

Point p = new Point(10, 20);
System.out.println(p.x());  // 10
```

---

## null을 안전하게 다루는 방법

### 1. Optional 사용

```java
// 반환 타입으로 사용
public Optional<User> findById(Long id) {
    User user = repository.find(id);
    return Optional.ofNullable(user);
}

// 체이닝
findById(id)
    .map(User::getEmail)
    .filter(email -> !email.isEmpty())
    .orElse("default@email.com");
```

**주의**: Optional을 필드나 파라미터로 사용하지 않는다.

```java
// Bad
public class User {
    private Optional<String> email;  // 필드로 사용 X
}

public void process(Optional<String> name) { }  // 파라미터로 사용 X

// Good
public Optional<String> getEmail() {  // 반환 타입으로 사용 O
    return Optional.ofNullable(email);
}
```

### 2. Objects.requireNonNull()

null이면 **NullPointerException**을 던집니다.

```java
public void process(String name) {
    this.name = Objects.requireNonNull(name, "name cannot be null");
}
```

Spring에서는 `Assert` 클래스도 사용할 수 있습니다.

```java
Assert.notNull(name, "name cannot be null");  // IllegalArgumentException
Assert.state(isInitialized, "not initialized");  // IllegalStateException
```

### 3. @Nullable, @NonNull 애노테이션

```java
public void process(@NonNull String name, @Nullable String description) {
    // IDE와 정적 분석 도구가 경고
}
```

### 4. Null Object Pattern

```java
public interface Discount {
    int apply(int price);
}

public class NoDiscount implements Discount {
    @Override
    public int apply(int price) {
        return price;  // 할인 없음
    }
}

// null 대신 NoDiscount 사용
Discount discount = getDiscount() != null ? getDiscount() : new NoDiscount();
```

---

## 정리

### Exception

| 구분 | Checked | Unchecked |
|------|---------|-----------|
| 처리 | 반드시 처리 | 선택적 |
| 용도 | 복구 가능한 상황 | 프로그래밍 오류 |
| Spring 롤백 | 커밋 (기본) | 롤백 |

### Java 8

| 기능 | 핵심 |
|------|------|
| 람다 | 함수형 인터페이스 (추상 메서드 1개) |
| Stream | 지연 평가, 중간 연산 vs 최종 연산 |
| Optional | orElse (즉시) vs orElseGet (지연) |
| default 메서드 | 기존 인터페이스 확장 가능 |

### Immutable

| 만드는 방법 | 설명 |
|------------|------|
| final class | 서브클래스 방지 |
| private final 필드 | 직접 접근 방지 |
| setter 없음 | 수정 불가 |
| 방어적 복사 | mutable 필드 보호 |
