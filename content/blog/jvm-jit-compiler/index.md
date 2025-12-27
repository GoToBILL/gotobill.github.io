---
title: "JIT 컴파일러 심화"
date: "2025-09-12"
description: "JVM의 JIT 컴파일러 동작 원리와 티어드 컴파일, 최적화 기법을 알아봅니다."
category: "개발"
tags: ["JVM", "Java", "JIT"]
---

## 컴파일 vs 인터프리터

프로그래밍 언어 실행 방식은 크게 두 가지입니다.

| 방식 | 특징 | 대표 언어 |
|------|------|-----------|
| 컴파일 | 전체 코드를 기계어로 변환 후 실행. 빠르지만 컴파일 시간 필요 | C, C++ |
| 인터프리터 | 한 줄씩 해석하며 실행. 시작은 빠르지만 실행 속도 느림 | Python, JavaScript |

**Java는 두 방식을 결합했습니다.** 소스 코드를 바이트코드로 컴파일하고, JVM이 바이트코드를 해석하면서 필요한 부분만 기계어로 컴파일합니다.

---

## JIT 컴파일러란?

**JIT(Just-In-Time) 컴파일러**는 자주 실행되는 코드(Hotspot)를 찾아 네이티브 코드로 컴파일해 성능을 높입니다.

```
프로그램 시작
     ↓
Interpreter로 바이트코드 해석 실행
     ↓
Runtime Profiler가 메서드 호출 횟수 모니터링
     ↓
임계값 초과 (Hotspot 감지)
     ↓
JIT Compiler가 네이티브 코드로 컴파일
     ↓
이후 호출: 컴파일된 코드 직접 실행 (빠름)
```

**핵심**: 모든 코드를 컴파일하지 않습니다. 자주 실행되는 코드만 컴파일해서 컴파일 오버헤드와 실행 속도의 균형을 맞춥니다.

---

## C1 vs C2 컴파일러

JVM에는 두 가지 JIT 컴파일러가 있습니다.

| 컴파일러 | 특징 | 용도 |
|----------|------|------|
| C1 (Client) | 빠른 컴파일, 기본 최적화 | 빠른 시작이 중요한 경우 |
| C2 (Server) | 느린 컴파일, 고급 최적화 | 장기 실행 서버 애플리케이션 |

---

## 티어드 컴파일 (Tiered Compilation)

**Java 8부터 기본 활성화.** C1과 C2를 함께 사용합니다.

```
Level 0: Interpreter (해석 실행)
     ↓ 호출 횟수 증가
Level 1-3: C1 컴파일 (빠른 컴파일, 기본 최적화)
     ↓ 호출 횟수 계속 증가
Level 4: C2 컴파일 (느린 컴파일, 고급 최적화)
```

처음에는 C1으로 빠르게 컴파일해서 시작 속도를 높이고, 정말 자주 실행되는 코드는 C2로 재컴파일해서 최적의 성능을 냅니다.

---

## JIT 최적화 기법

### 인라이닝 (Inlining)

메서드 호출을 메서드 본문으로 대체합니다.

```java
// Before
int add(int a, int b) { return a + b; }
int result = add(5, 3);

// After (Inlined)
int result = 5 + 3;
```

메서드 호출 오버헤드(스택 프레임 생성, 매개변수 전달)가 제거됩니다.

### 루프 언롤링 (Loop Unrolling)

루프를 펼쳐서 반복 오버헤드를 줄입니다.

```java
// Before
for (int i = 0; i < 4; i++) {
    process(i);
}

// After (Unrolled)
process(0);
process(1);
process(2);
process(3);
```

### 탈출 분석 (Escape Analysis)

객체가 메서드 밖으로 나가지 않으면 최적화를 적용합니다.

```java
for (int i = 0; i < 100; i++) {
    Point p = new Point(i, i);  // 루프 내에서만 사용
    System.out.println(p.x + p.y);
}
```

- **스택 할당**: 힙 대신 스택에 할당 (GC 부담 감소)
- **동기화 제거**: 불필요한 lock 제거
- **스칼라 치환**: 객체를 개별 필드로 분해

### OSR (On-Stack Replacement)

긴 루프가 실행 중일 때, 루프가 끝날 때까지 기다리지 않고 즉시 컴파일된 코드로 전환합니다.

```java
for (int i = 0; i < 10_000_000; i++) {
    // 루프 도중에 JIT 컴파일 코드로 교체
    compute();
}
```

---

## 역최적화 (Deoptimization)

JVM이 기존에 컴파일한 코드를 다시 인터프리터 모드로 되돌리는 과정입니다.

### 발생 원인: 다형성 변화

```java
MemberRepository repo = new MemberRepositoryImpl();

// 100만 번 실행 → JVM이 MemberRepositoryImpl 기준으로 최적화
for (int i = 0; i < 1_000_000; i++) {
    repo.save("User-" + i);
}

// 새로운 구현체로 교체 → 기존 최적화 무효화
repo = new LoggingMemberRepository(new MemberRepositoryImpl());

// 역최적화 발생, 다시 프로파일링 시작
for (int i = 0; i < 1_000_000; i++) {
    repo.save("User-" + i);
}
```

JVM은 단일 타입(Monomorphic)으로 호출되는 메서드를 적극적으로 인라이닝합니다. 다른 구현체가 등장하면 기존 최적화가 무효화되고 역최적화가 발생합니다.

### Inline Cache 상태

| 상태 | 설명 | 성능 |
|------|------|------|
| Monomorphic | 단일 타입 | 가장 빠름 |
| Polymorphic | 2~4개 타입 | 빠름 |
| Megamorphic | 다수 타입 | 느림 (vtable 사용) |

---

## 웜업 (Warm-up)

프로그램 시작 직후에는 인터프리터로 실행되므로 성능이 낮습니다. JIT 컴파일이 완료되면 성능이 향상됩니다.

```java
// 초기 실행: 인터프리터 모드 (느림)
for (int i = 0; i < 100_000; i++) {
    compute();
}

// 웜업 후: JIT 컴파일 완료 (빠름)
for (int i = 0; i < 100_000; i++) {
    compute();
}
```

실제 측정 시 웜업을 고려해야 합니다. 벤치마크 도구(JMH)는 자동으로 웜업을 수행합니다.

---

## JVM 튜닝 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-XX:+TieredCompilation` | 티어드 컴파일 활성화 | true (Java 8+) |
| `-XX:CompileThreshold=N` | 컴파일 임계값 | 10,000 |
| `-XX:ReservedCodeCacheSize=N` | 코드 캐시 크기 | 240MB (Tiered) |
| `-XX:CICompilerCount=N` | 컴파일 스레드 수 | CPU에 비례 |
| `-XX:MaxInlineSize=N` | 인라이닝 대상 메서드 크기 | 35 bytes |
| `-XX:+DoEscapeAnalysis` | 탈출 분석 활성화 | true |

### 코드 캐시 부족 문제

코드 캐시가 가득 차면 JIT 컴파일이 중단되고 인터프리터로 실행됩니다.

```bash
# 코드 캐시 크기 증가
java -XX:ReservedCodeCacheSize=512m MyApplication
```

### 컴파일 로그 확인

```bash
# 컴파일 로그 출력
java -XX:+PrintCompilation MyApplication

# 인라이닝 로그
java -XX:+PrintInlining MyApplication
```

---

## 정리

| 개념 | 설명 |
|------|------|
| JIT 컴파일러 | 자주 실행되는 코드를 네이티브 코드로 컴파일 |
| Tiered Compilation | C1(빠른 컴파일) + C2(고급 최적화) 조합 |
| 인라이닝 | 메서드 호출을 본문으로 대체 |
| 탈출 분석 | 객체가 스코프를 벗어나지 않으면 스택 할당 |
| 역최적화 | 다형성 변화 시 기존 최적화 무효화 |
| 웜업 | JIT 컴파일 완료까지의 초기 성능 저하 구간 |

JIT 컴파일러 덕분에 Java는 인터프리터 언어의 이식성과 컴파일 언어의 성능을 모두 얻을 수 있습니다.
