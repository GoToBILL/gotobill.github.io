---
title: "Java String의 모든 것: 불변성, String Pool, 그리고 성능 최적화"
date: "2025-09-27"
description: "Java String의 불변성 이유, String Pool 동작 원리, StringBuilder vs StringBuffer, 컴파일러 최적화까지 JDK 소스와 공식 문서 기반으로 깊이 있게 분석합니다."
category: "개발"
tags: ["Java", "JVM", "String", "Performance"]
---

## String이 불변인 이유

Java의 String 클래스는 `public final class String`으로 선언되어 있다. 한번 생성되면 그 값을 절대 변경할 수 없다. 이게 왜 중요할까?

### 1. String Pool을 통한 메모리 효율성

Java는 String Pool이라는 특별한 메모리 영역을 사용한다. 같은 문자열 리터럴이 여러 번 사용되면 새로운 객체를 만들지 않고 기존 객체를 재사용한다.

```java
String s1 = "hello";
String s2 = "hello";
String s3 = "hello";

// s1, s2, s3 모두 같은 객체를 참조
System.out.println(s1 == s2); // true
System.out.println(s2 == s3); // true
```

만약 String이 가변이라면? 한 변수가 값을 바꾸면 같은 객체를 참조하는 모든 변수에 영향을 미친다. String Pool의 공유 메커니즘이 완전히 무너지는 것이다.

### 2. hashCode 캐싱으로 성능 최적화

String은 hashCode를 한 번만 계산하고 캐싱한다. OpenJDK 소스를 보면 이렇게 구현되어 있다.

```java
public final class String {
    private int hash; // 기본값 0
    private boolean hashIsZero; // 실제 hash가 0인 경우 구분용
    
    public int hashCode() {
        int h = hash;
        if (h == 0 && !hashIsZero) {
            // s[0]*31^(n-1) + s[1]*31^(n-2) + ... + s[n-1]
            for (int i = 0; i < value.length; i++) {
                h = 31 * h + value[i];
            }
            if (h == 0) {
                hashIsZero = true;
            } else {
                hash = h;
            }
        }
        return h;
    }
}
```

불변이기 때문에 내용이 바뀔 일이 없고, 따라서 hashCode도 절대 변하지 않는다. HashMap이나 HashSet에서 String을 키로 사용할 때 매번 해시를 계산할 필요가 없어 성능이 향상된다.

`hashIsZero` 필드가 있는 이유는 실제로 해시 값이 0인 문자열이 존재할 수 있기 때문이다. 이 플래그가 없으면 해시 값이 0인 문자열은 매번 재계산하게 된다.

### 3. 스레드 안전성

불변 객체는 본질적으로 스레드 안전하다. 여러 스레드가 동시에 같은 String 객체를 읽어도 동기화가 필요 없다. 누구도 그 값을 바꿀 수 없기 때문이다.

```java
public class SharedString {
    // 동기화 없이도 안전
    private final String sharedData = "공유 데이터";
    
    public String getData() {
        return sharedData; // 안전하게 공유 가능
    }
}
```

### 4. 보안

데이터베이스 연결 문자열, 네트워크 호스트 정보, 비밀번호 등 민감한 정보가 String으로 전달될 때가 많다. 불변이기 때문에 전달 과정에서 값이 조작될 위험이 없다.

```java
// 이런 상황을 방지
String username = "admin";
String password = "secret123";

// 만약 String이 가변이라면 중간에 누군가 값을 바꿀 수 있음
authenticateUser(username, password);
```

단, 보안상 이유로 비밀번호는 String보다 `char[]`를 사용하는 것이 권장된다. String은 메모리에서 제거할 방법이 없지만 `char[]`는 사용 후 명시적으로 값을 지울 수 있기 때문이다.

### 5. ClassLoader 안전성

Java의 ClassLoader는 클래스 이름을 String으로 받는다. 불변성 덕분에 올바른 클래스가 로드되는 것을 보장할 수 있다.

```java
ClassLoader.loadClass("com.example.MyClass");
// 이 문자열이 중간에 바뀌면 잘못된 클래스를 로드할 수 있음
```

## String Pool의 동작 원리

### 리터럴 vs new 키워드

String을 생성하는 방법은 크게 두 가지다.

```java
// 방법 1: 문자열 리터럴 (String Pool 사용)
String s1 = "hello";
String s2 = "hello";

// 방법 2: new 키워드 (Heap 사용)
String s3 = new String("hello");
String s4 = new String("hello");

System.out.println(s1 == s2); // true - 같은 객체
System.out.println(s3 == s4); // false - 다른 객체
System.out.println(s1 == s3); // false - 다른 메모리 영역
```

**리터럴 방식**

JVM이 String Pool에서 같은 값을 찾는다. 있으면 그 참조를 반환하고, 없으면 Pool에 새로 추가한 뒤 참조를 반환한다.

**new 키워드 방식**

항상 Heap에 새로운 객체를 생성한다. Pool을 확인하지 않는다.

### intern() 메서드

`intern()` 메서드는 new로 생성한 String을 String Pool에 추가하거나, 이미 있다면 Pool의 참조를 반환한다.

```java
String s1 = new String("hello");  // Heap
String s2 = s1.intern();          // String Pool로 이동
String s3 = "hello";              // String Pool

System.out.println(s1 == s2); // false - s1은 Heap, s2는 Pool
System.out.println(s2 == s3); // true - 둘 다 Pool의 같은 객체
System.out.println(s1.equals(s2)); // true - 내용은 같음
```

Oracle 공식 문서에 따르면 "for any two strings s and t, s.intern() == t.intern() is true if and only if s.equals(t) is true"라고 명시되어 있다.

### String Pool의 위치 변화

**Java 6 이전:** String Pool이 PermGen(영구 세대)에 있었다. 크기가 고정되어 있고 GC 대상이 아니었다. 많은 문자열을 intern()하면 OutOfMemoryError가 발생하기 쉬웠다.

**Java 7 이후:** String Pool이 Heap으로 이동했다. GC가 관리하게 되어 참조되지 않는 문자열은 자동으로 제거된다. 메모리 효율이 크게 개선되었다.

### intern() 사용 시 주의사항

String Pool은 JVM이 관리하는 특별한 영역이다. 무분별하게 intern()을 사용하면 Pool이 비대해져서 오히려 성능이 떨어질 수 있다.

```java
// 안티패턴: 동적으로 생성되는 문자열을 intern()
for (int i = 0; i < 1000000; i++) {
    String s = ("user_" + i).intern(); // Pool이 비대해짐
}

// 좋은 패턴: 반복적으로 사용되는 고정 문자열만 intern()
String status1 = new String("ACTIVE").intern();
String status2 = new String("ACTIVE").intern();
// status1 == status2 (true)
```

## StringBuilder vs StringBuffer

String은 불변이기 때문에 문자열을 여러 번 연결하면 매번 새 객체가 생성된다. 이럴 때 가변적인 StringBuilder나 StringBuffer를 사용한다.

### 핵심 차이: 동기화

**StringBuffer:** 모든 메서드가 `synchronized`로 선언되어 있다. 멀티스레드 환경에서 안전하지만 동기화 오버헤드가 있다.

**StringBuilder:** 동기화가 없다. 싱글스레드 환경에서 더 빠르다.

```java
// StringBuffer - 스레드 안전
public final class StringBuffer {
    public synchronized StringBuffer append(String str) {
        // ...
    }
}

// StringBuilder - 스레드 안전하지 않음
public final class StringBuilder {
    public StringBuilder append(String str) {
        // synchronized 없음
    }
}
```

### 성능 비교

Oracle 공식 문서에 따르면 "StringBuilder provides an API compatible with StringBuffer, but with no guarantee of synchronization"이라고 명시한다.

단일 스레드 환경에서는 StringBuilder가 빠르다. 하지만 실제로 작은 반복문에서는 성능 차이가 미미할 수 있다.

```java
// 벤치마크 예시
// StringBuilder: 약 50ms
// StringBuffer: 약 65ms (약 30% 느림)
for (int i = 0; i < 100000; i++) {
    builder.append("test");
}
```

### 언제 무엇을 쓸까?

**String:** 불변성이 필요하거나 문자열이 거의 변경되지 않을 때

```java
String name = "John";
String greeting = "Hello, " + name; // 한두 번 연결은 괜찮음
```

**StringBuilder:** 싱글스레드에서 문자열을 많이 조작할 때 (대부분의 경우)

```java
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 1000; i++) {
    sb.append("line ").append(i).append("\n");
}
String result = sb.toString();
```

**StringBuffer:** 멀티스레드에서 여러 스레드가 같은 문자열을 수정할 때

```java
StringBuffer buffer = new StringBuffer();
// 여러 스레드가 동시에 접근
thread1.start(() -> buffer.append("A"));
thread2.start(() -> buffer.append("B"));
```

단, 대부분의 경우 StringBuilder를 사용하고 필요하면 외부에서 동기화하는 것이 더 효율적이다.

### StringBuilder 내부 버퍼 확장

StringBuilder는 내부적으로 `byte[]` 배열(Java 9+)을 사용한다. 버퍼가 부족하면:

1. **새 버퍼 생성**: 기존 용량의 2배 + 2 (`oldCapacity * 2 + 2`)
2. **기존 데이터 복사**: `System.arraycopy()`로 새 버퍼에 복사
3. **새 데이터 추가**: 복사된 데이터 뒤에 append

```java
// AbstractStringBuilder.java 내부 로직 (단순화)
private void ensureCapacityInternal(int minimumCapacity) {
    int oldCapacity = value.length;
    if (minimumCapacity > oldCapacity) {
        int newCapacity = (oldCapacity * 2) + 2;
        if (newCapacity < minimumCapacity) {
            newCapacity = minimumCapacity;
        }
        value = Arrays.copyOf(value, newCapacity);
    }
}
```

초기 용량을 예측 가능하면 생성자에서 지정하는 게 좋다:

```java
// 기본 용량 16
StringBuilder sb = new StringBuilder();

// 예상 크기가 크면 미리 지정 (확장 횟수 줄임)
StringBuilder sb = new StringBuilder(1000);
```

확장이 발생하면 `arraycopy` 비용이 들기 때문에, 대용량 문자열 처리 시 초기 용량 설정이 성능에 영향을 줄 수 있다.

### StringBuffer가 느린 진짜 이유

StringBuffer가 느린 이유는 단순히 락 획득/해제 비용만이 아니다. **메모리 동기화** 비용이 추가된다.

![빌더 vs 버퍼](./builder.png)

synchronized 없이는 CPU 캐시에서 메인 메모리로의 flush 시점을 JVM과 CPU가 알아서 결정한다. 캐시 라인이 꽉 찼을 때, 다른 CPU가 같은 메모리에 접근할 때 등 **예측 불가능한 시점**에 일어난다.

synchronized는 **락 경계에서 강제로** 동기화를 수행한다. 락 획득 시 메인 메모리에서 읽고, 락 해제 시 메인 메모리로 flush한다. 이 과정이 성능 오버헤드를 만든다.

## String 연결 연산의 내부 동작

### Java 8 이전: StringBuilder로 변환

컴파일러가 String 연결 연산자 `+`를 StringBuilder로 자동 변환했다.

```java
// 소스 코드
String result = "a" + "b" + c + "d";

// 컴파일 후 바이트코드 (개념적으로)
String result = new StringBuilder()
    .append("a")
    .append("b")
    .append(c)
    .append("d")
    .toString();
```

### Java 9 이후: invokedynamic 최적화 (JEP 280)

JDK 9부터는 `invokedynamic`과 `StringConcatFactory`를 사용해서 문자열 연결을 처리한다.

**핵심 개념**

컴파일 시점에 연결 방식을 고정하지 않고, 런타임에 JVM이 최적의 전략을 선택할 수 있게 한다.

```java
// 소스 코드
String result = "Hello " + name + "!";

// 바이트코드 (invokedynamic 사용)
invokedynamic #0, makeConcatWithConstants:(String)String
```

**StringConcatFactory 전략**

JVM이 상황에 따라 다른 전략을 선택한다.

- `BC_SB`: Java 8과 동일하게 StringBuilder 사용
- `BC_SB_SIZED`: StringBuilder의 초기 크기를 추정
- `BC_SB_SIZED_EXACT`: StringBuilder의 정확한 크기 계산
- `MH_SB_SIZED`: MethodHandle 기반, 크기 추정
- `MH_SB_SIZED_EXACT`: MethodHandle 기반, 정확한 크기
- `MH_INLINE_SIZED_EXACT`: byte 배열 직접 생성 (기본값, 가장 빠름)

기본 전략인 `MH_INLINE_SIZED_EXACT`는 StringBuilder를 거치지 않고 최종 크기의 byte 배열을 직접 생성한다. 3~4배 정도 성능 향상이 있다.

**StringBuilder vs invokedynamic 비교**

| | StringBuilder (Java 8) | invokedynamic (Java 9+) |
|--|------------------------|-------------------------|
| 중간 객체 | StringBuilder 인스턴스 생성 | 없음 |
| 버퍼 크기 | 16에서 시작, 필요시 확장 | 정확한 크기로 한 번 할당 |
| 메모리 복사 | 버퍼 확장 시 추가 복사 | 최소 1회 |

```
StringBuilder 방식 (Java 8):
new StringBuilder() → append("Hello, ") → append(name) → append("!") → toString()
                 ↓              ↓                                           ↓
            버퍼 생성      버퍼 확장 가능성                                 최종 String 생성

invokedynamic 방식 (Java 9+):
크기 계산 → byte[정확한 크기] 할당 → 직접 복사 → String 생성
                      ↓
               중간 객체 없음, 버퍼 확장 없음
```

**Recipe 시스템**

StringConcatFactory는 "recipe"라는 개념을 사용한다.

```java
String result = "Person: " + firstName + " " + lastName;

// Recipe: "Person: \u0001 \u0001"
// \u0001은 변수 위치를 나타냄
// "Person: "과 " "는 상수
```

컴파일러가 템플릿을 만들고, 런타임에 변수 값을 채워 넣는다.

**바이트코드 크기 감소**

기존 StringBuilder 방식은 append() 호출마다 바이트코드가 필요했다. invokedynamic은 하나의 명령어로 처리되어 바이트코드가 훨씬 작아진다.

### 상수 폴딩 (Constant Folding)

컴파일 타임에 상수끼리의 연결은 미리 계산된다.

```java
// 소스 코드
String s = "Hello" + " " + "World";

// 컴파일 후
String s = "Hello World"; // 이미 합쳐짐
```

바이트코드를 확인하면 상수 풀에 "Hello World"가 하나만 들어가 있다.

### 명시적 StringBuilder 사용 시 주의

JEP 280 이후로는 단순한 문자열 연결은 그냥 `+`를 쓰는 게 더 낫다. 컴파일러가 알아서 최적화한다.

```java
// 이렇게 쓰면 JEP 280 최적화를 못 받음
StringBuilder sb = new StringBuilder();
sb.append("Hello ").append(name).append("!");
String result = sb.toString();

// 이렇게 쓰면 컴파일러가 최적화
String result = "Hello " + name + "!";
```

단, 반복문 안에서는 여전히 명시적으로 StringBuilder를 쓰는 게 낫다.

```java
// 나쁜 예
String result = "";
for (int i = 0; i < 1000; i++) {
    result += "line " + i; // 매번 새 객체 생성
}

// 좋은 예
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 1000; i++) {
    sb.append("line ").append(i);
}
String result = sb.toString();
```

## == vs equals()

### == 연산자: 참조 비교 (Identity)

메모리 주소를 비교한다. 두 참조가 정확히 같은 객체를 가리키는지 확인한다.

```java
String s1 = "hello";
String s2 = "hello";
String s3 = new String("hello");

System.out.println(s1 == s2); // true (String Pool의 같은 객체)
System.out.println(s1 == s3); // false (다른 메모리 위치)
```

### equals() 메서드: 내용 비교 (Equality)

실제 문자 내용을 비교한다. String 클래스가 Object.equals()를 오버라이드해서 구현한다.

```java
public boolean equals(Object anObject) {
    if (this == anObject) {
        return true; // 같은 객체면 빠르게 리턴
    }
    if (anObject instanceof String) {
        String aString = (String)anObject;
        // Java 8: char 배열 비교
        // Java 11: coder 확인 후 Latin1 또는 UTF16 비교
        return // ... 문자 하나씩 비교
    }
    return false;
}
```

**Java 8 vs Java 11 구현 차이**

**Java 8:** 길이를 먼저 비교하고, 같으면 char 배열을 하나씩 비교한다.

**Java 11:** Compact Strings 기능이 추가되면서 coder를 확인한다. Latin-1로 인코딩 가능하면 `StringLatin1.equals()`, 아니면 `StringUTF16.equals()`를 호출한다.

```java
String s1 = new String("hello");
String s2 = new String("hello");

System.out.println(s1 == s2);      // false - 다른 객체
System.out.println(s1.equals(s2)); // true - 내용이 같음
```

### 주의할 점

```java
// 잘못된 비교
String input = getUserInput();
if (input == "admin") { // 버그! 항상 false일 수 있음
    grantAdminAccess();
}

// 올바른 비교
if ("admin".equals(input)) { // input이 null이어도 안전
    grantAdminAccess();
}

// 또는
if (input != null && input.equals("admin")) {
    grantAdminAccess();
}
```

상수를 먼저 쓰는 패턴("admin".equals(input))은 NullPointerException을 방지한다.

## 바이트코드로 확인하기

실제로 javac가 어떻게 최적화하는지 확인해보자.

```java
// Example.java
public class Example {
    public String concat1() {
        return "Hello " + "World"; // 상수 폴딩
    }
    
    public String concat2(String name) {
        return "Hello " + name; // invokedynamic
    }
    
    public String concat3() {
        String result = "";
        for (int i = 0; i < 10; i++) {
            result += i; // 비효율적
        }
        return result;
    }
}
```

바이트코드 확인:

```bash
javac Example.java
javap -c -v Example.class
```

**concat1()의 바이트코드**

```
0: ldc #7  // String "Hello World"
2: areturn
```

컴파일 타임에 이미 "Hello World"로 합쳐져 있다.

**concat2()의 바이트코드 (Java 9+)**

```
0: aload_1
1: invokedynamic #7,  0  // InvokeDynamic #0:makeConcatWithConstants:(Ljava/lang/String;)Ljava/lang/String;
6: areturn
```

invokedynamic을 사용해서 런타임에 최적화한다.

**concat3()의 바이트코드**

반복문 안에서 매번 새로운 String 객체가 생성된다. 바이트코드가 매우 길고 비효율적이다.

## 성능 최적화 팁

### 1. 문자열 연결은 상황에 맞게

```java
// 한두 번 연결: + 연산자 (간단하고 읽기 쉬움)
String greeting = "Hello, " + name + "!";

// 반복문: StringBuilder
StringBuilder sb = new StringBuilder();
for (Item item : items) {
    sb.append(item.getName()).append(", ");
}
String result = sb.toString();

// 스트림: Collectors.joining()
String result = items.stream()
    .map(Item::getName)
    .collect(Collectors.joining(", "));
```

### 2. intern()은 신중하게

```java
// 나쁜 예: 모든 문자열을 intern()
String dynamic = (prefix + id).intern(); // Pool 오염

// 좋은 예: 제한된 집합의 문자열만 intern()
enum Status { ACTIVE, INACTIVE, PENDING }
// enum 상수는 자동으로 인턴됨
```

### 3. StringBuilder 초기 크기 설정

```java
// 크기를 모를 때 (기본 16)
StringBuilder sb = new StringBuilder();

// 대략적인 크기를 알 때
StringBuilder sb = new StringBuilder(1000);

// 정확한 크기를 알 때
int size = calculateExactSize();
StringBuilder sb = new StringBuilder(size);
```

초기 크기를 설정하면 내부 배열 재할당을 피할 수 있다.

### 4. String Pool 크기 조정

JVM 옵션으로 String Pool 크기를 조정할 수 있다.

```bash
# 기본값: 60013 (Java 8+)
java -XX:+PrintStringTableStatistics YourApp

# 크기 조정 (예: 100만)
java -XX:StringTableSize=1000000 YourApp
```

대량의 고유 문자열을 다루는 애플리케이션에서 유용하다.

## 정리

**String의 불변성**

- String Pool을 통한 메모리 절약
- hashCode 캐싱으로 HashMap 성능 향상
- 스레드 안전성 보장
- 보안 강화

**String Pool**

- 리터럴은 자동으로 Pool에 저장
- new 키워드는 Heap에 생성
- intern()으로 수동 추가 가능
- Java 7부터 Heap으로 이동하여 GC 가능

**StringBuilder vs StringBuffer**

- StringBuilder: 싱글스레드에서 빠름
- StringBuffer: 멀티스레드에서 안전
- 대부분의 경우 StringBuilder 사용

**String 연결 최적화**

- Java 9+: invokedynamic으로 자동 최적화
- 상수 폴딩으로 컴파일 타임 최적화
- 반복문에서는 명시적으로 StringBuilder 사용

**비교 연산**

- ==: 참조 비교 (같은 객체인가?)
- equals(): 내용 비교 (같은 값인가?)
- 문자열 비교는 항상 equals() 사용

Java String은 단순해 보이지만 JVM의 다양한 최적화 기법이 적용된 복잡한 클래스다. 이 원리들을 이해하면 더 효율적인 코드를 작성할 수 있다.
