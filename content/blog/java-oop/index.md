---
title: "객체지향과 SOLID 원칙"
date: "2025-09-22"
description: "OOP 4대 특성과 SOLID 원칙을 정리합니다."
category: "개발"
tags: ["Java", "OOP", "SOLID", "Design Pattern"]
---

## 객체지향 프로그래밍 4대 특성

### 1. 캡슐화 (Encapsulation)

**정의**: 데이터(변수)와 그 데이터를 처리하는 코드(메서드)를 하나의 단위로 묶는 메커니즘.

- **정보 은닉**: 변경 가능성이 높은 설계 결정사항을 분리하여 보호하는 **원칙**
- **캡슐화**: 정보 은닉을 구현하는 **기술**

```java
public class BankAccount {
    // private으로 데이터 은닉
    private String accountNumber;
    private double balance;

    // public 메서드로 제어된 접근 제공
    public double getBalance() {
        return balance;
    }

    // 비즈니스 로직과 검증 추가
    public void deposit(double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("입금액은 0보다 커야 합니다");
        }
        this.balance += amount;
    }

    public void withdraw(double amount) {
        if (amount > balance) {
            throw new IllegalArgumentException("잔액이 부족합니다");
        }
        this.balance -= amount;
    }
}
```

**장점**:
- 데이터 보호: 민감한 데이터를 무단 접근으로부터 보호
- 유지보수성: 내부 구현 변경이 외부 코드에 영향을 주지 않음
- 모듈성: 데이터와 메서드를 함께 유지하여 조직적인 코드 구조

---

### 2. 상속 (Inheritance)

**정의**: 기존 클래스의 필드와 메서드를 새 클래스에서 재사용하는 메커니즘.

```java
// IS-A 관계: Dog IS-A Animal
public class Animal {
    protected String name;

    public void eat() {
        System.out.println(name + " is eating");
    }
}

public class Dog extends Animal {
    public void bark() {
        System.out.println(name + " is barking");
    }
}
```

**상속의 단점**:

1. **강한 결합**: 부모 클래스 변경이 자식 클래스에 영향
2. **캡슐화 위반**: 부모의 내부 구현이 자식에게 노출 (white-box reuse)
3. **제한된 유연성**: Java는 다중 상속 불가
4. **깊은 계층 구조**: 이해와 유지보수 어려움

**대안: Composition Over Inheritance**

클래스 상속보다 객체 조합을 선호합니다.

**판단 기준**: "~는 ~이다"가 자연스러우면 상속, 아니면 조합

- "Dog는 Animal이다" → 자연스러움 → 상속 OK
- "Car는 Engine이다" → 어색함 → 조합

**상속으로 구현**

```java
class GasolineCar extends Car { }
class ElectricCar extends Car { }
// 하이브리드는? 다중 상속 불가로 구현 어려움
```

**조합으로 구현**

```java
class Car {
    private Engine engine;

    public Car(Engine engine) {
        this.engine = engine;
    }

    public void setEngine(Engine engine) {
        this.engine = engine;  // 런타임에 교체 가능
    }
}

Car car = new Car(new GasolineEngine());
car.setEngine(new ElectricEngine());  // 전기차로 변경
```

**애매하면 조합을 선택합니다.** 상속은 나중에 바꾸기 어렵지만, 조합은 유연하게 수정 가능합니다.

---

### 3. 다형성 (Polymorphism)

**정의**: 서로 다른 클래스의 객체들을 공통 슈퍼클래스의 객체로 취급할 수 있게 해주는 특성.

**컴파일 타임 다형성**(Static Polymorphism) - 오버로딩

```java
public class Calculator {
    public int add(int a, int b) { return a + b; }
    public double add(double a, double b) { return a + b; }
    public int add(int a, int b, int c) { return a + b + c; }
}
```

**런타임 다형성**(Dynamic Polymorphism) - 오버라이딩

```java
public class Animal {
    public void makeSound() {
        System.out.println("Some sound");
    }
}

public class Dog extends Animal {
    @Override
    public void makeSound() {
        System.out.println("Bark");
    }
}

public class Cat extends Animal {
    @Override
    public void makeSound() {
        System.out.println("Meow");
    }
}

// 런타임에 실제 객체 타입에 따라 메서드 결정
Animal myDog = new Dog();
Animal myCat = new Cat();
myDog.makeSound();  // "Bark"
myCat.makeSound();  // "Meow"
```

**업캐스팅 vs 다운캐스팅**

```java
// 업캐스팅: 암시적, 항상 안전
Animal animal = new Dog();

// 다운캐스팅: 명시적, ClassCastException 가능
if (animal instanceof Dog) {
    Dog dog = (Dog) animal;  // 안전한 다운캐스팅
    dog.bark();
}
```

---

### 4. 추상화 (Abstraction)

**정의**: 필수적인 특성은 표시하고 불필요한 세부사항은 숨기는 과정.

**추상 클래스**: 공통 구현 + 추상 메서드

```java
public abstract class Shape {
    protected String color;

    // 추상 메서드: 하위 클래스가 반드시 구현
    public abstract double calculateArea();

    // 구체 메서드: 공통 구현 제공
    public String getColor() {
        return color;
    }
}

public class Circle extends Shape {
    private double radius;

    @Override
    public double calculateArea() {
        return Math.PI * radius * radius;
    }
}
```

**인터페이스**: 계약 정의

```java
public interface Drawable {
    void draw();  // 암시적으로 public abstract

    // Java 8+: default 메서드
    default void display() {
        System.out.println("Displaying...");
    }
}

public class Rectangle implements Drawable {
    @Override
    public void draw() {
        System.out.println("Drawing rectangle");
    }
}
```

---

## SOLID 원칙

5가지 객체 지향 설계 원칙.


### 1. SRP (Single Responsibility Principle) - 단일 책임 원칙

**정의**: 모듈은 하나의 actor에 대해서만 책임을 가져야 한다.

**actor**는 해당 모듈의 변경을 요구하는 이해관계자 그룹.

핵심: 같은 이유로 변경되는 것들을 모으고, 다른 이유로 변경되는 것들을 분리하라.

**위반 사례**

```java
// BAD: 회원가입, 이메일, 로깅이 한 클래스에
public class UserService {
    public void register(User user) {
        // 1. DB 저장
        userRepository.save(user);

        // 2. 환영 이메일 발송
        sendWelcomeEmail(user.getEmail());

        // 3. 로그 기록
        writeLog("User registered: " + user.getId());
    }

    private void sendWelcomeEmail(String email) { /* SMTP 로직 */ }
    private void writeLog(String message) { /* 파일 로직 */ }
}
```

이메일 형식이 바뀌면? 로그 저장소가 바뀌면? 전부 UserService를 수정해야 합니다.

**준수 방법**

```java
// GOOD: 책임별로 분리
public class UserService {
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final LogService logService;

    public void register(User user) {
        userRepository.save(user);
        emailService.sendWelcome(user.getEmail());
        logService.info("User registered: " + user.getId());
    }
}

public class EmailService {
    public void sendWelcome(String email) { /* 이메일 로직 */ }
}

public class LogService {
    public void info(String message) { /* 로그 로직 */ }
}
```

각 클래스가 하나의 책임만 가지므로, 이메일 로직이 바뀌어도 EmailService만 수정하면 됩니다.

---

### 2. OCP (Open-Closed Principle) - 개방-폐쇄 원칙

**정의**: 소프트웨어는 확장에는 열려 있고, 수정에는 닫혀 있어야 한다.

새로운 기능을 추가할 때 기존 코드를 수정하지 않고 확장할 수 있어야 합니다.

**위반 사례**

```java
// BAD: 새 로그인 방식 추가 시 기존 코드 수정 필요
public class LoginService {
    public User login(String type, String credential) {
        if (type.equals("EMAIL")) {
            return loginWithEmail(credential);
        } else if (type.equals("KAKAO")) {
            return loginWithKakao(credential);
        } else if (type.equals("GOOGLE")) {
            return loginWithGoogle(credential);
        }
        // NAVER 추가하려면 이 메서드 수정 필요!
        throw new IllegalArgumentException("Unknown login type");
    }
}
```

**준수 방법**

```java
// GOOD: 추상화를 통한 확장
public interface LoginStrategy {
    User login(String credential);
}

public class EmailLoginStrategy implements LoginStrategy {
    public User login(String credential) { /* 이메일 로그인 */ }
}

public class KakaoLoginStrategy implements LoginStrategy {
    public User login(String credential) { /* 카카오 로그인 */ }
}

// 새 로그인 방식 추가 - 기존 코드 수정 없이 확장
public class NaverLoginStrategy implements LoginStrategy {
    public User login(String credential) { /* 네이버 로그인 */ }
}

// 클라이언트 코드는 변경 없음
public class LoginService {
    private final Map<String, LoginStrategy> strategies;

    public User login(String type, String credential) {
        LoginStrategy strategy = strategies.get(type);
        return strategy.login(credential);
    }
}
```

---

### 3. LSP (Liskov Substitution Principle) - 리스코프 치환 원칙

**정의**: 자식 클래스는 부모 클래스를 완전히 대체할 수 있어야 한다.

부모 타입을 사용하는 코드에서 자식 타입으로 바꿔도 정상 동작해야 합니다.

**위반 사례**

```java
// BAD: GuestUser는 User를 대체할 수 없음
public class User {
    public void changePassword(String newPassword) {
        this.password = newPassword;
    }
}

public class GuestUser extends User {
    @Override
    public void changePassword(String newPassword) {
        throw new UnsupportedOperationException("게스트는 비밀번호 변경 불가");
    }
}

// 클라이언트 코드
public void resetPassword(User user) {
    user.changePassword("newPassword123");  // GuestUser면 예외 발생!
}
```

User를 사용하는 코드는 `changePassword()`가 정상 동작한다고 가정합니다. GuestUser는 이 가정을 깨뜨립니다.

**준수 방법**

```java
// GOOD: 인터페이스 분리
public interface User {
    String getName();
    String getEmail();
}

public interface PasswordChangeable {
    void changePassword(String newPassword);
}

public class RegularUser implements User, PasswordChangeable {
    public String getName() { /* ... */ }
    public String getEmail() { /* ... */ }
    public void changePassword(String newPassword) { /* ... */ }
}

public class GuestUser implements User {
    public String getName() { return "Guest"; }
    public String getEmail() { return null; }
    // changePassword() 메서드 없음
}
```

**LSP 위반 징후**: `UnsupportedOperationException`을 던지면 의심해봐야 합니다.

---

### 4. ISP (Interface Segregation Principle) - 인터페이스 분리 원칙

**정의**: 클라이언트는 자신이 사용하지 않는 인터페이스에 의존하면 안 된다.

인터페이스가 비대하면 구현체가 쓰지 않는 메서드까지 구현해야 합니다.

**위반 사례**

```java
// BAD: 모든 기능이 한 인터페이스에
public interface UserService {
    void register(User user);
    void login(String email, String password);
    void updateProfile(User user);
    void changePassword(String oldPw, String newPw);
    void deleteAccount(Long userId);
    List<User> getAllUsers();           // 관리자만 사용
    void banUser(Long userId);          // 관리자만 사용
    void exportUserData();              // 관리자만 사용
}

// 일반 사용자 서비스는 관리자 기능이 필요 없음
public class RegularUserService implements UserService {
    // 사용하지 않는 메서드들을 구현해야 함
    public List<User> getAllUsers() {
        throw new UnsupportedOperationException();
    }
    public void banUser(Long userId) {
        throw new UnsupportedOperationException();
    }
    public void exportUserData() {
        throw new UnsupportedOperationException();
    }
}
```

**준수 방법**

```java
// GOOD: 역할별로 인터페이스 분리
public interface UserAuthService {
    void register(User user);
    void login(String email, String password);
}

public interface UserProfileService {
    void updateProfile(User user);
    void changePassword(String oldPw, String newPw);
    void deleteAccount(Long userId);
}

public interface AdminUserService {
    List<User> getAllUsers();
    void banUser(Long userId);
    void exportUserData();
}

// 일반 사용자 서비스: 필요한 인터페이스만 구현
public class RegularUserService implements UserAuthService, UserProfileService {
    // 관리자 기능 구현 필요 없음
}

// 관리자 서비스: 모든 인터페이스 구현
public class AdminService implements UserAuthService, UserProfileService, AdminUserService {
    // 모든 기능 구현
}
```

**ISP 위반 징후**: `UnsupportedOperationException`을 던지는 메서드가 있으면 인터페이스 분리를 고려해야 합니다.

---

### 5. DIP (Dependency Inversion Principle) - 의존성 역전 원칙

**정의**: 상위 모듈은 하위 모듈에 의존하면 안 된다. 둘 다 추상화에 의존해야 한다.

Clean Architecture의 핵심 원칙이다.

**DIP vs IoC vs DI**

| 개념 | 설명 |
|------|------|
| **DIP** | 설계 원칙 - "형태(shape)" |
| **IoC** | 제어 흐름의 역전 - "방향(direction)" |
| **DI** | 구현 기법 - "배선(wiring)" |

**관계**: DIP는 **목표**, IoC는 **메커니즘**, DI는 **구현 방법**

**위반 사례**

```java
// BAD: 상위 모듈이 하위 모듈의 구체 클래스에 의존
public class UserService {
    private final MySQLUserRepository repository;  // 구체 클래스!

    public UserService() {
        this.repository = new MySQLUserRepository();  // 직접 생성!
    }

    public User getUser(Long id) {
        return repository.findById(id);
    }
}
```

**문제점**:
1. `UserService`가 MySQL에 강하게 결합
2. PostgreSQL로 변경 시 `UserService` 수정 필요
3. 테스트 시 실제 MySQL 필요 (Mock 불가)

**준수 방법**

```java
// GOOD: 추상화를 통한 의존성 역전

// 1. 추상화 정의 (상위 모듈이 정의)
public interface UserRepository {
    User findById(Long id);
    void save(User user);
}

// 2. 상위 모듈: 추상화에 의존
public class UserService {
    private final UserRepository repository;

    public UserService(UserRepository repository) {  // 생성자 주입
        this.repository = repository;
    }

    public User getUser(Long id) {
        return repository.findById(id);
    }
}

// 3. 하위 모듈: 추상화 구현
public class MySQLUserRepository implements UserRepository {
    @Override
    public User findById(Long id) { /* MySQL 로직 */ }

    @Override
    public void save(User user) { /* MySQL 로직 */ }
}

public class PostgreSQLUserRepository implements UserRepository {
    @Override
    public User findById(Long id) { /* PostgreSQL 로직 */ }

    @Override
    public void save(User user) { /* PostgreSQL 로직 */ }
}

// 4. 테스트용 Mock
public class InMemoryUserRepository implements UserRepository {
    private final Map<Long, User> storage = new HashMap<>();

    @Override
    public User findById(Long id) { return storage.get(id); }

    @Override
    public void save(User user) { storage.put(user.getId(), user); }
}
```

**Spring DI 컨테이너**

```java
@Configuration
public class AppConfig {
    @Bean
    public UserRepository userRepository() {
        if (env.equals("prod")) {
            return new MySQLUserRepository();
        }
        return new InMemoryUserRepository();
    }

    @Bean
    public UserService userService(UserRepository repository) {
        return new UserService(repository);
    }
}
```

---

## 강한 결합 vs 느슨한 결합

### 결합도 (Coupling)

모듈 간 상호 의존성 정도.

| 구분 | 특징 |
|------|------|
| **강한 결합** | 구체 클래스에 직접 의존, 변경 시 연쇄 수정 필요 |
| **느슨한 결합** | 인터페이스에 의존, 구현체 교체 용이 |

### 강한 결합의 문제점

1. **유지보수성 저하**: 연쇄적 변경 강제
2. **테스트 어려움**: Mock 사용 불가
3. **확장성 문제**: 시스템 경직
4. **재사용성 저하**: 의존 모듈 포함 필요

### 느슨한 결합 달성 방법

**1. 인터페이스 사용**

```java
// 강한 결합
public class OrderController {
    private MySQLOrderRepository repository = new MySQLOrderRepository();
}

// 느슨한 결합
public class OrderController {
    private final OrderRepository repository;

    public OrderController(OrderRepository repository) {
        this.repository = repository;
    }
}
```

**2. 의존성 주입**(DI)

```java
@Service
public class OrderService {
    private final OrderRepository orderRepository;

    @Autowired  // 생성자 주입 (권장)
    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
}
```

**3. 이벤트 기반 아키텍처**

```java
// 이벤트 발행
@Service
public class OrderService {
    private final ApplicationEventPublisher eventPublisher;

    public void createOrder(OrderRequest request) {
        Order order = orderRepository.save(new Order(request));
        eventPublisher.publishEvent(new OrderCreatedEvent(order.getId()));
    }
}

// 이벤트 구독 (OrderService와 결합 없음)
@Component
public class EmailNotificationHandler {
    @EventListener
    public void handleOrderCreated(OrderCreatedEvent event) {
        // 이메일 발송
    }
}

@Component
public class InventoryUpdateHandler {
    @EventListener
    public void handleOrderCreated(OrderCreatedEvent event) {
        // 재고 업데이트
    }
}
```

### 응집도 (Cohesion)와의 관계

**설계 목표**: 높은 응집도 + 낮은 결합도

| 개념 | 설명 |
|------|------|
| **응집도** | 모듈 내 요소들이 단일 목적을 위해 함께 작동하는 정도 |
| **결합도** | 모듈 간 의존성 정도 |

**역관계**: 응집도가 높으면 결합도가 낮아지는 경향

**SOLID와의 연결**:
- SRP = 응집도의 재진술
- ISP = 비대한 인터페이스로 인한 결합 방지
- DIP = 추상화를 통한 결합도 감소

---

## 정리

### OOP 4대 특성

| 특성 | 핵심 |
|------|------|
| 캡슐화 | 데이터 은닉 + 제어된 접근 |
| 상속 | 코드 재사용, 단 Composition 우선 |
| 다형성 | 런타임에 실제 타입 기반 메서드 결정 |
| 추상화 | 필수 특성만 노출, 세부사항 은닉 |

### SOLID 원칙

| 원칙 | 핵심 |
|------|------|
| SRP | 하나의 actor에 대한 책임만 |
| OCP | 확장에 열림, 수정에 닫힘 |
| LSP | 자식은 부모를 완전히 대체 가능 |
| ISP | 클라이언트별 인터페이스 분리 |
| DIP | 추상화에 의존, 구체 클래스에 의존하지 않음 |

### 결합도

| 구분 | 달성 방법 |
|------|----------|
| 느슨한 결합 | 인터페이스, DI, 이벤트 기반 |
| 높은 응집도 | SRP, ISP 준수 |
