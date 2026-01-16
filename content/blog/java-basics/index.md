---
title: "Java 기초 문법"
date: "2025-09-20"
description: "원시 타입, 참조 타입, 접근 제어자, static, 오버라이딩/오버로딩, 인터페이스와 추상클래스까지 JLS 기반으로 정리합니다."
category: "개발"
tags: ["Java", "JVM", "OOP"]
---

## 원시 타입 (Primitive Types)

Java는 8가지 원시 타입을 제공한다. JLS Chapter 4에 정의되어 있다.

| 타입 | 크기 | 범위 | 기본값 |
|------|------|------|--------|
| `byte` | 1 byte | -128 ~ 127 | 0 |
| `short` | 2 bytes | -32,768 ~ 32,767 | 0 |
| `int` | 4 bytes | -2^31 ~ 2^31-1 | 0 |
| `long` | 8 bytes | -2^63 ~ 2^63-1 | 0L |
| `float` | 4 bytes | IEEE 754 | 0.0f |
| `double` | 8 bytes | IEEE 754 | 0.0d |
| `char` | 2 bytes | 0 ~ 65,535 (UTF-16) | '\u0000' |
| `boolean` | 1 byte* | true/false | false |

**boolean 크기**: JLS는 boolean의 정확한 크기를 명시하지 않는다. JVM 구현상 **배열에서는 1 byte**, **스택에서는 32비트 슬롯 단위**로 할당된다.

**JVM 스택 슬롯 구조**

JVM 스택은 **슬롯(slot) 단위**로 동작하며, 한 슬롯이 32비트다. boolean도 한 슬롯을 차지하지만, 실제로 32비트를 **다 쓰는 건 아니다**. JVM이 내부적으로 최적화할 수 있다.

```
JVM 스택 슬롯:
┌─────────────────────────────┐
│  boolean (1bit~1byte 사용)   │ ← 32비트 슬롯 하나 차지
└─────────────────────────────┘
```

**Word Tearing 문제**

CPU는 메모리를 바이트 단위가 아닌 **word 단위**(32비트 또는 64비트)로 읽고 쓴다. 만약 boolean을 1바이트로 저장하면, 인접한 4개의 boolean이 하나의 word에 들어간다.

```
메모리:  [a][b][c][d]  ← 4개의 boolean (각 1바이트)
        └─────────┘
        CPU는 이걸 한 덩어리로 읽음
```

스레드 A가 `a`를 수정하고, 스레드 B가 `b`를 수정할 때:

1. 스레드 A: word 전체 읽기 → `a` 변경 → word 전체 쓰기
2. 스레드 B: word 전체 읽기 → `b` 변경 → word 전체 쓰기

두 스레드가 동시에 실행되면, 한쪽의 변경이 덮어씌워질 수 있다. 이게 **word tearing**(단어 찢어짐)이다.

**배열은 왜 1바이트?**: 배열은 대량 데이터를 저장하므로 메모리 효율이 더 중요하다. 

대신 멀티스레드 환경에서 인접한 요소에 동시 접근하면 word tearing이 발생할 수 있다. 

이런 경우 `AtomicIntegerArray`를 사용해야 한다.

### 기본값이 적용되는 경우 (JLS 4.12.5)

```java
public class Example {
    static int staticField;      // 0으로 초기화
    int instanceField;           // 0으로 초기화
    int[] array = new int[10];   // 모든 요소 0으로 초기화

    void method() {
        int localVar;            // 초기화 안 됨 - 사용 시 컴파일 에러
        // System.out.println(localVar);  // 컴파일 에러
    }
}
```

기본값은 **클래스 변수(static), 인스턴스 변수, 배열 요소**에만 적용된다. 지역 변수는 명시적 초기화 없이 사용하면 컴파일러가 **Definite Assignment** 규칙으로 에러를 발생시킨다.

---

## 원시 타입 vs 참조 타입

### 메모리 저장 방식

```java
int primitive = 42;        // 스택에 4 bytes (값 직접 저장)
Integer wrapper = 42;      // 스택에 참조(4-8 bytes) + 힙에 객체(16-28 bytes)
```

| 구분 | 원시 타입 | 참조 타입 |
|------|----------|----------|
| 저장 위치 | 스택 (값 직접) | 스택 (참조) + 힙 (객체) |
| 메모리 | 타입 크기만큼 | 객체 헤더 + 값 + 패딩 |
| null 가능 | 불가능 | 가능 |
| 제네릭 사용 | 불가능 | 가능 |

### 박싱/언박싱 성능 문제

```java
// Bad - 매 반복마다 박싱/언박싱 발생
Long sum = 0L;
for (long i = 0; i < Integer.MAX_VALUE; i++) {
    sum += i;  // 언박싱 → 연산 → 박싱
}

// Good - 원시 타입 사용
long sum = 0L;
for (long i = 0; i < Integer.MAX_VALUE; i++) {
    sum += i;
}
```

**성능 차이**: **원시 타입이 래퍼 클래스보다 빠르다**. 

**메모리 차이**: Integer는 int 대비 약 **7배 메모리** 소비 (16-28 bytes vs 4 bytes). 


### Integer Cache (-128 ~ 127)

```java
Integer a = 127;
Integer b = 127;
System.out.println(a == b);  // true (같은 객체)

Integer c = 128;
Integer d = 128;
System.out.println(c == d);  // false (다른 객체)
```

JLS는 `-128 ~ 127` 범위의 autoboxing에서 캐시된 객체를 재사용하도록 명시한다.

**JDK 구현** (`java.lang.Integer`):

```java
private static class IntegerCache {
    static final int low = -128;
    static final int high;  // 기본 127, 설정 가능
    static final Integer[] cache;

    static {
        int h = 127;
        String prop = VM.getSavedProperty("java.lang.Integer.IntegerCache.high");
        if (prop != null) {
            int i = parseInt(prop);
            i = Math.max(i, 127);
            h = Math.min(i, Integer.MAX_VALUE - (-low) - 1);
        }
        high = h;
        cache = new Integer[(high - low) + 1];
        int j = low;
        for (int k = 0; k < cache.length; k++)
            cache[k] = new Integer(j++);
    }
}

public static Integer valueOf(int i) {
    if (i >= IntegerCache.low && i <= IntegerCache.high)
        return IntegerCache.cache[i + (-IntegerCache.low)];
    return new Integer(i);
}
```

- autoboxing은 내부적으로 `valueOf()`를 호출하므로 캐시 혜택
- `new Integer(i)`는 캐시를 사용하지 않음 (deprecated)
- 상한값은 JVM 옵션으로 조정 가능: `-XX:AutoBoxCacheMax=<size>`

---

## 접근 제어자 (Access Modifiers)

JLS 6.6에 정의된 4가지 접근 제어자.

| 접근 제어자 | 같은 클래스 | 같은 패키지 | 다른 패키지 서브클래스 | 모든 곳 |
|------------|:---------:|:---------:|:------------------:|:-----:|
| `private` | O | X | X | X |
| default | O | O | X | X |
| `protected` | O | O | O (제한적) | X |
| `public` | O | O | O | O |

### default (package-private)

명시적 접근 제어자가 없는 경우. JLS에서는 **package access**라고 부른다.

```java
// package com.example.p1
class DefaultClass {         // package-private 클래스
    int defaultField;        // package-private 필드
    void defaultMethod() {}  // package-private 메서드
}

// package com.example.p2
class Other {
    void test() {
        DefaultClass obj = new DefaultClass();  // 컴파일 에러
    }
}
```

### protected의 특수한 동작 (JLS 6.6.2)

다른 패키지의 서브클래스에서 protected 멤버에 접근할 때는 **제한**이 있다.

```java
// package p1
public class Parent {
    protected int x;
}

// package p2
public class Child extends Parent {
    void test(Parent p, Child c, Sibling s) {
        this.x = 10;  // OK - this는 Child 타입
        c.x = 10;     // OK - Child 타입 참조
        p.x = 10;     // 컴파일 에러 - Parent 타입 참조
        s.x = 10;     // 컴파일 에러 - 형제 서브클래스
    }
}

class Sibling extends Parent {}
```

**핵심**: protected 멤버는 **해당 객체의 구현에 책임이 있는 코드**에서만 접근 가능하다. 서브클래스가 자신의 타입(또는 하위 타입) 참조를 통해서만 접근할 수 있다.

### 클래스 레벨 vs 멤버 레벨

**최상위 클래스**: `public`, `default`만 사용 가능

```java
public class PublicClass {}      // OK
class PackagePrivateClass {}     // OK
private class PrivateClass {}    // 컴파일 에러
protected class ProtectedClass {} // 컴파일 에러
```

**멤버 레벨**(필드, 메서드, 내부 클래스): 4가지 모두 사용 가능

```java
public class Outer {
    private class PrivateInner {}     // OK
    protected class ProtectedInner {} // OK
}
```

---

## static 키워드

### 메모리 저장 위치

| Java 버전 | 저장 위치 |
|----------|----------|
| Java 7 이전 | PermGen (Method Area) |
| Java 8 이후 | **Heap** (Metaspace는 클래스 메타데이터만) |

static 변수는 **모든 스레드가 공유**하며, JVM 프로세스 생명주기 동안 유지된다.

### 초기화 순서 (JLS 12.4)

```java
public class InitOrder {
    // 1. final static 상수 (컴파일 타임 상수)
    static final int CONSTANT = 100;

    // 2. static 필드와 static 블록은 소스코드 순서대로
    static int value1 = getValue("value1");  // 2번째

    static {
        System.out.println("static block 1");  // 3번째
    }

    static int value2 = getValue("value2");  // 4번째

    static {
        System.out.println("static block 2");  // 5번째
    }

    static int getValue(String name) {
        System.out.println("Initializing " + name);
        return 0;
    }
}

// 출력:
// Initializing value1
// static block 1
// Initializing value2
// static block 2
```

**상속 계층에서의 초기화**: Object -> 부모 클래스 -> 현재 클래스 순서

### 클래스 초기화 트리거 (Active Use)

Java는 클래스를 **프로그램 시작 시 미리 다 올리지 않는다**. 처음 사용할 때 로딩한다(Lazy Loading).

"객체 없이 static에 접근 가능하다"는 건 **사용 방법**이고, "클래스 로딩 시점"은 **언제 메모리에 올라가느냐**다. 접근하는 순간 클래스가 없으면 그때 올리고, 있으면 바로 접근한다.

아래 6가지 경우에 클래스가 메모리에 올라간다.

```java
// 1. 새 인스턴스 생성
new MyClass();

// 2. static 메서드 호출
MyClass.staticMethod();

// 3. non-constant static 필드 접근 (아래 설명 참고)
MyClass.staticField;

// 4. 리플렉션 API
Class.forName("MyClass");

// 5. 하위 클래스 초기화
class Child extends Parent {}  // Parent도 초기화

// 6. JVM 시작 시 초기 클래스
// java MainClass
```

이때 static 블록도 실행된다.

**왜 constant는 클래스 로딩을 트리거하지 않는가?**

```java
public class MyClass {
    static final int CONSTANT = 100;       // 컴파일 타임 상수
    static int nonConstant = 100;          // non-constant

    // 이것도 non-constant -> 이건 실행해봐야 알기에 복사 안 됨.
    static final int RUNTIME = getNumber(); 
}

// 다른 클래스에서
int x = MyClass.CONSTANT;     // 클래스 로딩 안 됨 - 컴파일러가 100으로 대체
int y = MyClass.nonConstant;  // 클래스 로딩됨 - 런타임에 값 필요
```

`static final` + **리터럴 값**은 컴파일러가 사용하는 곳에 값을 직접 복사한다. 런타임에 MyClass를 찾을 필요가 없다.

### static 메서드에서 this를 사용할 수 없는 이유

```java
public class Example {
    int instanceField;  // 객체가 있어야 존재

    public static void staticMethod() {
        // this.instanceField;  // 컴파일 에러
    }
}

// 호출 시점을 보면 이해됨
Example.staticMethod();  // 객체 없이 호출
// 이 시점에 instanceField는 어디에도 없음 -> this가 가리킬 대상이 없음
```

`this`는 "현재 객체"를 가리킨다. 그런데 static 메서드는 객체 없이 호출할 수 있다. 객체가 없는데 "현재 객체"가 있을 수 없다.

### Lazy Initialization Holder 패턴

JLS 12.4.2를 활용한 스레드 안전 싱글톤 패턴.

**기존 Eager 방식의 문제**

```java
public class Singleton {
    private static final Singleton INSTANCE = new Singleton();  // 클래스 로딩 시 바로 생성

    private Singleton() {}

    public static Singleton getInstance() {
        return INSTANCE;
    }
}
```

`Singleton` 클래스가 로딩되는 순간 객체가 생성된다. `getInstance()`를 한 번도 안 불러도 메모리를 점유한다.

**LazyHolder 방식**

```java
public class Singleton {
    private Singleton() {}

    private static class LazyHolder {
        static final Singleton INSTANCE = new Singleton();
    }

    public static Singleton getInstance() {
        return LazyHolder.INSTANCE;  // 이때 LazyHolder 초기화
    }
}
```

**왜 중첩 클래스를 사용하는가?**

중첩 클래스는 별도의 `.class` 파일로 컴파일된다.

```
Singleton.class        // Singleton 클래스
Singleton$LazyHolder.class  // LazyHolder 클래스 (별도 파일)
```

JVM 입장에서 `Singleton`과 `Singleton$LazyHolder`는 완전히 다른 클래스다. `Singleton`이 로딩돼도 `LazyHolder`는 안 올라간다.

| 요소 | 로딩 시점 |
|-----|---------|
| static 필드 | 바깥 클래스 로딩 시 |
| static 블록 | 바깥 클래스 로딩 시 |
| **중첩 클래스** | **해당 클래스 첫 사용 시** |

**왜 static 중첩 클래스여야 하는가?**

```java
public class Singleton {
    private Singleton() {}

    private class LazyHolder {  // static 없음
        final Singleton INSTANCE = new Singleton();
    }

    public static Singleton getInstance() {
        // LazyHolder를 만들려면 Singleton 인스턴스가 필요
        // 근데 Singleton 인스턴스가 아직 없음 (싱글톤이니까)
        // 컴파일 에러!
    }
}
```

non-static 내부 클래스는 바깥 객체가 먼저 있어야 생성 가능하다.

바깥 객체(Singleton)가 바로 우리가 막으려는 그 객체인데, 바깥 객체 없이 접근하려면 static이어야 한다.

| | static 중첩 클래스 | non-static 내부 클래스 |
|--|------------------|---------------------|
| 바깥 인스턴스 필요 | X | O |
| static 메서드에서 접근 | O | X |
| 바깥 객체 참조 | 없음 | 숨겨진 `Outer.this` 있음 |

### static vs non-static 중첩 클래스

**웬만하면 static으로 만든다**.

**non-static 내부 클래스의 메모리 누수 문제**

```java
public class Outer {
    private String data;

    private class Inner {
        // 숨겨진 Outer.this 참조를 갖고 있음
    }

    public Inner createInner() {
        return new Inner();
    }
}

// 문제 상황
Outer outer = new Outer();
Outer.Inner inner = outer.createInner();
outer = null;  // Outer 해제하고 싶음
// 하지만 inner가 Outer.this를 들고 있어서 GC 안 됨 (메모리 누수)
```

**static을 기본으로 쓰는 이유**

| | static 중첩 클래스 | non-static 내부 클래스 |
|--|------------------|---------------------|
| 바깥 객체 참조 | 없음 | 숨겨진 참조 있음 |
| 메모리 누수 위험 | 없음 | 있음 |
| 인스턴스 크기 | 작음 | 참조 하나 더 있음 |

**non-static을 쓰는 경우**: 바깥 클래스의 인스턴스 필드에 자주 접근해야 할 때만

```java
// non-static이 자연스러운 경우: Iterator
public class MyList<E> {
    private E[] elements;

    private class MyIterator implements Iterator<E> {
        int cursor = 0;

        public E next() {
            return elements[cursor++];  // 바깥 필드에 직접 접근
        }
    }
}
```

**결론**: 바깥 인스턴스가 꼭 필요한 게 아니면 static으로 만들어라 (Effective Java 권장).

---

## 클래스와 객체

### 개념 정의

| 개념 | 설명 | 비유 |
|------|------|------|
| **클래스** | 객체의 설계도, 타입 정의 | 붕어빵 틀 |
| **객체** | 클래스를 기반으로 생성된 실체 | 붕어빵 |
| **인스턴스** | 특정 클래스의 객체임을 강조 | "이 붕어빵은 팥 붕어빵 틀의 인스턴스" |

```java
// 클래스 정의 (설계도)
public class Car {
    String model;
    int speed;

    void accelerate() {
        speed += 10;
    }
}

// 객체 생성 (실체화)
Car myCar = new Car();  // myCar는 Car 클래스의 인스턴스
```

### 메모리 관점

```java
Car car1 = new Car();
Car car2 = new Car();
```

- **클래스 메타데이터**: Metaspace에 한 번만 로드
- **객체**: Heap에 각각 생성 (car1, car2는 서로 다른 메모리 주소)
- **참조 변수**: 스택에 저장 (Heap의 객체 주소를 가리킴)

---

## 오버라이딩과 오버로딩

### 오버로딩 (Overloading) 

**같은 이름, 다른 시그니처**로 메서드를 정의.

```java
public class Calculator {
    int add(int a, int b) { return a + b; }
    double add(double a, double b) { return a + b; }
    int add(int a, int b, int c) { return a + b + c; }
}
```

**메서드 시그니처** : 메서드 이름 + 파라미터 타입

시그니처에 **포함되지 않는 것**:
- 반환 타입
- 예외 타입
- 접근 제어자

```java
// 컴파일 에러 - 시그니처가 같음
int process(int x) { return x; }
double process(int x) { return x; }  // 반환 타입만 다름
```

**바인딩 시점**: **컴파일 타임** (정적 바인딩)

바인딩이란 메서드 호출 코드와 실제 실행될 메서드를 연결하는 것이다.

오버로딩은 파라미터 타입만 보면 어떤 메서드인지 알 수 있다. 실행 전에 결정 가능하다.

```java
calc.add(1, 2);      // 컴파일러: "int, int니까 add(int, int) 호출"
calc.add(1.0, 2.0);  // 컴파일러: "double, double이니까 add(double, double) 호출"
```

### 오버라이딩 (Overriding) - JLS 8.4.8

**상위 클래스의 메서드를 하위 클래스에서 재정의**.

```java
class Animal {
    void sound() { System.out.println("..."); }
}

class Dog extends Animal {
    @Override
    void sound() { System.out.println("Bark"); }
}
```

**바인딩 시점**: **런타임** (동적 바인딩)

오버라이딩은 다형성 때문에 컴파일 타임에 결정할 수 없다. 실제 객체가 뭔지 런타임에 봐야 안다.

```java
Animal animal = new Dog();  // 변수 타입: Animal, 실제 객체: Dog
animal.sound();  // 뭐가 실행될까?

// 컴파일러: "Animal.sound() 호출하겠다" (변수 타입만 봄)
// 런타임: "어? 실제로는 Dog 객체네. Dog.sound() 실행" (실제 객체 봄)
```

| | 오버로딩 | 오버라이딩 |
|--|--------|----------|
| 결정 시점 | 컴파일 타임 | 런타임 |
| 결정 기준 | 파라미터 타입 | 실제 객체 타입 |
| 바인딩 | 정적 | 동적 |

### 오버라이딩 규칙

**1. 공변 반환 타입**(JLS 8.4.5)

Java 5부터 오버라이딩 메서드가 더 구체적인 반환 타입을 가질 수 있다.

```java
class Animal {
    Animal create() { return new Animal(); }
}

class Dog extends Animal {
    @Override
    Dog create() { return new Dog(); }  // OK - Dog은 Animal의 하위 타입
}
```

**2. 접근 제어자**

오버라이딩 메서드는 **더 넓은** 접근 범위를 가져야 한다.

```java
class Parent {
    protected void method() {}
}

class Child extends Parent {
    @Override
    public void method() {}     // OK - public > protected

    // @Override
    // private void method() {}  // 컴파일 에러 - private < protected
}
```

**3. 예외 처리**(JLS 11)

오버라이딩 메서드는 **같거나 더 좁은** 예외만 던질 수 있다.

```java
class Parent {
    void method() throws IOException {}
}

class Child extends Parent {
    @Override
    void method() throws FileNotFoundException {}  // OK - 하위 예외

    // @Override
    // void method() throws Exception {}  // 컴파일 에러 - 상위 예외
}
```

### @Override 애노테이션 (JLS 9.6.4.4)

```java
class Child extends Parent {
    @Override
    public void metohd() {}  // 컴파일 에러 - 오타, 실제로 오버라이드 아님
}
```

컴파일러가 실제로 오버라이드하는지 검증한다. **항상 사용하는 것을 권장**.

### 동적 바인딩 vs 정적 바인딩

```java
class Animal {
    void sound() { System.out.println("Animal"); }
    static void info() { System.out.println("Animal info"); }
}

class Dog extends Animal {
    @Override
    void sound() { System.out.println("Bark"); }
    static void info() { System.out.println("Dog info"); }
}

Animal animal = new Dog();
animal.sound();  // "Bark" - 동적 바인딩 (런타임에 Dog.sound() 호출)
animal.info();   // "Animal info" - 정적 바인딩 (컴파일 타임에 Animal.info() 결정)
```

| 구분 | 동적 바인딩 | 정적 바인딩 |
|------|-------------|------------|
| 결정 시점 | 런타임 | 컴파일 타임 |
| 기준 | 실제 객체 타입 | 참조 변수 타입 |
| 적용 대상 | 인스턴스 메서드 | static, private, final 메서드 |

**왜 static 메서드는 정적 바인딩인가?**

static 메서드는 **객체가 아니라 클래스에 속한다.** 오버라이딩은 객체 기반 다형성인데, static은 객체를 안 보니까 다형성이 적용될 여지가 없다.

```java
Animal animal = new Dog();
animal.info();  // 컴파일러: "animal의 타입이 Animal이네. Animal.info() 호출"
                // 실제 객체가 Dog인지 안 봄
```

자식 클래스에서 같은 이름의 static 메서드를 만들면 그건 **hiding**(숨김)이다. 부모 메서드를 "대체"하는 게 아니라 "가리는" 것이다.

```java
class Dog extends Animal {
    @Override  // 컴파일 에러! static 메서드는 오버라이드 불가
    static void info() { System.out.println("Dog info"); }
}
```

| | 오버라이딩 | 하이딩 |
|--|----------|-------|
| 대상 | 인스턴스 메서드 | static 메서드 |
| 동작 | 부모 메서드 대체 | 부모 메서드 숨김 |
| 바인딩 | 동적 (런타임) | 정적 (컴파일 타임) |

---

## 인터페이스와 추상클래스

### 인터페이스 암묵적 특성 (JLS 9.3, 9.4)

```java
public interface MyInterface {
    // 필드: 암묵적으로 public static final
    int CONSTANT = 100;
    // == public static final int CONSTANT = 100;

    // 메서드: 암묵적으로 public abstract
    void method();
    // == public abstract void method();
}
```

**왜 암묵적으로 public static final인가?**

| 키워드 | 이유 |
|--------|------|
| public | 인터페이스는 외부에 공개하는 계약이다. private이면 의미가 없다. |
| static | 인터페이스는 인스턴스를 만들 수 없다. 인스턴스가 없으니 인스턴스 필드도 없다. |
| final | 인터페이스는 계약이다. 구현체마다 값이 달라지면 계약이 깨진다. |

**인터페이스 메서드 제약**:
- `protected`, `package-private` 불가
- `final`, `synchronized`, `native` 불가 (구현 특성이므로)
- `abstract`, `default`, `static` 중 두 개 이상 동시 사용 불가

### Java 버전별 인터페이스 발전

| Java 버전 | 추가 기능 |
|----------|----------|
| Java 7 이전 | 상수 + 추상 메서드만 |
| **Java 8** | `default` 메서드, `static` 메서드 |
| **Java 9** | `private` 메서드 |

### default 메서드 (Java 8)

기존 인터페이스에 새 메서드를 추가해도 구현체가 깨지지 않도록 도입.

**왜 필요한가?**

Java 8 이전에는 인터페이스에 메서드를 추가하면 **모든 구현 클래스가 깨졌다.**

```java
// Java 7 시절
public interface List<E> {
    void add(E e);
    E get(int index);
    // ... 기존 메서드들
}

// 구현 클래스가 100개 있다고 가정
class MyList implements List<String> { ... }
class YourList implements List<Integer> { ... }
// ... 98개 더
```

여기에 `stream()` 메서드를 추가하고 싶다면?

```java
public interface List<E> {
    void add(E e);
    E get(int index);
    Stream<E> stream();  // 새로 추가
}
```

이 순간 **100개의 구현 클래스가 전부 컴파일 에러**가 난다. 모든 클래스에 `stream()` 구현을 추가해야 한다.

default 메서드는 이 문제를 해결한다.

```java
public interface List<E> {
    void add(E e);
    E get(int index);

    default Stream<E> stream() {
        // 기본 구현 제공
        return StreamSupport.stream(spliterator(), false);
    }
}
```

기본 구현이 있으니 **기존 100개 클래스는 아무것도 안 해도 된다.** 필요하면 오버라이드하면 된다.

### 다이아몬드 문제 해결

```java
interface A { default void m() { System.out.println("A"); } }
interface B { default void m() { System.out.println("B"); } }

class C implements A, B {
    @Override
    public void m() {
        A.super.m();  // A 인터페이스로부터 상속받은 m() 호출
        B.super.m();  // B 인터페이스로부터 상속받은 m() 호출
    }
}
```

**A.super 문법**

`A.super`는 "A의 부모"가 아니라 **A라는 경로를 통해 접근하는 super**다.

```java
// 클래스 상속: 부모가 하나라 super만 쓰면 됨
class Child extends Parent {
    void m() { super.m(); }  // 부모는 하나
}

// 인터페이스 다중 구현: super가 여러 개라 구분 필요
class C implements A, B {
    void m() {
        super.m();    // 컴파일 에러! A의 m()? B의 m()?
        A.super.m();  // A로부터 상속받은 m()
        B.super.m();  // B로부터 상속받은 m()
    }
}
```

이 문법은 JDK나 Spring 같은 라이브러리에서 거의 사용되지 않는다. 라이브러리 설계자들이 다이아몬드 문제가 생기는 상황 자체를 피하기 때문이다. 주로 면접 질문이나 개념 설명에서 등장한다.

**충돌 해결 규칙** (우선순위순):
1. **클래스가 인터페이스보다 우선**
2. **하위 인터페이스가 상위 인터페이스보다 우선**
3. **충돌 시 명시적 오버라이드 필수** (컴파일 에러)

### private 메서드 (Java 9)

default 메서드 간 코드 재사용을 위해 도입.

```java
interface Calculator {
    default int add(int a, int b) {
        return calculate(a, b, (x, y) -> x + y);
    }

    default int multiply(int a, int b) {
        return calculate(a, b, (x, y) -> x * y);
    }

    // 인터페이스 내부에서만 사용
    private int calculate(int a, int b, BiFunction<Integer, Integer, Integer> op) {
        return op.apply(a, b);
    }
}
```

### 추상클래스 vs 인터페이스

| 특성 | 추상클래스 | 인터페이스 |
|------|----------|----------|
| 관계 | **is-a** (A는 B이다) | **can-do** (A는 ~할 수 있다) |
| 상속 | 단일 상속 | 다중 구현 |
| 생성자 | 가능 | 불가능 |
| 필드 | 모든 접근 제어자 | public static final만 |
| 설계 목적 | 공통 구현 + 정체성 정의 | 능력/계약 정의 |

### 언제 무엇을 사용할까?

**추상클래스**:
- 관련 클래스들의 공통 베이스를 정의할 때
- 상태(필드)와 구현을 공유해야 할 때
- 예: `HttpServlet`, `AbstractList`

**인터페이스**:
- 클래스의 능력(capability)을 정의할 때
- 다중 구현이 필요할 때
- 느슨한 결합이 필요할 때
- 예: `Comparable`, `Serializable`, `Runnable`

### JDK 모범 사례: 골격 구현 패턴 (Effective Java Item 20)

**Skeletal Implementation** 패턴은 인터페이스와 추상 클래스의 장점을 결합한 설계다.

```
인터페이스 (List)
    │  "get(), add(), size() 있어야 해" (계약)
    ▼
추상 클래스 (AbstractList)
    │  "isEmpty()는 size() == 0이면 돼" (공통 구현)
    │  "get()은 구현체마다 다르니까 abstract로 남김" (원시 메서드)
    ▼
구체 클래스 (ArrayList, LinkedList)
    └  "get()은 이렇게 구현할게" (핵심 구현)
```

**원시 메서드 vs 파생 메서드**

추상 클래스에서 **뭘 구현하고 뭘 남기는가**가 핵심이다.

```java
public abstract class AbstractList<E> implements List<E> {

    // 원시 메서드: 구현체마다 다름 → abstract로 남김
    abstract public E get(int index);
    abstract public int size();

    // 파생 메서드: 원시 메서드 조합으로 구현 가능 → 여기서 구현
    public boolean isEmpty() {
        return size() == 0;
    }

    public boolean contains(Object o) {
        for (int i = 0; i < size(); i++) {
            if (Objects.equals(get(i), o)) return true;
        }
        return false;
    }

    public int indexOf(Object o) {
        for (int i = 0; i < size(); i++) {
            if (Objects.equals(get(i), o)) return i;
        }
        return -1;
    }
}
```

**ArrayList는 `get()`과 `size()`만 구현하면 나머지가 자동으로 동작한다:**

```java
public class ArrayList<E> extends AbstractList<E> {
    private Object[] elementData;

    @Override
    public E get(int index) {
        return (E) elementData[index];  // 핵심만 구현
    }

    @Override
    public int size() {
        return size;
    }

    // isEmpty(), indexOf(), contains()는 AbstractList 거 그대로 씀
}
```

**왜 Java 8 이후에도 추상 클래스가 필요한가?**

default 메서드로 다 해결되지 않는다.

| 인터페이스에서 못하는 것 | 추상 클래스에서 가능 |
|------------------------|-------------------|
| 인스턴스 필드 | O |
| `equals()`, `hashCode()`, `toString()` 오버라이드 | O |
| non-public 멤버 | O |
| 생성자 로직 | O |

```java
public abstract class AbstractSet<E> implements Set<E> {

    // 인터페이스에서는 equals() 오버라이드 불가
    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof Set)) return false;
        // Set 비교 로직...
    }

    @Override
    public int hashCode() {
        int h = 0;
        for (E e : this) h += Objects.hashCode(e);
        return h;
    }
}
```

**왜 equals()와 hashCode()를 오버라이드하는가?**

Object가 기본 제공하는 equals()는 **메모리 주소만 비교**한다.

```java
// Object.equals() 실제 구현
public boolean equals(Object obj) {
    return (this == obj);  // 참조 비교
}
```

이 기본 구현은 **내용이 같아도 new로 따로 만들면 다르다**고 판단한다.

```java
class User {
    String id;
    User(String id) { this.id = id; }
}

User user1 = new User("john");
User user2 = new User("john");  // 같은 id

user1.equals(user2);  // false! 다른 메모리 주소

// HashSet에 넣으면?
Set<User> set = new HashSet<>();
set.add(user1);
set.add(user2);
set.size();  // 2! 논리적으로 같은 유저인데 두 개로 취급
```

**내용이 같으면 같다**고 하려면 오버라이드해야 한다.

```java
class User {
    String id;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User)) return false;
        return id.equals(((User) o).id);  // id가 같으면 같은 유저
    }

    @Override
    public int hashCode() {
        return id.hashCode();  // id 기반 해시
    }
}

User user1 = new User("john");
User user2 = new User("john");

user1.equals(user2);  // true! id가 같으니까

Set<User> set = new HashSet<>();
set.add(user1);
set.add(user2);
set.size();  // 1! 같은 유저로 취급
```

| | Object 기본 | 오버라이드 후 |
|--|------------|-------------|
| 비교 기준 | 메모리 주소 (동일성) | 내용 (동등성) |
| new User("john") == new User("john") | false | true |
| HashMap/HashSet 동작 | 별개 객체로 취급 | 같은 키로 취급 |

**왜 인터페이스에서 equals()를 오버라이드할 수 없는가?**

"클래스가 인터페이스보다 우선" 규칙 때문이다.

```java
interface MyInterface {
    default boolean equals(Object o) {  // 컴파일 에러!
        return true;
    }
}
```

모든 클래스는 `Object`를 상속하므로 `Object.equals()`가 항상 존재한다. 만약 인터페이스에 `default equals()`를 정의할 수 있다면 어떻게 될까?

```java
class MyClass implements MyInterface {
    // Object.equals()가 있음
    // MyInterface.equals()도 있음 (가정)
}

MyClass obj = new MyClass();
obj.equals(other);  // 뭘 호출해야 하지?
```

Java의 **클래스가 인터페이스보다 우선** 규칙에 의해 **항상 Object.equals()가 호출된다.** 인터페이스의 default equals()는 절대 호출될 수 없다.

호출될 수 없는 메서드를 정의하게 허용하는 건 혼란만 야기하므로, Java는 아예 **컴파일 에러**로 막아버렸다.

---

## 정리

| 개념 | 핵심 |
|------|------|
| 원시 타입 | 8가지, 스택에 값 직접 저장, 박싱 오버헤드 주의 |
| 참조 타입 | 힙에 객체, 스택에 참조, null 가능 |
| 접근 제어자 | private < default < protected < public |
| static | 클래스 레벨, 인스턴스 없이 접근, Heap에 저장 (Java 8+) |
| 오버로딩 | 같은 이름, 다른 시그니처, 컴파일 타임 결정 |
| 오버라이딩 | 상위 메서드 재정의, 런타임 결정 (동적 바인딩) |
| 인터페이스 | 계약 정의, 다중 구현, can-do 관계 |
| 추상클래스 | 공통 구현 + 정체성, 단일 상속, is-a 관계 |
