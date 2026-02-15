---
title: "락프리 프로그래밍과 CAS 연산"
date: "2026-02-14"
description: "Lock 없이 동시성을 제어하는 락프리 프로그래밍의 원리와 CAS 연산"
category: "개발"
tags: ["Java", "Thread", "동시성", "JVM", "성능"]
---

## 락프리란?

멀티스레드 환경에서 여러 스레드가 동시에 같은 데이터를 변경하려고 하면 데이터 정합성 문제가 발생합니다.

전통적인 해결 방법은 **Lock**(락)을 사용하는 것입니다.

```java
private int counter = 0;
private final Object lock = new Object();

public void increment() {
    synchronized(lock) {  // 락 획득
        counter++;
    }  // 락 해제
}
```

하지만 락프리는 **락 없이도** 여러 스레드가 안전하게 데이터를 공유할 수 있는 프로그래밍 기법입니다.

락을 사용하지 않고 하드웨어가 제공하는 원자적 연산만으로 동시성을 제어합니다.

## Lock의 문제점

락을 사용하면 세 가지 문제가 발생할 수 있습니다.

### 1. 우선순위 역전 (Priority Inversion)

우선순위가 낮은 스레드가 락을 먼저 획득하면, 우선순위가 높은 스레드가 기다려야 합니다.

```
[시간 순서]
1. 낮은 우선순위 스레드 A가 락 획득
2. 높은 우선순위 스레드 B가 락 대기 (블로킹)
3. A가 작업 완료 후 락 해제
4. B가 락 획득 (뒤늦게 실행)
```

우선순위가 의미가 없어집니다.

### 2. 호위 효과 (Convoying)

한 스레드가 락을 오래 잡고 있으면, 다른 스레드들이 줄지어 대기합니다.

```
[락 대기 큐]
스레드 1: 락 획득 중 (느린 작업 수행)
스레드 2: 대기 중...
스레드 3: 대기 중...
스레드 4: 대기 중...
```

락을 짧게만 잡아도 스레드가 많으면 대기 시간이 누적됩니다.

### 3. 교착상태 (Deadlock)

여러 락을 잘못된 순서로 획득하면 서로 기다리며 멈춥니다.

```java
// 스레드 1
synchronized(lockA) {
    synchronized(lockB) {  // lockB 대기
        // 작업
    }
}

// 스레드 2
synchronized(lockB) {
    synchronized(lockA) {  // lockA 대기
        // 작업
    }
}
```

스레드 1은 lockA를 잡고 lockB를 기다리고, 스레드 2는 lockB를 잡고 lockA를 기다리므로 영원히 진행되지 않습니다.

## CAS 연산의 등장

락프리는 **CAS(Compare-And-Swap)** 연산을 사용합니다.

CAS는 CPU가 제공하는 원자적 명령으로, 하드웨어 레벨에서 동작합니다.

### CAS 동작 원리

```java
// CAS 연산의 논리적 동작 (실제로는 CPU 명령으로 원자적 실행)
boolean compareAndSet(int expected, int newValue) {
    int current = this.value;  // 현재값 읽기
    if (current == expected) {
        this.value = newValue;  // 예상값과 같으면 업데이트
        return true;  // 성공
    } else {
        return false;  // 실패 (다른 스레드가 먼저 변경함)
    }
}
```

이 과정이 **단일 CPU 명령으로 원자적으로** 실행됩니다.

중간에 다른 스레드가 끼어들 수 없습니다.

### CAS 예시

카운터를 1 증가시키는 경우:

```
[초기 상태] counter = 0

[스레드 A]
1. 현재값 읽기: 0
2. 새값 계산: 0 + 1 = 1
3. CAS(counter, 0, 1)
   - 메모리의 counter가 여전히 0이면 1로 변경 → 성공
   - 다른 스레드가 먼저 변경했으면 실패

[만약 실패하면]
4. 다시 1번부터 재시도 (현재값 읽기부터)
```

락 없이도 안전하게 증가시킬 수 있습니다.

## Java의 Atomic 클래스

Java는 `java.util.concurrent.atomic` 패키지에서 CAS 기반의 원자적 클래스를 제공합니다.

### AtomicInteger 사용

```java
import java.util.concurrent.atomic.AtomicInteger;

public class Counter {
    private AtomicInteger counter = new AtomicInteger(0);

    public void increment() {
        counter.incrementAndGet();  // 락 없이 원자적 증가
    }

    public int get() {
        return counter.get();
    }
}
```

**내부 동작:**

```java
public final int incrementAndGet() {
    for (;;) {  // 무한 루프
        int current = get();  // 현재값 읽기
        int next = current + 1;  // 새값 계산
        if (compareAndSet(current, next)) {  // CAS 시도
            return next;  // 성공하면 반환
        }
        // 실패하면 재시도
    }
}
```

CAS가 실패하면 계속 재시도합니다.

### 명시적 CAS 사용

```java
AtomicInteger counter = new AtomicInteger(0);

// 0이면 1로 변경
boolean success = counter.compareAndSet(0, 1);

if (success) {
    System.out.println("변경 성공");
} else {
    System.out.println("다른 스레드가 먼저 변경함");
}
```

### 다양한 Atomic 클래스

| 클래스 | 용도 |
|--------|------|
| `AtomicInteger` | int 원자적 연산 |
| `AtomicLong` | long 원자적 연산 |
| `AtomicBoolean` | boolean 원자적 연산 |
| `AtomicReference<V>` | 객체 참조 원자적 연산 |


## 메모리 가시성: Happens-Before

락프리 프로그래밍에서는 **메모리 가시성**이 중요합니다.

한 스레드가 변경한 값을 다른 스레드가 언제 볼 수 있는지가 보장되어야 합니다.

### 문제 상황

```java
// 스레드 1
counter = 1;  // 메모리에 쓰기

// 스레드 2
int value = counter;  // 메모리에서 읽기
```

멀티코어 CPU에서는 각 코어가 자신의 캐시를 가지므로, 스레드 2가 스레드 1의 변경을 즉시 볼 수 없을 수 있습니다.

## 락프리의 한계

락프리가 항상 최선은 아닙니다.

### 1. ABA 문제

CAS는 값만 비교하므로, 다음 상황에서 문제가 생길 수 있습니다.

```
[초기 상태] 스택 top = A

[스레드 1]
1. old = A 읽기
2. (잠시 멈춤)

[스레드 2]
3. A를 pop
4. B를 pop
5. A를 다시 push

[스레드 1]
6. CAS(top, A, B)  // 성공! (top이 다시 A이므로)
```

스레드 1은 top이 계속 A였다고 착각하지만, 실제로는 A → B → A로 변경되었습니다.

**해결책: AtomicStampedReference**

```java
AtomicStampedReference<Node> top = new AtomicStampedReference<>(nodeA, 0);

// 값과 버전을 동시에 확인
int[] stampHolder = new int[1];
Node oldNode = top.get(stampHolder);
int oldStamp = stampHolder[0];

// 값과 버전이 모두 일치해야 변경
top.compareAndSet(oldNode, newNode, oldStamp, oldStamp + 1);
```

### 2. 경합이 심한 경우 비효율

CAS는 실패하면 재시도합니다.

스레드가 많으면 실패 확률이 높아져서 무한 루프를 계속 돌 수 있습니다.

```java
public final int incrementAndGet() {
    for (;;) {  // 재시도 루프
        int current = get();
        int next = current + 1;
        if (compareAndSet(current, next)) {
            return next;
        }
        // 실패하면 다시 루프 (CPU 낭비)
    }
}
```

**언제 Lock이 나은가:**

- 동시 스레드 수가 매우 많은 경우 (100개 이상)
- 임계 영역이 긴 경우
- 복잡한 데이터 구조 변경

**언제 Lock-Free가 나은가:**

- 동시 스레드 수가 적당한 경우 (10개 내외)
- 단순한 연산 (증가, 감소, 교체)
- 락 오버헤드를 줄이고 싶은 경우

### 3. 모든 연산이 원자적이지 않음

Atomic 클래스는 단일 변수만 원자적으로 처리합니다.

여러 변수를 동시에 변경해야 하면 락이 필요합니다.

```java
// 두 변수를 동시에 변경 (원자적이지 않음)
AtomicInteger x = new AtomicInteger(0);
AtomicInteger y = new AtomicInteger(0);

x.incrementAndGet();  // A
y.incrementAndGet();  // B

// 다른 스레드가 A와 B 사이에 읽으면 일관성 깨짐
```

**해결책: AtomicReference + 불변 객체**

```java
class Point {
    final int x;
    final int y;

    Point(int x, int y) {
        this.x = x;
        this.y = y;
    }
}

AtomicReference<Point> point = new AtomicReference<>(new Point(0, 0));

// 원자적 교체
Point old = point.get();
Point newPoint = new Point(old.x + 1, old.y + 1);
point.compareAndSet(old, newPoint);
```

## 정리

**락프리 프로그래밍은:**

- **Lock 없이** 하드웨어의 CAS 연산으로 동시성 제어
- 우선순위 역전, 호위 효과, 교착상태를 **근본적으로 회피**
- Java의 **Atomic 클래스**로 쉽게 사용 가능
- **메모리 가시성**이 보장되므로 안전
- 단순한 연산에서 **Lock보다 빠름**

**주의사항:**

- ABA 문제 (AtomicStampedReference로 해결)
- 경합이 심하면 재시도 오버헤드 증가
- 여러 변수 동시 변경은 불가능

**사용 가이드:**

| 상황 | 선택 |
|------|------|
| 단순한 카운터, 플래그 | Atomic 클래스 |
| 복잡한 데이터 구조 변경 | synchronized |
| 여러 변수 동시 변경 | synchronized |
| 스레드 10개 이하 | Atomic 클래스 |
| 스레드 100개 이상 | synchronized |

락프리는 만능이 아니지만, 적절히 사용하면 성능과 안전성을 모두 얻을 수 있습니다.
