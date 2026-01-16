---
title: "Java Reflection"
date: "2025-01-15"
description: "리플렉션이 왜 필요한지, 어떻게 동작하는지, 프레임워크에서 어떻게 활용되는지 공식 문서 기반으로 정리합니다."
category: "개발"
tags: ["Java", "Reflection", "JVM", "Spring"]
---

## 리플렉션이 없으면 어떤 문제가 생기는가?

Spring Framework를 생각해봅시다.

```java
@Component
public class UserService {
    // ...
}
```

Spring은 `@Component`가 붙은 클래스를 찾아서 빈으로 등록합니다.

그런데 **Spring은 UserService라는 클래스를 어떻게 알까요?**

### Spring JAR는 이미 컴파일된 파일이다

```
2023년 11월: Spring 개발자들이 Spring 6.0 코드 작성
2023년 11월: javac로 컴파일 → spring-context-6.0.jar 생성
2023년 11월: Maven Central에 업로드

2025년 1월: 우리의 프로젝트 생성
2025년 1월: build.gradle에 Spring 의존성 추가
2025년 1월: 이미 만들어진 JAR 파일을 다운로드해서 사용
```

우리가 `gradle build`를 실행하면:
- 우리가 만든 `UserService.java` → 컴파일 → `UserService.class`
- Spring JAR → **컴파일 안 함**, 그냥 가져다 씀

**Spring 코드는 2023년에 이미 컴파일이 끝났습니다.** 우리의 UserService가 세상에 존재하기 전에요.

### 그래서 Spring 코드에 이런 게 있을 수 없다

```java
// spring-context.jar 안에 이런 코드가 있을 수 없음
// UserService는 2025년에 만들어졌으니까
new UserService();
```

Spring JAR가 빌드될 때 `UserService.java`는 존재하지 않았습니다.

없는 클래스를 `new`할 수 없습니다.

### Spring이 실제로 하는 일

Spring은 **규칙**만 가지고 있습니다.

```java
// spring-context.jar 안에 있는 코드 (단순화)
public class BeanFactory {

    public void scan(String basePackage) {
        // 1. 클래스패스에서 .class 파일들을 찾아서 이름(문자열) 수집
        List<String> classNames = findClassFiles(basePackage);
        // → ["com.example.UserService", "com.example.OrderService", ...]

        // 2. 각 클래스 이름(문자열)으로 Class 객체 얻기
        for (String className : classNames) {
            Class<?> clazz = Class.forName(className);  // 리플렉션!

            // 3. @Component 붙어있는지 확인
            if (clazz.isAnnotationPresent(Component.class)) {  // 리플렉션!
                // 4. 객체 생성
                Object bean = clazz.getDeclaredConstructor().newInstance();  // 리플렉션!
                container.put(className, bean);
            }
        }
    }
}
```

**핵심**: `Class.forName("com.example.UserService")`

이건 **문자열**을 받아서 해당 이름의 클래스를 찾아줍니다.

```java
// 이건 불가능 (컴파일 타임에 UserService를 알아야 함)
new UserService();

// 이건 가능 (런타임에 문자열로 찾음)
Class.forName("com.example.UserService").newInstance();
```

### 정리

```
컴파일 타임 (Spring JAR 빌드 시점, 2023년):
→ "basePackage 아래 .class 파일을 스캔해서 @Component 붙은 거 찾아라"라는 로직만 존재
→ 구체적으로 어떤 클래스가 있는지는 모름

런타임 (우리의 애플리케이션 실행 시점, 2025년):
→ 실제로 스캔 실행
→ "com.example.UserService" 발견
→ @Component 붙어있네? → 빈으로 등록
```

**이게 리플렉션이 필요한 이유입니다.**

---

## 리플렉션이란?

**Reflection**: 런타임에 클래스의 구조(필드, 메서드, 생성자)를 검사하고 조작할 수 있게 해주는 Java API입니다.

컴파일 타임에 알 수 없는 클래스를 런타임에 동적으로 다룰 수 있습니다.

```java
// 컴파일 타임에 타입을 아는 경우 (일반적인 코드)
UserService service = new UserService(repository);

// 런타임에 타입을 아는 경우 (리플렉션)
Class<?> clazz = Class.forName("com.example.UserService");
Constructor<?> constructor = clazz.getDeclaredConstructor(UserRepository.class);
Object service = constructor.newInstance(repository);
```

리플렉션 없이는 문자열로 된 클래스 이름만 가지고 객체를 생성할 방법이 없습니다.

---

## Class 객체 얻는 방법

리플렉션의 시작점은 `Class` 객체입니다. 3가지 방법으로 얻을 수 있습니다.

### 1. .class 리터럴

컴파일 타임에 클래스를 알 때 사용합니다.

```java
Class<String> stringClass = String.class;
Class<Integer> intClass = int.class;  // 기본 타입도 가능
Class<int[]> arrayClass = int[].class;  // 배열도 가능
```

### 2. getClass() 메서드

객체 인스턴스가 있을 때 사용합니다. 런타임 타입을 반환합니다.

```java
String str = "hello";
Class<?> clazz = str.getClass();  // String.class

// 다형성 상황에서 런타임 타입 반환
Animal animal = new Dog();
Class<?> clazz = animal.getClass();  // Dog.class (Animal.class가 아님!)
```

변수 타입은 `Animal`이지만 실제 객체는 `Dog`입니다. 

리플렉션은 런타임에 동작하기 때문에, 변수 선언 타입이 아니라 **실제로 힙에 있는 객체의 타입**을 반환합니다.

**용도**: 이미 있는 객체를 **분석**할 때 사용합니다.

```java
User user = new User();  // 객체가 이미 있음
Class<?> clazz = user.getClass();
Field[] fields = clazz.getDeclaredFields();  // 필드 분석
```

### 3. Class.forName()

클래스 이름을 문자열로 받을 때 사용합니다. **프레임워크에서 가장 많이 사용**합니다.

```java
// 패키지 스캔으로 찾은 클래스 이름(문자열)으로 객체 생성
String className = "com.example.UserService";  // 스캔 결과
Class<?> clazz = Class.forName(className);
Object instance = clazz.getDeclaredConstructor().newInstance();
```

**용도**: 객체가 없을 때 객체를 **생성**하기 위해 사용합니다.

프레임워크가 `Class.forName()`을 쓰는 이유는 **객체가 아직 없기 때문**입니다. 객체를 만들려면 먼저 Class를 얻어야 합니다.

**Spring의 컴포넌트 스캔이 이 방식을 사용합니다.** 패키지를 스캔해서 `.class` 파일을 찾고, 파일 경로에서 클래스 이름을 추출해서 `Class.forName()`을 호출합니다.

---

## 주요 API

### Field - 필드 접근

```java
public class User {
    private String name;
    private int age;
}
```

```java
Class<?> clazz = User.class;

// 모든 필드 조회 (private 포함, 상속 제외)
Field[] fields = clazz.getDeclaredFields();

// 특정 필드 접근
Field nameField = clazz.getDeclaredField("name");
nameField.setAccessible(true);  // private 접근 허용

// 값 읽기/쓰기
User user = new User();
nameField.set(user, "Kim");                     // user.name = "Kim" 과 동일
String name = (String) nameField.get(user);     // user.name 과 동일
```

### Method - 메서드 호출

```java
public class Calculator {
    private int add(int a, int b) {
        return a + b;
    }
}
```

```java
Class<?> clazz = Calculator.class;

// 메서드 찾기 (파라미터 타입 명시는 오버로딩 구분용)
Method addMethod = clazz.getDeclaredMethod("add", int.class, int.class);
addMethod.setAccessible(true);

// 메서드 호출
Calculator calc = new Calculator();
int result = (int) addMethod.invoke(calc, 5, 3);  // 8
```

### Constructor - 객체 생성

```java
public class Product {
    private String name;

    private Product(String name) {
        this.name = name;
    }
}
```

```java
Class<?> clazz = Product.class;

// private 생성자 찾기 (파라미터 타입 명시는 오버로딩 구분용)
Constructor<?> constructor = clazz.getDeclaredConstructor(String.class);
constructor.setAccessible(true);

// 객체 생성
Product product = (Product) constructor.newInstance("iPhone");
```

---

## getDeclaredXxx vs getXxx

| 메서드 | 접근 제어자 | 상속 여부 |
| --- | --- | --- |
| getDeclaredFields() | 모든 접근 제어자 | 현재 클래스만 |
| getFields() | public만 | 상속 포함 |
| getDeclaredMethods() | 모든 접근 제어자 | 현재 클래스만 |
| getMethods() | public만 | 상속 포함 |

**"Declared"가 붙으면**: private도 가져오지만, 상속된 멤버는 제외

**"Declared"가 없으면**: public만 가져오지만, 상속된 멤버도 포함

```java
class Parent {
    public String publicField;
    private String privateField;
}

class Child extends Parent {
    public String childPublic;
    private String childPrivate;
}
```

```java
Class<?> clazz = Child.class;

// getDeclaredFields(): childPublic, childPrivate (Parent 필드 제외)
// getFields(): publicField, childPublic (private 제외, 상속 포함)
```

---

## setAccessible(true)의 의미

`setAccessible(true)`는 Java 언어의 접근 제어(private, protected)를 우회합니다.

```java
Field field = clazz.getDeclaredField("privateField");

// 이 상태에서 접근하면 IllegalAccessException
field.get(obj);  // 에러!

// 접근 허용
field.setAccessible(true);
field.get(obj);  // 성공
```

**왜 이런 기능이 있을까요?**

프레임워크가 `private` 필드에 DI를 해야 하기 때문입니다. `@Autowired`가 붙은 필드는 대부분 private입니다.

**보안 문제는 없을까요?**

Spring Boot, 일반 Java 애플리케이션, 일반 서버 환경에서는 `setAccessible(true)`에 아무 제한이 없습니다.

Security Manager라는 보안 기능이 활성화된 환경에서만 제한되는데, Java 17부터 deprecated 되었고 거의 사용되지 않습니다.

---

## 프레임워크의 리플렉션 활용

### Spring: 빈 생성과 의존성 주입

우리가 작성하는 코드와 Spring이 내부적으로 하는 일을 비교해봅니다.

**우리가 작성하는 코드**

```java
@Component
public class OrderService {

    @Autowired
    private PaymentService paymentService;

    @Value("${order.timeout}")
    private int timeout;
}
```

**Spring이 리플렉션으로 하는 일**

```java
// 1. 패키지 스캔: com.example 아래 모든 .class 파일을 찾음
List<String> classNames = scanPackage("com.example");
// → ["com.example.OrderService", "com.example.UserService", ...]

// 2. 각 클래스를 로드하고 @Component 확인
for (String className : classNames) {
    Class<?> clazz = Class.forName(className);

    if (clazz.isAnnotationPresent(Component.class)) {

        // 3. 생성자로 빈 생성
        Object bean = clazz.getDeclaredConstructor().newInstance();

        // 4. @Autowired 필드에 의존성 주입
        // getBean()은 이미 생성자로 만들어서 컨테이너에 등록된 빈을 가져옴
        for (Field field : clazz.getDeclaredFields()) {
            if (field.isAnnotationPresent(Autowired.class)) {
                field.setAccessible(true);
                field.set(bean, getBean(field.getType()));  // PaymentService 빈 주입
            }
        }

        // 5. @Value 필드에 설정값 주입
        for (Field field : clazz.getDeclaredFields()) {
            if (field.isAnnotationPresent(Value.class)) {
                String key = field.getAnnotation(Value.class).value();
                field.setAccessible(true);
                field.set(bean, getProperty(key));
            }
        }

        // 6. 컨테이너에 등록
        beanContainer.put(className, bean);
    }
}
```

우리가 `@Component`, `@Autowired`, `@Value`만 붙이면 Spring이 리플렉션으로 알아서 처리합니다.

#### @Bean 메서드로 빈 등록하는 경우

`@Component` 대신 `@Bean` 메서드를 사용하면 빈 생성 방식이 달라집니다.

**우리가 작성하는 코드**

```java
@Configuration
public class AppConfig {

    @Bean
    public DataSource dataSource() {
        return new HikariDataSource();
    }
}
```

**Spring이 리플렉션으로 하는 일**

```java
// 1. AppConfig도 @Component이므로 먼저 생성자로 빈 생성
Class<?> configClass = Class.forName("com.example.AppConfig");
Object configInstance = configClass.getDeclaredConstructor().newInstance();

// 2. @Bean 메서드를 찾아서 호출
Method method = configClass.getDeclaredMethod("dataSource");
Object bean = method.invoke(configInstance);  // 반환값이 빈으로 등록됨
```

**빈 생성 방식 정리**

| 어노테이션 | 빈 생성 방식 | 리플렉션 API |
|---|---|---|
| `@Component`, `@Service`, `@Repository` | 생성자 호출 | `Constructor.newInstance()` |
| `@Bean` 메서드 | 메서드 호출 | `Method.invoke()` |

### JPA: 엔티티 매핑

```java
@Entity
@Table(name = "users")
public class User {
    @Id
    private Long id;

    @Column(name = "user_name")
    private String name;
}
```

JPA는 `User.class`를 어떻게 알까요? 개발자가 직접 알려줍니다.

```java
// 개발자가 User.class를 파라미터로 전달
List<User> users = entityManager.createQuery(
    "SELECT u FROM User u", User.class
).getResultList();
```

JPA가 내부적으로 수행하는 작업:

```java
// SELECT 결과를 User 객체로 변환
ResultSet rs = statement.executeQuery("SELECT id, user_name FROM users");

while (rs.next()) {
    // 1. 기본 생성자로 빈 객체 생성 (User.class는 위에서 받은 것)
    Object user = entityClass.getDeclaredConstructor().newInstance();

    // 2. 각 필드에 값 주입
    for (Field field : entityClass.getDeclaredFields()) {
        Column column = field.getAnnotation(Column.class);
        String columnName = (column != null) ? column.name() : field.getName();

        Object value = rs.getObject(columnName);
        field.setAccessible(true);
        field.set(user, value);
    }
}
```

### JUnit: 테스트 메서드 실행

```java
public class CalculatorTest {
    @Test
    public void testAdd() { ... }

    @Test
    public void testSubtract() { ... }
}
```

JUnit이 수행하는 작업:

```java
// @Test가 붙은 모든 메서드 찾아서 실행
for (Method method : testClass.getDeclaredMethods()) {
    if (method.isAnnotationPresent(Test.class)) {
        Object testInstance = testClass.getDeclaredConstructor().newInstance();
        method.invoke(testInstance);
    }
}
```

---

## 동적 프록시 (Dynamic Proxy)

리플렉션의 강력한 활용 사례입니다. 런타임에 인터페이스 구현체를 생성합니다.

### 왜 필요한가?

```java
public interface UserRepository extends JpaRepository<User, Long> {
    List<User> findByName(String name);  // 구현체 없이 메서드 정의만
}
```

Spring Data JPA를 사용하면 **인터페이스만 정의해도** 구현체 없이 동작합니다.

```java
@Autowired
private UserRepository userRepository;  // 구현체가 없는데 주입됨?

userRepository.findByName("철수");  // 호출도 됨?
```

**어떻게 가능할까요?** 동적 프록시입니다.

### 동작 원리

Spring Data JPA는 `SimpleJpaRepository`를 실제 구현체로 사용하고, 동적 프록시로 감싸서 메서드 호출을 가로챕니다.

```java
// Spring Data JPA 내부 동작 (단순화)
UserRepository proxy = (UserRepository) Proxy.newProxyInstance(
    UserRepository.class.getClassLoader(),
    new Class<?>[] { UserRepository.class },
    new InvocationHandler() {
        private final SimpleJpaRepository<User, Long> target = new SimpleJpaRepository<>(...);

        @Override
        public Object invoke(Object proxy, Method method, Object[] args) {
            String methodName = method.getName();

            // JpaRepository 기본 메서드는 SimpleJpaRepository로 위임
            if (methodName.equals("save") || methodName.equals("findById")) {
                return method.invoke(target, args);
            }

            // 커스텀 메서드(findByName 등)는 메서드 이름 파싱해서 쿼리 생성
            if (methodName.startsWith("findBy")) {
                String field = methodName.substring(6);  // "Name"
                return executeQuery("SELECT * FROM users WHERE " + field + " = ?", args);
            }
            // ...
        }
    }
);
```

`Proxy.newProxyInstance()`는 런타임에 `UserRepository` 인터페이스를 구현하는 클래스를 생성합니다.

`save()`, `findById()` 같은 기본 메서드는 `SimpleJpaRepository`로 위임하고, `findByName()` 같은 커스텀 메서드는 메서드 이름을 파싱해서 쿼리를 생성합니다.

### 왜 프록시가 필요한가?

개발자가 정의하는 인터페이스는 무한히 다양합니다.

```java
public interface UserRepository extends JpaRepository<User, Long> {
    List<User> findByName(String name);
    List<User> findByAgeGreaterThan(int age);
    Optional<User> findByEmailAndStatus(String email, Status status);
    // 개발자가 원하는 메서드를 자유롭게 정의
}
```

Spring Data JPA가 이 모든 메서드를 미리 구현해둘 수는 없습니다. 개발자가 어떤 메서드를 정의할지 알 수 없기 때문입니다.

**프록시가 해결하는 문제**: 메서드 정의는 컴파일 타임에, 구현은 런타임에 동적으로 생성합니다.

### 리플렉션이 핵심인 이유

동적 프록시의 핵심은 **메서드 이름을 문자열로 분석**하는 것입니다.

```java
public Object invoke(Object proxy, Method method, Object[] args) {
    String methodName = method.getName();  // "findByName" (문자열)

    // 메서드 이름 파싱
    // "findByName" → "Name" 추출 → "name" 필드로 WHERE 조건 생성
    if (methodName.startsWith("findBy")) {
        String fieldName = methodName.substring(6);  // "Name"
        return executeQuery("SELECT * FROM users WHERE " + fieldName.toLowerCase() + " = ?", args);
    }
}
```

**리플렉션 없이는 불가능한 이유**:

1. **메서드 이름 추출**: `method.getName()`으로 호출된 메서드 이름을 문자열로 얻습니다
2. **파라미터 분석**: `method.getParameters()`로 파라미터 정보를 얻어 쿼리에 바인딩합니다
3. **반환 타입 확인**: `method.getReturnType()`으로 `List<User>`인지 `Optional<User>`인지 확인합니다

컴파일 타임에는 어떤 메서드가 호출될지 알 수 없으므로, 런타임에 리플렉션으로 메서드 정보를 분석해야 합니다.

### Spring AOP도 동적 프록시

```java
@Transactional
public void transfer(Long from, Long to, int amount) {
    // 비즈니스 로직
}
```

`@Transactional`이 붙은 메서드는 프록시로 감싸집니다:

```java
// 프록시가 하는 일 (단순화)
public Object invoke(Object proxy, Method method, Object[] args) {
    if (method.isAnnotationPresent(Transactional.class)) {
        try {
            beginTransaction();
            Object result = method.invoke(target, args);  // 원본 메서드 호출
            commit();
            return result;
        } catch (Exception e) {
            rollback();
            throw e;
        }
    }
    return method.invoke(target, args);
}
```

### invoke가 두 개?

코드에 `invoke`가 두 번 등장합니다. 이름은 같지만 역할이 다릅니다.

| 구분 | Method.invoke() | InvocationHandler.invoke() |
|------|-----------------|---------------------------|
| 호출 주체 | 개발자가 직접 호출 | JVM이 자동 호출 |
| 역할 | 메서드 실행 | 메서드 호출 가로채기 |
| 용도 | 리플렉션으로 메서드 실행 | 프록시 동작 정의 |

```
userRepository.save(user)  // 1. 개발자가 프록시 메서드 호출
    ↓
InvocationHandler.invoke() 자동 실행  // 2. JVM이 콜백
    ↓
method.invoke(target, args)  // 3. 내부에서 실제 메서드 실행
```

`InvocationHandler.invoke()`는 "메서드 호출이 들어왔을 때 어떻게 처리할지" 정의하는 콜백 메서드입니다.

---

## 리플렉션의 성능

### 오버헤드 원인

**1. 타입 검사**: 리플렉션은 런타임에 타입을 확인합니다. 컴파일 타임 최적화가 불가능합니다.

**2. 접근 검사**: `setAccessible()`을 호출해도 내부적으로 보안 검사가 발생합니다.

**3. JIT 인라이닝 불가**: 일반 메서드 호출은 JIT 컴파일러가 인라이닝할 수 있지만, `Method.invoke()`는 대상 메서드가 동적으로 결정되어 최적화가 제한됩니다.

**4. 박싱/언박싱**: 리플렉션 API는 Object 타입을 사용하므로 기본 타입에 박싱이 발생합니다.

### 성능 비교

```java
// 직접 호출
user.getName();  // 1x (기준)

// 리플렉션 호출
Method method = User.class.getMethod("getName");
method.invoke(user);  // 약 3~10x 느림
```

### 프레임워크의 최적화 전략

**1. Method/Field 객체 캐싱**

```java
// 나쁜 예: 매번 조회
public void process(Object obj) {
    Method method = obj.getClass().getMethod("process");
    method.invoke(obj);
}

// 좋은 예: 캐싱
private static final Map<Class<?>, Method> methodCache = new ConcurrentHashMap<>();

public void process(Object obj) {
    Method method = methodCache.computeIfAbsent(obj.getClass(),
        clazz -> clazz.getMethod("process"));
    method.invoke(obj);
}
```

**2. 초기화 시점에 리플렉션 수행**

Spring은 애플리케이션 시작 시 모든 빈을 생성하고 의존성을 주입합니다.

런타임에는 이미 생성된 객체를 사용하므로 리플렉션 오버헤드가 없습니다.

---

## 리플렉션의 단점

### 1. 컴파일 타임 타입 안전성 상실

```java
// 컴파일 에러: 메서드 이름 오타
user.getNaem();  // 컴파일 시점에 발견

// 런타임 에러: 메서드 이름 오타
Method method = User.class.getMethod("getNaem");  // NoSuchMethodException
```

리플렉션은 문자열로 멤버를 참조하므로, 오타나 리팩토링 시 버그가 런타임까지 숨어있습니다.

### 2. IDE 지원 제한

```java
// IDE가 추적 가능
user.getName();  // "Find Usages"로 모든 호출처 찾기 가능

// IDE가 추적 불가
method.invoke(user);  // 어떤 메서드를 호출하는지 IDE가 모름
```

리팩토링, 사용처 검색, 자동완성이 제대로 동작하지 않습니다.

### 3. 성능 오버헤드

앞서 설명한 것처럼 직접 호출보다 느립니다.

### 4. 캡슐화 위반

`setAccessible(true)`로 private 멤버에 접근하면 클래스의 불변식이 깨질 수 있습니다.

```java
// 불변 객체의 내부 상태 변경
Field valueField = String.class.getDeclaredField("value");
valueField.setAccessible(true);
valueField.set(str, newValue);  // String의 불변성 위반!
```

---

## 정리

### 리플렉션이 필요한 이유

| 상황 | 설명 |
| --- | --- |
| 프레임워크 개발 | 컴파일 타임에 사용자 클래스를 알 수 없음 |
| 어노테이션 처리 | 런타임에 어노테이션 정보 읽기 |
| 의존성 주입 | private 필드에 외부에서 값 주입 |
| ORM | 객체와 DB 테이블 자동 매핑 |
| 직렬화/역직렬화 | JSON/XML과 객체 간 변환 |
| 동적 프록시 | AOP, 트랜잭션 처리 |

### 핵심 API

| API | 용도 |
| --- | --- |
| Class.forName() | 문자열로 클래스 로드 |
| getDeclaredFields() | 모든 필드 조회 (private 포함) |
| getDeclaredMethods() | 모든 메서드 조회 (private 포함) |
| getDeclaredConstructor() | 생성자 조회 |
| setAccessible(true) | 접근 제어 우회 |
| Method.invoke() | 메서드 동적 호출 |
| Proxy.newProxyInstance() | 동적 프록시 생성 |

### 주의사항

- 애플리케이션 코드에서는 가급적 사용하지 않기
- 프레임워크/라이브러리 개발 시에만 사용
- Method/Field 객체는 캐싱하기
- Java 9+ 모듈 시스템 제약 고려하기
