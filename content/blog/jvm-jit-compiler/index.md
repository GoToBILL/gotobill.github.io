---
title: "JVM과 JIT 컴파일러: 자바 성능 최적화의 핵심"
date: "2025-09-12"
description: "JVM의 JIT 컴파일러 동작 원리와 티어드 컴파일, 최적화 기법들을 심도있게 다룹니다"
tags: ["JVM", "Java", "Performance", "Optimization"]
---

## JVM

자바를 공부하시는 분들은 JVM을 들어보셨을 겁니다.

JVM은 어느 OS에서 실행해도 자바로 작성된 파일을 잘 실행시켜줍니다. 그렇기 때문에 이식성이 높다는 말을 듣죠.

JVM은 JIT 컴파일러를 가지고 있습니다. 이 글에서 JIT 컴파일러에 대해서 말씀드리겠습니다.

### 컴파일과 인터프리터의 차이

프로그래밍 언어를 실행하는 방식에는 크게 **컴파일 방식**과 **인터프리터 방식**이 있습니다.

#### 컴파일 방식

- 전체 코드를 한 번에 기계어(네이티브 코드)로 변환하여 실행하는 방식입니다.
- 실행 속도가 빠르지만, 실행 전에 **컴파일 과정**이 필요하므로 초기 실행 시간이 오래 걸립니다.
- 대표적인 컴파일 언어: **C, C++**

```c
#include <stdio.h>

int main() {
    printf("Hello, World!\n");
    return 0;
}

// 실행 방식:
// 1. 컴파일: gcc main.c -o main
// 2. 실행: ./main
```

#### 인터프리터 방식

- 코드를 한 줄씩 읽어가며 즉시 실행하는 방식입니다.
- 실행 준비가 필요 없지만 실행 속도가 느립니다.
- 대표적인 인터프리터 언어: **Python, JavaScript**

```python
# Python 예제 (인터프리터 방식)
print("Hello, World!")
```

#### 어셈블리 명령어와 성능 차이

CPU는 **기계어(바이너리 코드,네이티브 코드) 또는 어셈블리 언어 명령어**만 실행할 수 있습니다.  
컴파일러는 이 명령어들의 실행 순서를 최적화하여 성능을 높입니다.

예를 들어, 두 개의 숫자를 더하는 프로그램을 생각해봅시다.

- **컴파일 방식:**
  - 미리 데이터를 메모리에서 가져와 **레지스터**에 저장한 후 덧셈 연산을 실행
  - 덧셈에 필요한 데이터가 미리 준비되어 있어 빠르게 실행됨
- **인터프리터 방식 (Java는 Stack 방식):**
  - 실행할 때마다 메모리에서 데이터를 가져온 후 덧셈을 수행
  - 매번 메모리 접근을 해야 하므로 속도가 느려짐

컴파일된 코드는 미리 **최적화된 실행 순서를 적용할 수 있지만**,  
인터프리터 방식은 실행 중에 코드 변환을 수행해야 하므로 속도가 느릴 수밖에 없습니다.

이처럼 **컴파일 방식은 빠른 실행 속도를 보장하지만, 실행 전에 컴파일 과정이 필요하고, 인터프리터 방식은 빠르게 실행되지만 속도가 느리다는 단점이 있습니다.**

### JVM과 바이트코드

**Java는 위 두 가지 방식(컴파일, 인터프리터)을 적절히 결합한 방식**을 사용합니다. Java 프로그램이 실행되기 전에는 **소스 코드(.java)를 바이트코드(.class)로 변환**하는 과정이 필요합니다.

#### 바이트코드란?

바이트코드는 JVM이 이해할 수 있는 중간 코드입니다. 실행하기 위해서는 JVM이 바이트코드를 기계어로 변환해야 합니다.

```java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}

// 실행 과정:
// 1. 컴파일: javac HelloWorld.java  (바이트코드 생성)
// 2. 실행: java HelloWorld  (JVM이 바이트코드를 해석하여 실행)
```

Java의 실행 방식은 **"컴파일 후 인터프리터 실행"** 방식입니다. 즉, 처음에는 바이트코드를 인터프리터 방식으로 실행하며, 이후 JIT 컴파일러가 최적화를 수행합니다.

### JIT 컴파일러의 동작 원리

JIT 컴파일러는 Java 프로그램 실행 중 **자주 실행되는 코드(핫스팟, Hotspot)를 찾아 네이티브 코드로 변환하여 실행 속도를 높이는 역할**을 합니다.

#### JIT 컴파일러의 실행 과정

1. **처음 실행**: JVM은 바이트코드를 인터프리터 방식으로 실행합니다.  
   -> **모든 코드를 컴파일 하지 않는다.**
2. **핫스팟 감지**: JVM은 실행 중 특정 메서드나 루프가 자주 실행되는지 분석합니다.
3. **JIT 컴파일 수행**: 자주 실행되는 코드**(핫스팟)**를 **네이티브 코드(기계어)**로 변환하여 실행 속도를 높입니다.
4. **최적화 지속 수행**: JIT 컴파일러는 실행 도중에도 지속적으로 코드 실행 패턴을 분석하여 최적화를 적용합니다.

```java
public class JITExample {
    public static void main(String[] args) {
        long startTime = System.nanoTime();
        for (int i = 0; i < 10_000_000; i++) {
            compute();
        }
        long endTime = System.nanoTime();
        System.out.println("실행 시간: " + (endTime - startTime) / 1_000_000 + " ms");
    }

    public static int compute() {
        int sum = 0;
        for (int i = 0; i < 100; i++) {
            sum += i;
        }
        return sum;
    }
}
```

위 코드에서 **compute() 메서드는 매우 자주 실행되므로 JVM**은 **핫스팟으로 감지하여 JIT 컴파일을 수행**합니다.

### JIT 컴파일러의 종류

JIT 컴파일러는 두 가지 형태로 나뉩니다. 애플리케이션이 실행되는 동안 어떤 방식으로 컴파일할지를 결정하는 것이 중요한데, 이에 따라 적절한 컴파일러를 선택해야 합니다.

JVM에서 사용하는 두 가지 JIT 컴파일러는 **클라이언트 컴파일러(Client Compiler, C1)** 와 **서버 컴파일러(Server Compiler, C2)** 입니다. JVM 개발자들은 각각 **C1(컴파일러 1), C2(컴파일러 2)** 라고 부르기도 합니다.

두 컴파일러의 가장 큰 차이점은 **컴파일 방식의 적극성**에 있습니다.

**클라이언트 컴파일러**는 실행 초기에 빠르게 코드를 컴파일하여 즉시 실행 속도를 높이는 데 초점을 맞추고 있습니다. 반면, **서버 컴파일러**는 **더 많은 실행 정보를 수집한 후(초기에는 인터프리터 방식으로)에 보다 강력한 최적화를 적용**하여 장기적으로 높은 성능을 제공합니다.

**클라이언트 컴파일러는 빠르게 동작하는 대신, 깊이 있는 최적화가 부족하고, 서버 컴파일러는 초기에는 느리지만 시간이 지나면 훨씬 더 효율적인 실행 속도를 제공합니다.**

이러한 차이점 때문에 **애플리케이션의 특성에 따라 적절한 컴파일러를 선택하는 것이 중요**합니다.

- **짧은 시간 동안 실행되는 프로그램**이라면 **클라이언트 컴파일러**가 더 적합합니다.
- **장기간 실행되는 서버 애플리케이션**이라면 **서버 컴파일러**를 선택하는 것이 바람직합니다.

#### 티어드 컴파일(Tiered Compilation)

여기서 한 가지 궁금한 게 생길 수 있습니다. 그냥 두개를 섞어서 쓰면 되는 거 아닌가?  
"JVM이 처음에는 클라이언트 컴파일러를 사용하다가, 코드가 많이 실행되면 서버 컴파일러로 전환할 수는 없을까?"

**이러한 개념이 바로 티어드 컴파일(Tiered Compilation) 입니다.**

티어드 컴파일을 사용하면 코드가 처음에는 클라이언트 컴파일러(C1)에서 빠르게 컴파일되고, 이후 실행 횟수가 많아지면 서버 컴파일러(C2)로 다시 컴파일됩니다.

**이 과정에서 역최적화(밑에서 설명)** 가 발생하지만, 재컴파일 시간은 성능에 영향을 줄 정도로 크지 않기 때문에 장기적으로는 훨씬 효율적인 실행이 가능합니다.

티어드 컴파일은 **자바 7부터 도입되었으며, 자바 8에서는 기본적으로 활성화**되어 있습니다.  
즉, 별도로 설정하지 않아도 JVM은 클라이언트 컴파일러와 서버 컴파일러를 적절히 조합하여 사용하게 됩니다.

결국, 티어드 컴파일을 활용하면 **빠른 실행 속도와 최적화된 성능을 모두 얻을 수 있어, 대부분의 애플리케이션에서 가장 좋은 선택**이 될 수 있습니다.

티어드 컴파일이 기본적으로 동작하는 방식을 이해했다면, 이제 실제로 이 방식을 적용할 때 어떤 튜닝이 필요한지 살펴보겠습니다.

티어드 컴파일이 효과적으로 작동하려면, JVM이 **클라이언트 컴파일러(C1)** 와 **서버 컴파일러(C2)** 간의 전환을 원활하게 수행할 수 있도록 **적절한 설정과 최적화가 필요합니다**.

### 티어드 컴파일의 최적화를 위한 주요 고려사항

#### 코드 캐시 최적화

티어드 컴파일러는 **초기에 C1(클라이언트 컴파일러)에서 실행된 코드를 C2(서버 컴파일러)로 재컴파일**하며, 이 과정에서 많은 코드가 생성됩니다.

JVM은 **컴파일된 기계어 코드를 "코드 캐시"에 저장**하는데, **이 캐시가 가득 차면 추가적인 코드 컴파일이 불가능해질 수 있습니다.**

**문제점**

코드 캐시가 가득 차면 JVM이 더 이상 새로운 코드를 컴파일할 수 없고, **일부 코드가 인터프리터로 실행될 수 있음**

- 서버 컴파일러(C2)가 작동하지 않게 되면 성능이 저하될 가능성이 높음

**해결 방법**

JVM 실행 시 **-XX:ReservedCodeCacheSize=N** 옵션을 활용하여 코드 캐시 크기를 늘릴 수 있습니다.  
일반적으로 기본값보다 **2배~4배 정도 증가시키는 것이 성능 향상에 도움**이 됩니다.

```bash
java -XX:ReservedCodeCacheSize=512m -XX:+TieredCompilation MyApplication
```

#### 컴파일 임계치(Compile Threshold) 조정

티어드 컴파일에서 코드가 C1 → C2로 넘어가기까지 얼마나 많은 실행 횟수가 필요한지를 조절하는 설정입니다.

**문제점**

- 기본적으로 C1에서 C2로 전환하는 기준(임계치)이 높게 설정되어 있어, **실행 초기에 최적화가 늦어질 수 있음**
- 빠르게 최적화된 코드가 필요하다면, 이 임계치를 낮추는 것이 유리할 수 있음

**해결 방법**

- **-XX:CompileThreshold=N** 플래그를 사용하여 **C2로 컴파일되는 임계값을 조정**
- 기본적으로 **클라이언트 컴파일러(C1)에서 1,500번**, **서버 컴파일러(C2)에서 10,000번** 실행되면 컴파일됨
- 이 값을 낮추면 **C2로의 전환이 빨라짐**, 그러나 **너무 낮추면 불필요한 컴파일이 많아져 오히려 성능이 저하될 수 있음**

```bash
java -XX:CompileThreshold=5000 -XX:+TieredCompilation MyApplication
```

이렇게 하면, 기존 10,000번 실행 후 C2로 넘어가는 것보다 **더 빠르게 최적화된 코드를 사용할 수 있습니다.**

#### OSR(On-Stack Replacement) 활용

OSR은 **긴 루프가 인터프리터 모드에서 실행되더라도, 루프 도중에 JIT 컴파일된 코드로 교체하는 기법**입니다.  
즉, 루프를 빠져나올 때까지 기다릴 필요 없이, **즉시 컴파일된 코드로 전환 가능**합니다.

**문제점**

- 기본적으로 JVM은 **루프가 끝날 때까지 컴파일된 코드로 전환하지 않음**
- 긴 루프가 인터프리터 모드에서 계속 실행될 경우 성능 저하 발생

**해결 방법**

- -XX:+TieredCompilation 플래그를 활성화하면 OSR이 자동으로 적용됨
- 별도로 -XX:LoopUnrollLimit을 설정하면 **OSR이 더 적극적으로 실행됨**

```bash
java -XX:+TieredCompilation -XX:LoopUnrollLimit=50 MyApplication
```

이렇게 하면 **루프 실행 중에도 인터프리터를 사용하지 않고 빠르게 C1 → C2 전환 가능**.

#### 컴파일 스레드 최적화

JVM은 **컴파일 큐**를 활용하여 메서드가 컴파일될 때까지 대기시킵니다.  
컴파일 큐는 **FIFO(선입선출)** 방식이 아니며, **호출 빈도가 높은 메서드가 우선적으로 컴파일**됩니다.

기본적으로 **클라이언트 컴파일러(C1)는 1개, 서버 컴파일러(C2)는 2개의 컴파일 스레드**로 시작합니다.  
**티어드 컴파일을 사용하는 경우, CPU 개수에 따라 적절한 개수의 컴파일 스레드를 자동으로 할당**합니다.

**컴파일 스레드 개수 조정 방법**

- **-XX:CICompilerCount=N** 옵션을 사용하면 **컴파일 스레드 개수를 직접 설정**할 수 있습니다.
- 단일 CPU 환경에서는 1개로 제한하는 것이 좋습니다.
- 다중 코어 환경에서는 컴파일 스레드 개수를 늘려 **JVM이 빠르게 JIT 컴파일을 수행하도록 조정할 수 있습니다**.

```bash
java -XX:CICompilerCount=4 -XX:+TieredCompilation MyApplication
```

**주의할 점**

- CPU 개수가 적다면 너무 많은 컴파일 스레드를 할당하면 오히려 경쟁이 발생하여 성능이 저하될 수 있습니다.
- 초반 **스타트업 속도는 증가할 수 있지만, 장기적으로 CPU 리소스를 과도하게 사용하게 될 수도 있습니다.**

#### 인라이닝(Inlining) 최적화

**인라이닝**은 JVM이 **자주 호출되는 메서드를 직접 호출하는 방식으로 변경하여 메서드 호출 오버헤드를 줄이는 최적화 기법**입니다.

**인라이닝의 효과**

- 메서드 호출 시 발생하는 스택 프레임 생성 비용을 제거
- 루프 내에서 반복적으로 호출되는 메서드를 직접 코드에 삽입하여 실행 속도 향상

**인라이닝 설정 방법**

- **-XX:MaxInlineSize=N** → **바이트 코드 크기가 N 바이트 이하인 메서드는 인라이닝됨**
- **-XX:MaxFreqInlineSize=N** → **자주 호출되는 메서드는 더 큰 크기라도 인라이닝**

```bash
java -XX:MaxInlineSize=50 -XX:MaxFreqInlineSize=400 MyApplication
```

**주의할 점**

- 인라이닝을 과도하게 하면 **JVM의 코드 캐시를 빠르게 소모할 수 있음**.
- 너무 많은 메서드가 인라이닝되면 오히려 성능이 저하될 가능성이 있음.

#### 탈출 분석(Escape Analysis) 최적화

**탈출 분석**은 **객체가 특정 스코프를 벗어나지 않는 경우, JVM이 해당 객체를 최적화하는 기법**입니다.

**탈출 분석의 효과**

- **스레드 동기화 제거:** **동기화(lock)를 사용할 필요가 없는 객체는 자동으로 제거**
- **스택 할당(Stack Allocation):** **객체를 힙이 아닌 스택에 할당**하여 **GC(가비지 컬렉션) 부담 감소**
- **레지스터 최적화:** 객체의 값을 **메모리가 아닌 CPU 레지스터에서 관리**

**탈출 분석 활성화 방법** 기본적으로 탈출 분석은 활성화되어 있으며, **-XX:+DoEscapeAnalysis** 옵션을 사용하여 명시적으로 활성화할 수 있습니다.

```bash
java -XX:+DoEscapeAnalysis MyApplication
```

```java
public class Factorial {
    private int n;

    public Factorial(int n) {
        this.n = n;
    }

    public int getFactorial() {
        return n;
    }
}

public class Main {
    public static void main(String[] args) {
        for (int i = 0; i < 100; i++) {
            Factorial f = new Factorial(i); // 루프 내에서만 사용됨
            System.out.println(f.getFactorial());
        }
    }
}
```

이 코드에서 Factorial 객체는 **루프 내에서만 사용**되므로, 탈출 분석을 통해 **힙이 아닌 스택에서 할당**될 수 있습니다.

**주의할 점**

- 탈출 분석이 항상 최적의 성능을 보장하는 것은 아니며, 특정 환경에서는 성능이 저하될 수도 있음.
- 객체가 예상보다 더 큰 범위에서 사용되면, JVM이 탈출 분석을 제대로 수행하지 못할 가능성이 있음.

#### 역최적화

JVM이 **기존에 컴파일한 코드를 다시 인터프리터 모드로 되돌리는 과정**을 **역최적화**라고 합니다.

**역최적화가 발생하는 주요 원인**

**1. 다형성의 변화**

```java
public interface MemberRepository {
    void save(String member);
    String find(String memberId);
}

public class MemberRepositoryImpl implements MemberRepository {
    @Override
    public void save(String member) {
        System.out.println("Saving member: " + member);
    }

    @Override
    public String find(String memberId) {
        return "Member-" + memberId;
    }
}

public class LoggingMemberRepository implements MemberRepository {
    private final MemberRepository delegate;

    public LoggingMemberRepository(MemberRepository delegate) {
        this.delegate = delegate;
    }

    @Override
    public void save(String member) {
        System.out.println("[LOG] Saving member: " + member);
        delegate.save(member);
    }

    @Override
    public String find(String memberId) {
        System.out.println("[LOG] Finding member: " + memberId);
        return delegate.find(memberId);
    }
}

public class Main {
    public static void main(String[] args) {
        MemberRepository repository = new MemberRepositoryImpl(); // 초기엔 이 클래스로 최적화됨

        for (int i = 0; i < 1_000_000; i++) {
            repository.save("User-" + i);
            repository.find(String.valueOf(i));
        }

        // 로그 기능이 추가되면서 기존의 최적화된 코드가 역최적화될 가능성이 높아짐
        repository = new LoggingMemberRepository(new MemberRepositoryImpl());

        for (int i = 0; i < 1_000_000; i++) {
            repository.save("User-" + i);
            repository.find(String.valueOf(i));
        }
    }
}
```

- **초기에는 MemberRepositoryImpl만 사용**되어, **JVM은 이 클래스를 최적화하여 실행 속도를 높임.**
- 하지만 **새로운 구현체 LoggingMemberRepository가 추가되면서 다형성이 바뀜**.
- 기존의 **최적화된 코드가 더 이상 유효하지 않게 되면서 JVM은 역최적화를 수행**함.
- **JVM은** 기존의 **최적화된 코드를 폐기하고, 새로운 다형성을 반영한 코드로 다시 컴파일**함.

**2. 티어드 컴파일의 전환 과정**

- **클라이언트 컴파일러(C1)** 에서 **컴파일된 코드가 서버 컴파일러(C2)** 에서 다시 최적화될 때, 기존 코드는 더 이상 사용되지 않음.

**역최적화의 처리 방식**

- 기존 컴파일된 코드는 **"진입 불가"** 상태가 되며, 이후 새로운 최적화 코드가 생성됨.
- 일정 시간이 지나면 **"좀비 코드"**로 변환되어 코드 캐시에서 제거됨.

**주의할 점**

- 역최적화가 자주 발생하면 오히려 **JVM 성능이 불안정해질 수 있음**.
- 특정 코드를 너무 자주 최적화하고 폐기하는 경우 **불필요한 오버헤드 발생** 가능.

#### JVM 튜닝 옵션

| 튜닝 옵션 | 설명 | 추천 값 |
| --- | --- | --- |
| **-XX:CICompilerCount=N** | 컴파일 스레드 개수 조정 | CPU 개수에 맞춰 설정 |
| **-XX:MaxInlineSize=N** | 기본 인라이닝 크기 조정 | 35~50 |
| **-XX:MaxFreqInlineSize=N** | 자주 호출되는 메서드 인라이닝 크기 조정 | 325~400 |
| **-XX:+DoEscapeAnalysis** | 탈출 분석 활성화 | 기본 활성화 |
| **-XX:ReservedCodeCacheSize=N** | 코드 캐시 크기 조정 | 기본값의 2~4배 (예: 512MB) |
| **-XX:CompileThreshold=N** | C2로 전환하는 실행 횟수 조정 | 기본값(10,000) → 5,000~7,000 |
| **-XX:+TieredCompilation** | 티어드 컴파일 활성화 | 기본 활성화 (JVM 8 이상) |
| **-XX:LoopUnrollLimit** | OSR 최적화 | 50~100 |

### 웜업(Warm-up) 과정

**자바 프로그램이 실행되면 처음에는 인터프리터 방식으로 실행되다가, 일정 시간이 지나야 JIT 컴파일러가 동작하면서 성능이 최적화 된다는 것을 위에서 배웠습니다.**

이 과정에서 발생하는 초기 성능 저하를 **웜업(Warm-up)** 과정이라고 합니다.

#### 웜업이 필요한 이유

1. 처음에는 **인터프리터 방식으로 실행**하여 빠르게 시작합니다.
2. JVM이 **자주 실행되는 메서드를 감지(프로파일링)** 합니다.
3. JIT 컴파일러가 **핫스팟 코드**를 찾아 네이티브 코드로 변환합니다.
4. 실행 속도가 점점 향상됩니다.

```java
public class WarmUpTest {
    public static void main(String[] args) {
        long startTime, endTime;

        // 초기 실행 시간 측정
        startTime = System.nanoTime();
        for (int i = 0; i < 100_000; i++) {
            compute();
        }
        endTime = System.nanoTime();
        System.out.println("초기 실행 시간: " + (endTime - startTime) / 1_000_000.0 + " ms");

        // 웜업 진행 (JIT 컴파일러가 최적화할 기회를 줌)
        for (int i = 0; i < 1_000_000; i++) {
            compute();
        }

        // 최적화 후 실행 속도 측정
        startTime = System.nanoTime();
        for (int i = 0; i < 100_000; i++) {
            compute();
        }
        endTime = System.nanoTime();
        System.out.println("최적화 후 실행 시간: " + (endTime - startTime) / 1_000_000.0 + " ms");
    }

    public static int compute() {
        int sum = 0;
        for (int i = 0; i < 100; i++) {
            sum += i;
        }
        return sum;
    }
}
```

#### 실행 결과 예시

```
초기 실행 시간: 50.2 ms
최적화 후 실행 시간: 12.8 ms
```

- 처음 실행할 때는 인터프리터 방식으로 실행되므로 실행 속도가 느립니다.
- 일정 시간이 지나면서 JIT 컴파일러가 최적화를 수행하여 실행 속도가 크게 향상됩니다.

### 웜업 시간을 줄이는 방법

JIT 컴파일러는 실행 중 성능 최적화를 수행하지만, 초기 웜업 시간이 길어질 경우 성능 저하가 발생할 수 있습니다. 이를 해결하는 방법은 다음과 같습니다.

**티어드 컴파일(Tiered Compilation) 사용**

- **-XX:+TieredCompilation 옵션**을 사용하면 인터프리터와 JIT 컴파일을 동시에 활용하여 웜업 시간을 줄일 수 있습니다.

```bash
java -XX:+TieredCompilation WarmUpTest
```

**AOT 컴파일 활용**

- **jaotc(Java Ahead-Of-Time Compiler)** 를 사용하여 실행 전에 미리 네이티브 코드로 변환할 수 있습니다.
  
**AOT(Ahead-of-Time) 컴파일**은 **자바 프로그램을 실행하기 전에 미리 기계어 코드로 변환하는 방식의 컴파일 기법**입니다.  
즉, **JIT(Just-In-Time) 컴파일처럼 런타임에서 코드가 컴파일되는 것이 아니라, 애플리케이션 실행 전에 미리 컴파일**하여 성능을 향상시키는 방법입니다.

## 마무리

JVM의 JIT 컴파일러는 Java의 성능을 크게 향상시키는 핵심 기술입니다. 특히 티어드 컴파일을 통해 빠른 시작 속도와 높은 최적화 성능을 모두 얻을 수 있습니다.

효과적인 JVM 튜닝을 위해서는:
1. 애플리케이션의 특성을 파악하고
2. 적절한 JIT 컴파일러를 선택하며
3. 필요한 경우 JVM 옵션을 조정하여 최적화하는 것이 중요합니다.

이러한 이해를 바탕으로 Java 애플리케이션의 성능을 한 단계 더 향상시킬 수 있을 것입니다.