---
title: "MySQL 히스토그램으로 쿼리 성능 개선하기"
date: "2025-10-18"
description: "MySQL 8.0 히스토그램을 활용하여 데이터 분포를 정확히 파악하고 실행 계획을 개선하는 방법을 실무 예제와 함께 설명합니다."
tags: ["MySQL", "Database", "Performance", "Histogram", "Optimizer"]
---

## 기존 통계 정보의 한계

MySQL 5.7까지의 통계 정보는 치명적인 약점이 있었습니다. **데이터 분포를 전혀 알 수 없다는 점**입니다.

### 평균만 알려주는 통계

100만 건의 주문 테이블에서 사용자별 통계를 보겠습니다.

```sql
-- 통계 정보
전체 레코드: 1,000,000건
유니크한 user_id: 10,000개
```

옵티마이저는 이렇게 계산합니다.

```
평균 주문 건수 = 1,000,000 / 10,000 = 100건
```

**실제 데이터 분포**

```sql
SELECT user_id, COUNT(*) as order_count
FROM orders
GROUP BY user_id
ORDER BY order_count DESC
LIMIT 5;
```

| user_id | order_count |
|---------|-------------|
| 1001 | 50000 |
| 1002 | 45000 |
| 1003 | 30000 |
| ... | ... |
| 9999 | 1 |

실제로는 소수의 VIP 고객이 대부분의 주문을 차지하지만, 옵티마이저는 모든 사용자가 평균 100건씩 주문했다고 가정합니다.

### 잘못된 실행 계획의 결과

```sql
SELECT *
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
WHERE o.user_id = 1001;  -- VIP 고객 (50000건)
```

**옵티마이저 판단 (히스토그램 없이)**

- user_id = 1001은 대략 100건일 것이다
- orders 테이블을 먼저 읽고 order_items와 조인하면 되겠다

**실제 실행**

- orders에서 50000건 조회
- order_items와 50000번 조인
- 예상보다 500배 많은 데이터 처리

이런 상황에서 히스토그램이 필요합니다.

## 히스토그램이란?

히스토그램은 칼럼값의 **분포도**를 저장하는 통계 정보입니다. MySQL 8.0부터 지원됩니다.

**평균 vs 분포**

| 구분 | 기존 통계 | 히스토그램 |
|------|----------|-----------|
| 제공 정보 | 평균 | 구간별 분포 |
| user_id=1001 예측 | 100건 | 50000건 |
| user_id=9999 예측 | 100건 | 1건 |
| 정확도 | 낮음 | 높음 |

히스토그램을 사용하면 옵티마이저가 실제 데이터 분포를 알고 더 정확한 실행 계획을 수립할 수 있습니다.

## 히스토그램 종류

MySQL 8.0은 두 가지 히스토그램을 지원합니다.

### Singleton 히스토그램

**값별로** 레코드 건수를 관리합니다. 값의 개수가 적을 때 사용됩니다.

```sql
-- 성별 칼럼 (값이 2개)
ANALYZE TABLE employees UPDATE HISTOGRAM ON gender;

SELECT
    COLUMN_NAME,
    JSON_EXTRACT(HISTOGRAM, '$.histogram-type') as type
FROM information_schema.COLUMN_STATISTICS
WHERE SCHEMA_NAME = 'employees' AND TABLE_NAME = 'employees';
```

**히스토그램 데이터 예시**

```json
{
  "buckets": [
    [1, 0.6],    // 'M': 60%
    [2, 1.0]     // 'F': 40% (누적 100%)
  ],
  "data-type": "enum",
  "histogram-type": "singleton"
}
```

**해석**

- 남성('M'): 60%
- 여성('F'): 40% (1.0 - 0.6)

모든 값이 누적 비율로 표시됩니다.

### Equi-Height 히스토그램

**범위별로** 레코드 건수를 관리합니다. 값의 개수가 많을 때 사용됩니다.

```sql
-- 입사일 칼럼 (값이 수천 개)
ANALYZE TABLE employees UPDATE HISTOGRAM ON hire_date;
```

**히스토그램 데이터 예시**

```json
{
  "buckets": [
    ["1985-01-01", "1990-12-31", 0.25, 1500],  // 1980년대: 25%
    ["1991-01-01", "1995-12-31", 0.50, 1200],  // 1990년대 전반: 25%
    ["1996-01-01", "2000-12-31", 0.75, 1300],  // 1990년대 후반: 25%
    ["2001-01-01", "2005-12-31", 1.00, 1400]   // 2000년대: 25%
  ],
  "histogram-type": "equi-height"
}
```

각 버킷은 **비슷한 레코드 건수**를 갖도록 범위가 나뉩니다.

**버킷 구성**

- 범위 시작값
- 범위 종료값
- 누적 비율
- 유니크 값 개수

## 히스토그램 생성 및 관리

### 히스토그램 생성

```sql
-- 단일 칼럼
ANALYZE TABLE orders UPDATE HISTOGRAM ON user_id;

-- 여러 칼럼
ANALYZE TABLE orders UPDATE HISTOGRAM ON user_id, product_id, amount;

-- 버킷 개수 지정 (기본값 100, 최대 1024)
ANALYZE TABLE orders UPDATE HISTOGRAM ON user_id WITH 200 BUCKETS;
```

### 히스토그램 확인

```sql
-- 히스토그램 목록 조회
SELECT
    SCHEMA_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    JSON_EXTRACT(HISTOGRAM, '$.histogram-type') as type,
    JSON_EXTRACT(HISTOGRAM, '$.number-of-buckets-specified') as buckets
FROM information_schema.COLUMN_STATISTICS;
```

| SCHEMA_NAME | TABLE_NAME | COLUMN_NAME | type | buckets |
|-------------|-----------|-------------|------|---------|
| mydb | orders | user_id | "equi-height" | 100 |
| mydb | orders | amount | "equi-height" | 100 |

### 히스토그램 삭제

```sql
-- 히스토그램 삭제 (즉시 완료, 데이터는 건드리지 않음)
ANALYZE TABLE orders DROP HISTOGRAM ON user_id, amount;
```

히스토그램 삭제는 딕셔너리 정보만 제거하므로 빠르게 완료됩니다. 하지만 삭제 후 실행 계획이 달라질 수 있으니 주의해야 합니다.

## 히스토그램의 성능 개선 효과

### 조건절 예측 정확도 향상

히스토그램이 없을 때와 있을 때의 차이를 비교해보겠습니다.

```sql
-- 히스토그램 없이 실행
EXPLAIN
SELECT *
FROM employees
WHERE first_name = 'Zita'
  AND birth_date BETWEEN '1950-01-01' AND '1960-01-01';
```

| rows | filtered | 예상 건수 |
|------|----------|----------|
| 224 | 11.11% | 24.8건 |

옵티마이저는 birth_date가 균등 분포라고 가정하여 11.11%를 예측했습니다.

```sql
-- 히스토그램 생성
ANALYZE TABLE employees UPDATE HISTOGRAM ON birth_date;

-- 다시 실행
EXPLAIN
SELECT *
FROM employees
WHERE first_name = 'Zita'
  AND birth_date BETWEEN '1950-01-01' AND '1960-01-01';
```

| rows | filtered | 예상 건수 |
|------|----------|----------|
| 224 | 60.82% | 136.2건 |

히스토그램을 사용하니 실제 데이터 분포를 반영하여 60.82%로 정확히 예측했습니다.

**실제 데이터 확인**

```sql
SELECT
    COUNT(*) as total,
    SUM(CASE WHEN birth_date BETWEEN '1950-01-01' AND '1960-01-01'
        THEN 1 ELSE 0 END) as matched,
    ROUND(SUM(CASE WHEN birth_date BETWEEN '1950-01-01' AND '1960-01-01'
        THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as ratio
FROM employees
WHERE first_name = 'Zita';
```

| total | matched | ratio |
|-------|---------|-------|
| 224 | 143 | 63.84% |

히스토그램 예측(60.82%)이 실제 비율(63.84%)에 매우 근접합니다.

### 조인 순서 최적화

히스토그램은 조인 순서 결정에 큰 영향을 미칩니다.

```sql
-- 두 테이블 조인
SELECT *
FROM salaries s
INNER JOIN employees e ON e.emp_no = s.emp_no
    AND e.birth_date BETWEEN '1950-01-01' AND '1950-02-01'
WHERE s.salary BETWEEN 40000 AND 70000;
```

**조인 순서별 성능 차이**

| 조인 순서 | 실행 시간 | 드라이빙 테이블 건수 |
|----------|----------|-------------------|
| employees → salaries | 0.13초 | 소수 |
| salaries → employees | 1.29초 | 다수 |

거의 10배 차이입니다.

**히스토그램이 없으면**

- birth_date와 salary 칼럼의 데이터 분포를 모름
- 테이블 크기만 보고 조인 순서 결정
- 잘못된 순서 선택 가능성 높음

**히스토그램이 있으면**

- 각 조건에 일치하는 레코드 수를 정확히 예측
- 적은 건수를 반환하는 테이블을 드라이빙으로 선택
- 최적의 조인 순서 자동 선택

InnoDB 버퍼 풀에 데이터가 없는 경우 디스크 I/O까지 발생하면 수십 배 이상 차이가 날 수 있습니다.

## 히스토그램 vs 인덱스

### 인덱스가 있는 칼럼은 어떻게 되나?

결론부터 말하면, **인덱스가 있는 칼럼은 히스토그램을 사용하지 않습니다.**

```sql
-- user_id에 인덱스가 있는 경우
SELECT * FROM orders WHERE user_id = 1001;
```

옵티마이저는 히스토그램 대신 **인덱스 다이브**(Index Dive)를 수행합니다.

**인덱스 다이브**

- 실제 인덱스 B-Tree를 탐색
- 검색 조건의 실제 값에 대해 샘플링 수행
- 히스토그램보다 정확함

인덱스 다이브는 실제 데이터를 직접 확인하므로 히스토그램보다 항상 정확합니다.

### 히스토그램을 만들어야 하는 칼럼

**인덱스가 없는 칼럼**

```sql
-- 조회는 자주 하지만 인덱스를 만들기엔 애매한 칼럼
ANALYZE TABLE orders UPDATE HISTOGRAM ON amount, status, created_date;
```

- WHERE 조건에 자주 사용되지만 인덱스는 없는 칼럼
- 조인 조건이지만 인덱스를 만들기 어려운 칼럼
- 데이터 분포가 균등하지 않은 칼럼

**인덱스가 있어도 도움이 되는 경우**

```sql
-- 복합 조건
SELECT *
FROM orders
WHERE user_id = 1001          -- 인덱스 있음
  AND amount > 100000         -- 인덱스 없음, 히스토그램 활용
  AND status = 'COMPLETED';   -- 인덱스 없음, 히스토그램 활용
```

user_id는 인덱스를 사용하고, amount와 status는 히스토그램으로 정확도를 높입니다.

## 실무 가이드

### MySQL 8.0.19 미만 버전 주의

MySQL 8.0.19 이전 버전은 히스토그램 생성 시 **무조건 풀 테이블 스캔**을 수행합니다.

```sql
-- 8.0.19 미만: 전체 테이블 스캔 (주의!)
ANALYZE TABLE large_orders UPDATE HISTOGRAM ON user_id;
```

대용량 테이블이라면 서비스 시간대를 피해 실행해야 합니다.

**8.0.19 이상 버전**

InnoDB 자체 샘플링 알고리즘을 사용하여 풀 스캔 없이 히스토그램을 생성합니다.

```sql
-- 샘플링 메모리 크기 조정 (기본 20MB)
SET GLOBAL histogram_generation_max_mem_size = 20971520;
```

### 히스토그램 비활성화

히스토그램을 삭제하지 않고 사용만 중단하려면:

```sql
-- 전역 설정
SET GLOBAL optimizer_switch = 'condition_fanout_filter=off';

-- 현재 세션만
SET SESSION optimizer_switch = 'condition_fanout_filter=off';

-- 특정 쿼리만
SELECT /*+ SET_VAR(optimizer_switch='condition_fanout_filter=off') */
    *
FROM orders
WHERE user_id = 1001;
```

condition_fanout_filter 옵션은 히스토그램을 포함한 여러 최적화 기능을 제어하므로 신중하게 사용해야 합니다.

### 버킷 개수 설정

```sql
-- 기본값 100 (대부분 충분함)
ANALYZE TABLE orders UPDATE HISTOGRAM ON user_id;

-- 값의 종류가 매우 많은 경우
ANALYZE TABLE orders UPDATE HISTOGRAM ON user_id WITH 200 BUCKETS;
```

일반적으로 100개 버킷이면 충분합니다. 최대 1024개까지 설정 가능하지만, 200개를 넘으면 효과가 크지 않습니다.

### 히스토그램 갱신 시점

히스토그램은 자동으로 갱신되지 않습니다. 수동으로 갱신해야 합니다.

**갱신 시점**

```sql
-- 대량 데이터 변경 후
DELETE FROM orders WHERE created_at < '2020-01-01';
ANALYZE TABLE orders UPDATE HISTOGRAM ON user_id, amount;

-- 데이터 분포가 크게 바뀐 경우
-- 예: 특정 프로모션으로 특정 상품 주문 급증
ANALYZE TABLE orders UPDATE HISTOGRAM ON product_id;
```

정기적인 갱신보다는 의미 있는 변화가 있을 때 갱신하는 것이 효율적입니다.

## 요약

**핵심 포인트**

1. 히스토그램은 칼럼의 데이터 분포를 저장하여 옵티마이저의 예측 정확도를 높입니다.
2. Singleton 히스토그램은 값이 적을 때, Equi-Height는 값이 많을 때 사용됩니다.
3. 조인 순서 최적화로 10배 이상 성능 차이가 발생할 수 있습니다.
4. 인덱스가 있는 칼럼은 인덱스 다이브를 사용하므로 히스토그램이 불필요합니다.
5. MySQL 8.0.19 미만 버전은 풀 테이블 스캔이 발생하므로 주의해야 합니다.

**실무 권장 사항**

```sql
-- 인덱스 없는 칼럼 중 WHERE/JOIN 조건에 자주 사용되는 칼럼
ANALYZE TABLE orders UPDATE HISTOGRAM ON amount, status;

-- 대량 데이터 변경 후 갱신
ANALYZE TABLE orders UPDATE HISTOGRAM ON user_id;

-- 불필요한 히스토그램 제거
ANALYZE TABLE orders DROP HISTOGRAM ON unused_column;
```

다음 포스트에서는 MySQL 코스트 모델을 통해 옵티마이저가 실행 계획의 비용을 어떻게 계산하는지 알아보겠습니다.
