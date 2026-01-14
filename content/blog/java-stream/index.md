---
title: "Java Stream API"
date: "2025-01-14"
description: "Stream의 내부 동작 원리부터 병렬 스트림, 성능 비교까지 공식 문서 기반으로 정리합니다."
category: "개발"
tags: ["Java", "Stream", "Functional Programming", "Parallel Stream"]
---

## Stream이란?

**Stream**: 데이터 처리 연산을 선언적으로 지원하는 요소들의 시퀀스입니다.

컬렉션과 달리 요소를 저장하지 않고, 소스로부터 요소를 필요할 때 계산하는 파이프라인 구조를 가집니다.

```java
// 명령형 방식 (전통적인 for문)
List<String> filtered = new ArrayList<>();
for (String s : strings) {
    if (s.length() > 3) {
        filtered.add(s.toUpperCase());
    }
}

// 선언형 방식 (Stream)
List<String> filtered = strings.stream()
    .filter(s -> s.length() > 3)
    .map(String::toUpperCase)
    .collect(Collectors.toList());
```

---

## Collection vs Stream

| 특성 | Collection | Stream |
| --- | --- | --- |
| 데이터 저장 | 요소를 직접 저장 | 요소를 저장하지 않음 |
| 데이터 소비 | 여러 번 순회 가능 | 한 번만 소비 가능 |
| 외부/내부 반복 | 외부 반복 (for, iterator) | 내부 반복 |
| 지연 평가 | 즉시 계산 | 지연 계산 (Lazy) |
| 원본 수정 | 가능 | 불가능 (원본 유지) |

**핵심 차이**: Collection은 공간에 초점(데이터 저장), Stream은 시간에 초점(데이터 처리)을 둡니다.

---

## Stream 생성 방법

### 1. Collection으로부터 생성

```java
List<String> list = Arrays.asList("a", "b", "c");
Stream<String> stream = list.stream();
Stream<String> parallelStream = list.parallelStream();
```

### 2. 배열로부터 생성

```java
String[] arr = {"a", "b", "c"};
Stream<String> stream = Arrays.stream(arr);
Stream<String> partial = Arrays.stream(arr, 0, 2); // "a", "b"
```

### 3. Stream.of() 정적 메서드

```java
Stream<String> stream = Stream.of("a", "b", "c");
Stream<Integer> numbers = Stream.of(1, 2, 3, 4, 5);
```

### 4. Stream.iterate() - 무한 스트림

```java
// 0, 2, 4, 6, 8... 무한 생성
Stream<Integer> infinite = Stream.iterate(0, n -> n + 2);

// Java 9+: 조건부 종료
Stream<Integer> finite = Stream.iterate(0, n -> n < 100, n -> n + 2);
```

### 5. Stream.generate() - Supplier 기반

```java
// 랜덤 값 무한 생성
Stream<Double> randoms = Stream.generate(Math::random);

// 상수 값 생성
Stream<String> constants = Stream.generate(() -> "Hello");
```

### 6. 기본형 특화 스트림

```java
IntStream intStream = IntStream.range(0, 100);      // 0~99
IntStream closed = IntStream.rangeClosed(1, 100);   // 1~100
LongStream longStream = LongStream.of(1L, 2L, 3L);
DoubleStream doubleStream = DoubleStream.of(1.0, 2.0);
```

**기본형 스트림의 장점**: 오토박싱/언박싱 오버헤드 제거로 성능 향상

---

## 중간 연산 vs 최종 연산

Stream 연산은 두 종류로 나뉩니다.

### 중간 연산(Intermediate Operation)

- 다른 Stream을 반환
- **지연 평가**(Lazy): 최종 연산이 호출되기 전까지 실행되지 않음
- 여러 개를 연결하여 파이프라인 구성 가능

### 최종 연산(Terminal Operation)

- Stream이 아닌 결과를 반환 (void, Collection, 단일 값 등)
- 파이프라인을 실행하고 결과 생성
- 최종 연산 후 Stream은 소비되어 재사용 불가

```java
List<String> result = strings.stream()  // Stream 생성
    .filter(s -> s.length() > 3)        // 중간 연산
    .map(String::toUpperCase)           // 중간 연산
    .sorted()                           // 중간 연산
    .collect(Collectors.toList());      // 최종 연산
```

### 연산 분류표

| 연산 종류 | 메서드 | 반환 타입 |
| --- | --- | --- |
| 중간 | filter, map, flatMap, distinct, sorted, peek, limit, skip | Stream<T> |
| 최종 | forEach, collect, reduce, count, findFirst, findAny | void / 결과값 |
| 최종 | anyMatch, allMatch, noneMatch | boolean |
| 최종 | min, max | Optional<T> |

---

## 지연 평가(Lazy Evaluation) 동작 원리

지연 평가는 Stream의 핵심 특성입니다. 중간 연산은 **즉시 실행되지 않고** 최종 연산이 호출될 때 한꺼번에 실행됩니다.

```java
List<String> names = Arrays.asList("Kim", "Lee", "Park", "Choi", "Jung");

String result = names.stream()
    .filter(name -> {
        System.out.println("filter: " + name);
        return name.length() > 3;
    })
    .map(name -> {
        System.out.println("map: " + name);
        return name.toUpperCase();
    })
    .findFirst()
    .orElse("");

// 출력:
// filter: Kim    (길이 3, 통과 안됨)
// filter: Lee    (길이 3, 통과 안됨)
// filter: Park   (길이 4, 통과!)
// map: Park      (변환 후 즉시 반환)
```

**핵심 포인트**: `findFirst()`는 Short-Circuit 연산이므로, 조건을 만족하는 첫 요소를 찾으면 나머지 요소(`Choi`, `Jung`)는 처리하지 않습니다.

### 지연 평가의 이점

1. **불필요한 연산 회피**: Short-Circuit 연산과 결합하여 필요한 만큼만 처리
2. **메모리 효율**: 전체 데이터를 한 번에 메모리에 올리지 않음
3. **무한 스트림 처리 가능**: limit과 결합하여 무한 스트림에서도 결과 도출 가능

```java
// 무한 스트림이지만 10개만 처리
Stream.iterate(1, n -> n + 1)
    .filter(n -> n % 2 == 0)
    .limit(10)
    .forEach(System.out::println);
```

---

## 주요 연산 상세

### filter - 조건에 맞는 요소 선택

`Predicate<T>`를 받아 조건을 만족하는 요소만 통과시킵니다.

```java
List<Integer> evenNumbers = numbers.stream()
    .filter(n -> n % 2 == 0)
    .collect(Collectors.toList());
```

**Predicate**: `T -> boolean`을 반환하는 함수형 인터페이스

### map - 요소 변환

`Function<T, R>`을 받아 각 요소를 다른 타입 또는 값으로 변환합니다.

```java
List<String> upperNames = names.stream()
    .map(String::toUpperCase)
    .collect(Collectors.toList());

// 객체에서 특정 필드 추출
List<String> productNames = products.stream()
    .map(Product::getName)
    .collect(Collectors.toList());
```

### map vs flatMap

`map`은 1:1 변환, `flatMap`은 1:N 변환 후 평탄화입니다.

```java
// map: 각 문자열을 문자 배열로 변환 -> Stream<String[]>
List<String[]> mapped = words.stream()
    .map(word -> word.split(""))
    .collect(Collectors.toList());

// flatMap: 각 문자열을 문자 스트림으로 변환 후 하나로 합침 -> Stream<String>
List<String> flatMapped = words.stream()
    .map(word -> word.split(""))
    .flatMap(Arrays::stream)
    .distinct()
    .collect(Collectors.toList());
```

**실전 예시**: 중첩 컬렉션 처리

```java
List<List<Integer>> nestedList = Arrays.asList(
    Arrays.asList(1, 2, 3),
    Arrays.asList(4, 5, 6),
    Arrays.asList(7, 8, 9)
);

// flatMap으로 평탄화
List<Integer> flatList = nestedList.stream()
    .flatMap(Collection::stream)
    .collect(Collectors.toList());
// 결과: [1, 2, 3, 4, 5, 6, 7, 8, 9]
```

### reduce - 요소 결합

스트림의 모든 요소를 하나의 결과로 결합합니다.

```java
// 형태 1: 초기값 + BinaryOperator
int sum = numbers.stream()
    .reduce(0, (a, b) -> a + b);

// 형태 2: BinaryOperator만 (결과가 Optional)
Optional<Integer> max = numbers.stream()
    .reduce(Integer::max);

// 형태 3: 초기값 + BiFunction + BinaryOperator (병렬 처리용)
int totalLength = strings.stream()
    .reduce(0,
        (acc, str) -> acc + str.length(),  // accumulator
        (a, b) -> a + b);                   // combiner
```

### collect - Collector로 결과 수집

Collector를 사용하여 스트림 요소를 다양한 형태로 수집합니다.

```java
// toList - 리스트로 수집
List<String> list = stream.collect(Collectors.toList());

// toSet - 셋으로 수집
Set<String> set = stream.collect(Collectors.toSet());

// toMap - 맵으로 수집
Map<Long, String> map = users.stream()
    .collect(Collectors.toMap(User::getId, User::getName));

// joining - 문자열 연결
String joined = strings.stream()
    .collect(Collectors.joining(", ", "[", "]"));
// 결과: "[a, b, c]"

// groupingBy - 그룹화
Map<String, List<Product>> byCategory = products.stream()
    .collect(Collectors.groupingBy(Product::getCategory));

// partitioningBy - 이분할
Map<Boolean, List<Integer>> partitioned = numbers.stream()
    .collect(Collectors.partitioningBy(n -> n % 2 == 0));
// {true=[2,4,6], false=[1,3,5]}
```

### sorted - 정렬

Comparator를 사용하여 정렬합니다.

```java
// 자연 순서 정렬
List<String> sorted = names.stream()
    .sorted()
    .collect(Collectors.toList());

// 커스텀 정렬
List<Person> byAge = people.stream()
    .sorted(Comparator.comparing(Person::getAge))
    .collect(Collectors.toList());

// 역순 정렬
List<Person> byAgeDesc = people.stream()
    .sorted(Comparator.comparing(Person::getAge).reversed())
    .collect(Collectors.toList());

// 다중 조건 정렬
List<Person> sorted = people.stream()
    .sorted(Comparator.comparing(Person::getAge)
        .thenComparing(Person::getName))
    .collect(Collectors.toList());
```

### distinct, limit, skip

```java
// distinct - 중복 제거 (equals 기반)
List<Integer> unique = numbers.stream()
    .distinct()
    .collect(Collectors.toList());

// limit - 처음 N개만
List<String> firstThree = names.stream()
    .limit(3)
    .collect(Collectors.toList());

// skip - 처음 N개 건너뛰기
List<String> afterTwo = names.stream()
    .skip(2)
    .collect(Collectors.toList());

// 페이징 구현
List<Product> page = products.stream()
    .skip(pageNumber * pageSize)
    .limit(pageSize)
    .collect(Collectors.toList());
```

### peek - 디버깅용 중간 연산

각 요소에 대해 작업을 수행하되, 요소를 변경하지 않고 그대로 전달합니다.

```java
List<String> result = names.stream()
    .filter(n -> n.length() > 3)
    .peek(n -> System.out.println("Filtered: " + n))
    .map(String::toUpperCase)
    .peek(n -> System.out.println("Mapped: " + n))
    .collect(Collectors.toList());
```

**주의**: peek은 디버깅 용도로 설계되었습니다. 부수 효과를 주는 용도로 사용하지 마세요.

---

## Short-Circuit 연산

전체 스트림을 처리하지 않고 조기에 결과를 반환할 수 있는 연산입니다.

### findFirst / findAny

```java
// findFirst - 첫 번째 요소 (순서 보장)
Optional<String> first = names.stream()
    .filter(n -> n.startsWith("K"))
    .findFirst();

// findAny - 아무 요소나 (병렬 처리에서 성능 이점)
Optional<String> any = names.parallelStream()
    .filter(n -> n.startsWith("K"))
    .findAny();
```

### anyMatch / allMatch / noneMatch

```java
// anyMatch - 하나라도 조건 만족?
boolean hasLongName = names.stream()
    .anyMatch(n -> n.length() > 10);

// allMatch - 모두 조건 만족?
boolean allAdult = people.stream()
    .allMatch(p -> p.getAge() >= 18);

// noneMatch - 모두 조건 불만족?
boolean noEmpty = strings.stream()
    .noneMatch(String::isEmpty);
```

---

## Stream 내부 동작

### Spliterator

**Spliterator**(Splittable Iterator): Stream의 소스 요소를 탐색하고 분할하는 내부 반복자입니다.

```java
public interface Spliterator<T> {
    boolean tryAdvance(Consumer<? super T> action);  // 요소 하나 처리
    Spliterator<T> trySplit();  // 분할 (병렬 처리용)
    long estimateSize();        // 남은 요소 수 추정
    int characteristics();      // 특성 비트 플래그
}
```

**특성 플래그**:
- `ORDERED`: 순서가 정의됨
- `DISTINCT`: 중복 없음
- `SORTED`: 정렬됨
- `SIZED`: 크기를 알 수 있음
- `NONNULL`: null 요소 없음
- `IMMUTABLE`: 수정 불가
- `CONCURRENT`: 동시 수정 가능
- `SUBSIZED`: 분할 후에도 크기 알 수 있음

### 파이프라인 실행 구조

```
Source → Spliterator → Intermediate Ops → Terminal Op → Result
         (요소 제공)    (지연된 변환들)     (실행 트리거)
```

Stream 파이프라인은 내부적으로 **ReferencePipeline** 체인으로 구성됩니다.

각 중간 연산은 새로운 파이프라인 스테이지를 생성하고, 최종 연산이 호출되면 역방향으로 Sink 체인을 구성하여 요소를 처리합니다.

---

## 병렬 스트림(Parallel Stream)

### 생성 방법

```java
// 방법 1: parallelStream()으로 생성
Stream<String> parallel1 = list.parallelStream();

// 방법 2: 기존 스트림을 병렬로 전환
Stream<String> parallel2 = list.stream().parallel();

// 직렬로 되돌리기
Stream<String> sequential = parallel2.sequential();
```

### 내부 동작: ForkJoinPool

병렬 스트림은 기본적으로 **공통 ForkJoinPool**을 사용합니다.

```java
// 기본 스레드 수: Runtime.getRuntime().availableProcessors() - 1
// 예: 8코어 CPU → 7개의 워커 스레드

// 커스텀 ForkJoinPool 사용
ForkJoinPool customPool = new ForkJoinPool(4);
customPool.submit(() ->
    list.parallelStream()
        .filter(...)
        .collect(Collectors.toList())
).get();
```

### 병렬 스트림을 사용하면 안 되는 경우

**1. 데이터 소스가 분할하기 어려울 때**

```java
// LinkedList는 분할 효율이 나쁨 (인덱스 접근 O(n))
LinkedList<Integer> linkedList = new LinkedList<>();
linkedList.parallelStream()...  // 비효율적

// ArrayList는 분할 효율이 좋음 (인덱스 접근 O(1))
ArrayList<Integer> arrayList = new ArrayList<>();
arrayList.parallelStream()...   // 효율적
```

**분할 효율 순위**:
1. ArrayList, IntStream.range: 매우 좋음
2. HashSet, TreeSet: 좋음
3. LinkedList, Stream.iterate: 나쁨

**2. 요소 개수가 적을 때**

병렬화 오버헤드(스레드 생성, 작업 분배, 결과 병합)가 이득보다 큼

**3. 연산 비용이 낮을 때**

```java
// 단순 연산은 병렬화 이득 없음
list.parallelStream()
    .filter(n -> n > 0)  // 너무 단순한 연산
    .count();
```

**4. 순서가 중요할 때**

```java
// 순서 보장 필요 시 forEachOrdered 사용 (성능 저하)
list.parallelStream()
    .forEachOrdered(System.out::println);
```

**5. 공유 상태를 수정할 때**

```java
// 잘못된 예: 공유 상태 수정
List<Integer> result = new ArrayList<>();
numbers.parallelStream()
    .filter(n -> n > 0)
    .forEach(result::add);  // 동시성 문제!

// 올바른 예: collect 사용
List<Integer> result = numbers.parallelStream()
    .filter(n -> n > 0)
    .collect(Collectors.toList());
```

### 병렬 스트림이 효과적인 경우

```java
// CPU 집약적인 연산
list.parallelStream()
    .map(this::expensiveComputation)
    .collect(Collectors.toList());

// 대용량 데이터 + 독립적인 연산
IntStream.range(0, 10_000_000)
    .parallel()
    .filter(n -> isPrime(n))
    .count();
```

---

## Stream vs for문 성능 비교

### Stream의 오버헤드

```java
// for문: 직접적인 배열 접근
int sum = 0;
for (int i = 0; i < arr.length; i++) {
    sum += arr[i];
}

// Stream: 객체 생성 오버헤드
int sum = Arrays.stream(arr)
    .sum();
```

**Stream 생성 시 발생하는 오버헤드**:
1. Stream 파이프라인 객체 생성
2. Spliterator 객체 생성
3. 람다 표현식을 위한 객체 생성
4. 박싱/언박싱 (기본형 미사용 시)

### 벤치마크 예시

```java
// 단순 합계: for문이 빠름
// 100만 요소 기준
for문: ~0.5ms
Stream: ~1.5ms
Parallel Stream: ~0.8ms (병렬화 오버헤드로 기대만큼 빠르지 않음)

// 복잡한 연산: Stream이 유리할 수 있음
// 각 요소에 대해 비용이 큰 연산 수행 시
for문: ~500ms
Stream: ~520ms
Parallel Stream: ~150ms (병렬화 효과 발휘)
```

### 언제 for문이 나은가?

- 단순 반복 (합계, 최대값 등)
- 요소 개수가 적을 때 (수천 개 미만)
- 인덱스가 필요할 때
- 성능이 극도로 중요할 때
- 조기 종료(break) 조건이 복잡할 때

### 언제 Stream이 나은가?

- 가독성과 유지보수성이 중요할 때
- 복잡한 데이터 변환 파이프라인
- 병렬 처리가 필요할 때
- 함수형 스타일 코드베이스

```java
// for문이 읽기 어려운 경우 → Stream 권장
Map<String, List<Person>> grouped = new HashMap<>();
for (Person p : people) {
    String city = p.getCity();
    if (!grouped.containsKey(city)) {
        grouped.put(city, new ArrayList<>());
    }
    grouped.get(city).add(p);
}

// Stream으로 간결하게
Map<String, List<Person>> grouped = people.stream()
    .collect(Collectors.groupingBy(Person::getCity));
```

---

## 실전 패턴 및 주의사항

### 1. Stream은 재사용 불가

```java
Stream<String> stream = names.stream();
long count = stream.count();
List<String> list = stream.collect(Collectors.toList()); // IllegalStateException!

// 해결: 필요할 때마다 새 스트림 생성
Supplier<Stream<String>> streamSupplier = () -> names.stream();
long count = streamSupplier.get().count();
List<String> list = streamSupplier.get().collect(Collectors.toList());
```

### 2. Optional과 Stream 조합

```java
// Java 8
Optional<String> opt = ...;
if (opt.isPresent()) {
    stream = Stream.of(opt.get());
} else {
    stream = Stream.empty();
}

// Java 9+
Stream<String> stream = opt.stream();

// flatMap으로 Optional 처리
List<String> names = people.stream()
    .map(Person::getNickname)        // Optional<String> 반환
    .flatMap(Optional::stream)       // 값이 있는 것만 통과
    .collect(Collectors.toList());
```

### 3. Checked Exception 처리

Stream의 함수형 인터페이스는 checked exception을 던질 수 없습니다.

```java
// 컴파일 에러
list.stream()
    .map(s -> new URL(s))  // MalformedURLException!
    .collect(Collectors.toList());

// 해결 1: try-catch로 감싸기
list.stream()
    .map(s -> {
        try {
            return new URL(s);
        } catch (MalformedURLException e) {
            throw new RuntimeException(e);
        }
    })
    .collect(Collectors.toList());

// 해결 2: 래퍼 메서드 정의
@FunctionalInterface
interface ThrowingFunction<T, R> {
    R apply(T t) throws Exception;
}

static <T, R> Function<T, R> wrap(ThrowingFunction<T, R> f) {
    return t -> {
        try {
            return f.apply(t);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    };
}

// 사용
list.stream()
    .map(wrap(s -> new URL(s)))
    .collect(Collectors.toList());
```

### 4. 무한 스트림 처리

```java
// 반드시 limit 또는 Short-Circuit 연산과 함께 사용
Stream.iterate(0, n -> n + 1)
    .limit(100)  // 필수!
    .forEach(System.out::println);

// Short-Circuit으로 종료
Stream.iterate(1, n -> n * 2)
    .filter(n -> n > 1000)
    .findFirst();  // 무한루프 방지
```

### 5. 상태를 가진 람다 피하기

```java
// 잘못된 예: 외부 상태 의존
int[] counter = {0};
list.stream()
    .peek(x -> counter[0]++)  // 상태 변경!
    .collect(Collectors.toList());

// 올바른 예: 순수 함수 사용
long count = list.stream()
    .count();
```

### 6. null 값 처리

```java
// Stream.of(null)은 NullPointerException
Stream.of(null);  // NPE!

// null 체크 후 스트림 생성
Stream<String> stream = (list != null) ? list.stream() : Stream.empty();

// null 요소 필터링
list.stream()
    .filter(Objects::nonNull)
    .collect(Collectors.toList());
```

---

## 정리

| 개념 | 핵심 포인트 |
| --- | --- |
| Stream 정의 | 데이터 처리 파이프라인, 요소를 저장하지 않음 |
| 중간 연산 | 지연 평가, Stream 반환, 파이프라인 구성 |
| 최종 연산 | 파이프라인 실행, 결과 생성, 스트림 소비 |
| 지연 평가 | 최종 연산 호출 시 실행, 불필요한 연산 회피 |
| 병렬 스트림 | ForkJoinPool 사용, 분할 효율 좋은 소스에서 효과적 |
| 성능 | 단순 연산은 for문, 복잡한 파이프라인은 Stream |

**Stream 선택 기준**:
1. 코드 가독성이 중요하다 → Stream
2. 복잡한 데이터 변환이 필요하다 → Stream
3. 병렬 처리가 필요하다 → Parallel Stream
4. 극한의 성능이 필요하다 → for문
5. 인덱스 접근이 필요하다 → for문
