---
title: "Java 직렬화"
date: "2025-01-14"
description: "Serializable부터 역직렬화 공격, ObjectInputFilter까지 공식 문서 기반으로 정리합니다."
category: "개발"
tags: ["Java", "Serialization", "Security"]
---

## 직렬화란?

**직렬화**(Serialization): 객체의 상태를 바이트 스트림으로 변환하는 과정입니다.

**역직렬화**(Deserialization): 바이트 스트림을 다시 객체로 복원하는 과정입니다.

```java
// 직렬화: Object → byte[]
ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream("data.ser"));
oos.writeObject(myObject);

// 역직렬화: byte[] → Object
ObjectInputStream ois = new ObjectInputStream(new FileInputStream("data.ser"));
MyClass obj = (MyClass) ois.readObject();
```

---

## 왜 필요한가?

### 1. 네트워크 전송

객체를 다른 JVM으로 전송할 때 바이트 스트림으로 변환 필요

```java
// RMI, 소켓 통신 등에서 객체 전송
socket.getOutputStream().write(serializedBytes);
```

### 2. 영속성(Persistence)

객체 상태를 파일이나 데이터베이스에 저장

```java
// 세션 정보, 설정값 등을 파일로 저장
try (ObjectOutputStream oos = new ObjectOutputStream(
        new FileOutputStream("session.dat"))) {
    oos.writeObject(sessionData);
}
```

### 3. 캐시

메모리 객체를 디스크나 분산 캐시에 저장

```java
// Redis, Memcached 등에 객체 저장 시
byte[] serialized = serialize(cacheObject);
redisTemplate.set(key, serialized);
```

---

## Serializable 인터페이스

### 마커 인터페이스

`Serializable`은 메서드가 없는 **마커 인터페이스**(Marker Interface)입니다.

```java
public interface Serializable {
    // 메서드 없음
}
```

이 인터페이스를 구현하면 JVM에게 "이 클래스는 직렬화 가능"이라고 알려줍니다.

```java
public class User implements Serializable {
    private String name;
    private int age;
    // ...
}
```

### 상속 관계에서의 동작

```java
// 부모 클래스가 Serializable을 구현하면 자식도 자동으로 직렬화 가능
class Parent implements Serializable { }
class Child extends Parent { }  // Serializable

// 부모가 Serializable이 아니면?
class NonSerializableParent {
    String data;
}
class Child extends NonSerializableParent implements Serializable {
    // 역직렬화 시 부모의 무인자 생성자가 호출됨
    // 부모 필드는 기본값으로 초기화
}
```

**주의**: 부모 클래스가 `Serializable`이 아니면, 부모 필드는 직렬화되지 않고 역직렬화 시 부모의 **무인자 생성자**가 호출됩니다.

### Enum과 Record

```java
// Enum: 자동으로 직렬화 가능, name()으로 직렬화됨
enum Status { ACTIVE, INACTIVE }

// Record (Java 14+): Serializable 구현 시 직렬화 가능
record Point(int x, int y) implements Serializable { }
```

---

## serialVersionUID

### 역할

`serialVersionUID`는 직렬화된 클래스의 버전을 식별하는 고유 번호입니다.

```java
public class User implements Serializable {
    private static final long serialVersionUID = 1L;

    private String name;
    private int age;
}
```

### 왜 명시적 선언이 필요한가?

명시하지 않으면 JVM이 클래스 구조를 기반으로 자동 계산합니다.

```java
// serialVersionUID 자동 계산에 영향을 주는 요소들:
// - 클래스 이름
// - 필드 이름, 타입, 순서
// - 메서드 시그니처
// - 인터페이스 구현
// - 컴파일러 구현 (!)
```

**문제점**: 컴파일러 구현에 따라 같은 소스코드라도 다른 `serialVersionUID`가 생성될 수 있습니다.

```java
// 시나리오: 클래스에 필드 추가
// v1
class User implements Serializable {
    String name;
}

// v2 (필드 추가)
class User implements Serializable {
    String name;
    int age;  // 새 필드
}

// serialVersionUID 명시 안 하면 → InvalidClassException
// serialVersionUID 명시하면 → 새 필드는 기본값(0)으로 역직렬화
```

**Oracle 공식 권장**: 모든 `Serializable` 클래스에 `serialVersionUID`를 명시적으로 선언하세요.

---

## transient 키워드

### 직렬화에서 제외

`transient` 키워드가 붙은 필드는 직렬화되지 않습니다.

```java
public class User implements Serializable {
    private String username;
    private transient String password;  // 직렬화 제외
    private transient Connection dbConn; // 직렬화 불가능한 객체
}
```

### 역직렬화 시 기본값

`transient` 필드는 역직렬화 시 **타입의 기본값**으로 초기화됩니다.

```java
// 역직렬화 후
user.username  // "john" (직렬화된 값)
user.password  // null (기본값)
user.dbConn    // null (기본값)
```

### 사용 사례

```java
public class CacheEntry implements Serializable {
    private String key;
    private Object value;

    // 1. 민감 정보
    private transient String secretToken;

    // 2. 캐시/파생 값 (다시 계산 가능)
    private transient int cachedHashCode;

    // 3. 직렬화 불가능한 객체
    private transient Logger logger;
    private transient Thread workerThread;
}
```

---

## ObjectInputStream / ObjectOutputStream

### ObjectOutputStream - 직렬화

```java
public class ObjectOutputStream extends OutputStream {
    // 핵심 메서드
    public final void writeObject(Object obj);
    public void writeInt(int val);
    public void writeUTF(String str);
    public void flush();
    public void close();
}
```

```java
try (ObjectOutputStream oos = new ObjectOutputStream(
        new FileOutputStream("data.ser"))) {
    oos.writeObject(user);
    oos.writeInt(100);
    oos.writeUTF("metadata");
}
```

### ObjectInputStream - 역직렬화

```java
public class ObjectInputStream extends InputStream {
    // 핵심 메서드
    public final Object readObject();
    public int readInt();
    public String readUTF();
    public void close();
}
```

```java
try (ObjectInputStream ois = new ObjectInputStream(
        new FileInputStream("data.ser"))) {
    User user = (User) ois.readObject();
    int value = ois.readInt();
    String metadata = ois.readUTF();
}
```

**보안 경고**: `readObject()`는 신뢰할 수 없는 데이터에 절대 사용하지 마세요.

---

## 커스텀 직렬화

### writeObject / readObject

기본 직렬화 동작을 커스터마이징할 수 있습니다.

```java
public class SecureUser implements Serializable {
    private String username;
    private String password;

    // 정확한 시그니처: private void writeObject(ObjectOutputStream)
    private void writeObject(ObjectOutputStream oos) throws IOException {
        oos.defaultWriteObject();  // 기본 필드 직렬화

        // 커스텀 처리: 비밀번호 암호화
        String encrypted = encrypt(password);
        oos.writeObject(encrypted);
    }

    // 정확한 시그니처: private void readObject(ObjectInputStream)
    private void readObject(ObjectInputStream ois)
            throws IOException, ClassNotFoundException {
        ois.defaultReadObject();  // 기본 필드 역직렬화

        // 커스텀 처리: 비밀번호 복호화
        String encrypted = (String) ois.readObject();
        this.password = decrypt(encrypted);
    }
}
```

**규칙**:
- 메서드는 반드시 `private`
- `defaultWriteObject()` / `defaultReadObject()`를 먼저 호출
- 쓴 순서대로 읽어야 함

### 불변식 검증

```java
private void readObject(ObjectInputStream ois)
        throws IOException, ClassNotFoundException {
    ois.defaultReadObject();

    // 불변식 검증
    if (age < 0 || age > 150) {
        throw new InvalidObjectException("Invalid age: " + age);
    }
    if (name == null || name.isEmpty()) {
        throw new InvalidObjectException("Name cannot be empty");
    }
}
```

---

## Externalizable 인터페이스

### Serializable과의 차이

`Externalizable`은 직렬화를 **완전히 제어**할 수 있습니다.

```java
public interface Externalizable extends Serializable {
    void writeExternal(ObjectOutput out) throws IOException;
    void readExternal(ObjectInput in) throws IOException, ClassNotFoundException;
}
```

| 특성 | Serializable | Externalizable |
| --- | --- | --- |
| 직렬화 대상 | 모든 non-transient 필드 | 명시적으로 지정한 필드만 |
| 성능 | 리플렉션 사용 (느림) | 직접 구현 (빠름) |
| 생성자 | 호출 안 함 | **public 무인자 생성자 필수** |
| 제어 수준 | 부분 커스터마이징 | 완전 제어 |

### 구현 예시

```java
public class Product implements Externalizable {
    private String name;
    private double price;
    private transient int viewCount;  // transient 무의미

    // 필수: public 무인자 생성자
    public Product() { }

    @Override
    public void writeExternal(ObjectOutput out) throws IOException {
        out.writeUTF(name);
        out.writeDouble(price);
        // viewCount는 직렬화하지 않음
    }

    @Override
    public void readExternal(ObjectInput in)
            throws IOException, ClassNotFoundException {
        name = in.readUTF();
        price = in.readDouble();
        viewCount = 0;  // 초기화
    }
}
```

---

## writeReplace / readResolve

### 싱글톤 패턴 보호

직렬화/역직렬화 시 객체를 다른 객체로 치환할 수 있습니다.

```java
public class Singleton implements Serializable {
    private static final Singleton INSTANCE = new Singleton();

    private Singleton() { }

    public static Singleton getInstance() {
        return INSTANCE;
    }

    // 역직렬화 시 기존 인스턴스 반환
    private Object readResolve() {
        return INSTANCE;  // 새 객체 대신 싱글톤 반환
    }
}
```

### writeReplace - 직렬화 전 치환

```java
public class ComplexObject implements Serializable {
    private String data;

    // 직렬화 시 프록시 객체로 치환
    private Object writeReplace() {
        return new SerializationProxy(this);
    }

    private static class SerializationProxy implements Serializable {
        private final String data;

        SerializationProxy(ComplexObject obj) {
            this.data = obj.data;
        }

        private Object readResolve() {
            return new ComplexObject(data);
        }
    }
}
```

**직렬화 프록시 패턴**: 보안과 유연성을 위해 실제 객체 대신 프록시를 직렬화합니다.

---

## 역직렬화 공격

### 위험성

역직렬화는 바이트 스트림으로부터 객체를 생성하므로, **신뢰할 수 없는 데이터**를 역직렬화하면 공격에 노출됩니다.

### Gadget Chain 공격

클래스패스에 있는 여러 클래스들을 연결하여 악의적인 코드를 실행합니다.

```java
// 공격 시나리오
// 1. 공격자가 악의적인 바이트 스트림 생성
// 2. 서버에서 readObject() 호출
// 3. 역직렬화 과정에서 연쇄적으로 메서드 호출
// 4. 최종적으로 Runtime.exec() 등 위험한 메서드 실행
```

**유명 사례**:
- Apache Commons Collections (2015)
- Spring Framework
- Hibernate

### DoS 공격

```java
// HashSet의 해시 충돌을 이용한 DoS
// 같은 해시값을 가진 수만 개의 문자열로 HashSet 생성
// 역직렬화 시 O(n^2) 시간 소요

// 깊이 중첩된 객체로 스택 오버플로우 유발
// Set<Set<Set<...>>> 구조로 깊이 수천의 중첩
```

### 방어 전략

1. **신뢰할 수 없는 데이터 역직렬화 금지**
2. **ObjectInputFilter 사용** (Java 9+)
3. **화이트리스트 기반 필터링**
4. **JSON/XML 등 대안 사용**

---

## ObjectInputFilter (Java 9+)

### JEP 290 도입 배경

Java 9에서 역직렬화 공격 방어를 위해 `ObjectInputFilter`가 도입되었습니다.

### JVM 전역 필터

```bash
# JVM 옵션으로 설정
java -Djdk.serialFilter=com.myapp.*;!* MyApp

# 패턴 의미:
# com.myapp.*   → com.myapp 패키지 허용
# !*            → 그 외 모든 클래스 거부
```

### 스트림 단위 필터

```java
ObjectInputStream ois = new ObjectInputStream(inputStream);

// 람다로 필터 설정
ois.setObjectInputFilter(info -> {
    Class<?> clazz = info.serialClass();

    if (clazz != null) {
        // 화이트리스트 검사
        if (clazz.getName().startsWith("com.myapp.")) {
            return ObjectInputFilter.Status.ALLOWED;
        }
        return ObjectInputFilter.Status.REJECTED;
    }

    // 리소스 제한 검사
    if (info.depth() > 10) {
        return ObjectInputFilter.Status.REJECTED;
    }

    return ObjectInputFilter.Status.UNDECIDED;
});
```

### 필터 패턴 문법

```java
// 패턴 기반 필터 생성
ObjectInputFilter filter = ObjectInputFilter.Config.createFilter(
    "com.myapp.**;" +           // com.myapp과 하위 패키지 허용
    "java.util.*;" +            // java.util 패키지 허용
    "!com.dangerous.*;" +       // com.dangerous 패키지 거부
    "maxarray=1000;" +          // 배열 최대 크기
    "maxdepth=10;" +            // 최대 객체 그래프 깊이
    "maxrefs=1000;" +           // 최대 참조 수
    "maxbytes=100000"           // 최대 바이트 수
);
```

### 필터 정보 활용

```java
ois.setObjectInputFilter(info -> {
    // 클래스 정보
    Class<?> clazz = info.serialClass();

    // 배열 길이 (배열인 경우)
    long arrayLength = info.arrayLength();

    // 객체 그래프 깊이
    long depth = info.depth();

    // 지금까지 읽은 참조 수
    long references = info.references();

    // 지금까지 읽은 바이트 수
    long streamBytes = info.streamBytes();

    return ObjectInputFilter.Status.ALLOWED;
});
```

---

## Java 직렬화 vs JSON 직렬화

### 성능 비교

| 라이브러리 | 직렬화 (ops/sec) | 역직렬화 (ops/sec) |
| --- | --- | --- |
| Java Serialization | 약 50,000 | 약 25,000 |
| Jackson | 약 200,000 | 약 150,000 |
| Gson | 약 100,000 | 약 80,000 |
| Fastjson2 | 약 250,000 | 약 200,000 |

**결론**: JSON 라이브러리가 Java 기본 직렬화보다 **3~5배 빠릅니다**.

### 특징 비교

| 특성 | Java 직렬화 | JSON 직렬화 |
| --- | --- | --- |
| 언어 종속성 | Java 전용 | 언어 독립적 |
| 가독성 | 바이너리 (불가) | 텍스트 (가능) |
| 버전 호환성 | serialVersionUID 의존 | 스키마 유연 |
| 보안 | 역직렬화 공격 위험 | 상대적으로 안전 |
| 클래스 타입 보존 | 완벽 보존 | 별도 처리 필요 |
| 크기 | 메타데이터 포함 (큼) | 필드명만 (작음) |

### 언제 무엇을 쓰는가?

**Java 직렬화 사용**:
- RMI 기반 분산 시스템
- Java 전용 캐시 (Ehcache 등)
- 깊은 객체 그래프 + 순환 참조
- 클래스 타입 정보 보존 필수

**JSON 직렬화 사용**:
- REST API 통신
- 다른 언어와의 상호운용
- 사람이 읽을 수 있어야 할 때
- 브라우저와 통신

### Jackson 사용 예시

```java
// 의존성: com.fasterxml.jackson.core:jackson-databind

ObjectMapper mapper = new ObjectMapper();

// 직렬화
String json = mapper.writeValueAsString(user);
byte[] bytes = mapper.writeValueAsBytes(user);

// 역직렬화
User user = mapper.readValue(json, User.class);
List<User> users = mapper.readValue(json,
    new TypeReference<List<User>>() {});
```

### 대안 기술

| 기술 | 특징 | 사용 사례 |
| --- | --- | --- |
| Protocol Buffers | Google, 스키마 기반, 빠름 | gRPC, 대용량 데이터 |
| Avro | Apache, 스키마 진화 지원 | Kafka, 빅데이터 |
| Kryo | Java 전용, 매우 빠름 | Spark, 게임 서버 |
| MessagePack | 바이너리 JSON | IoT, 모바일 |

---

## 정리

| 개념 | 핵심 포인트 |
| --- | --- |
| Serializable | 마커 인터페이스, 기본 직렬화 제공 |
| serialVersionUID | 버전 호환성, 반드시 명시적 선언 |
| transient | 직렬화 제외, 역직렬화 시 기본값 |
| writeObject/readObject | 커스텀 직렬화, private 메서드 |
| Externalizable | 완전 제어, public 무인자 생성자 필수 |
| readResolve | 싱글톤 보호, 객체 치환 |
| 역직렬화 공격 | 신뢰할 수 없는 데이터 절대 역직렬화 금지 |
| ObjectInputFilter | Java 9+, 화이트리스트 필터링 |

**권장사항**:
1. 새 프로젝트에서는 JSON 직렬화(Jackson) 사용
2. Java 직렬화 사용 시 반드시 `serialVersionUID` 선언
3. 역직렬화 시 반드시 `ObjectInputFilter` 적용
4. 민감 정보는 `transient` 또는 암호화 처리
