---
title: "MySQL 코스트 모델 이해하기"
date: "2025-10-19"
description: "MySQL 옵티마이저가 실행 계획의 비용을 계산하는 코스트 모델의 동작 원리와 활용 방법을 설명합니다."
category: "개발"
tags: ["MySQL", "Database", "Performance", "Optimizer", "Cost Model"]
---

## 코스트 모델이란?

MySQL 옵티마이저는 여러 실행 계획 중에서 가장 **비용이 낮은** 계획을 선택합니다. 이때 비용을 계산하는 기준이 **코스트 모델**(Cost Model)입니다.

### 쿼리 실행에 필요한 작업들

```sql
SELECT *
FROM orders o
INNER JOIN customers c ON o.customer_id = c.id
WHERE o.amount > 10000
ORDER BY o.created_at;
```

이 쿼리를 실행하려면:

1. 디스크에서 데이터 페이지 읽기
2. InnoDB 버퍼 풀에서 데이터 페이지 읽기
3. 인덱스 키 비교
4. WHERE 조건 레코드 평가
5. 정렬을 위한 임시 테이블 생성
6. 조인 수행

각 작업마다 비용이 다릅니다. 디스크 읽기는 메모리 읽기보다 느리고, 정렬은 단순 비교보다 비쌉니다.

### 코스트 모델의 역할

```
실행 계획 A = (디스크 읽기 × 100) + (메모리 읽기 × 1000) + (키 비교 × 500)
실행 계획 B = (디스크 읽기 × 10) + (메모리 읽기 × 5000) + (키 비교 × 2000)
```

옵티마이저는 이런 식으로 각 실행 계획의 총 비용을 계산하고, 가장 비용이 낮은 계획을 선택합니다.

## MySQL 5.7 이전 vs 5.7+

### MySQL 5.7 이전: 하드코딩된 비용

각 단위 작업의 비용이 MySQL 소스 코드에 상수로 고정되어 있었습니다.

```cpp
// MySQL 소스 코드 (의사 코드)
const double DISK_READ_COST = 1.0;
const double MEMORY_READ_COST = 0.25;
const double KEY_COMPARE_COST = 0.05;
```

**문제점**

- 서버 하드웨어가 바뀌어도 비용은 동일
- 사용자가 조정 불가능

### MySQL 5.7+: 조정 가능한 코스트 모델

비용 정보를 시스템 테이블에 저장하여 관리자가 조정할 수 있게 되었습니다.

```sql
-- 코스트 모델 테이블 확인
SELECT * FROM mysql.server_cost;
SELECT * FROM mysql.engine_cost;
```

MySQL 8.0에서는 히스토그램과 버퍼 풀 메모리 적재 비율까지 반영하여 정확도가 더 높아졌습니다.

## 코스트 모델 구성

### server_cost 테이블

쿼리 처리 과정의 일반적인 작업 비용을 관리합니다.

```sql
SELECT
    cost_name,
    default_value,
    cost_value,
    comment
FROM mysql.server_cost;
```

| cost_name | default_value | 설명 |
|-----------|--------------|------|
| disk_temptable_create_cost | 20.00 | 디스크 임시 테이블 생성 |
| disk_temptable_row_cost | 0.50 | 디스크 임시 테이블 레코드 읽기 |
| key_compare_cost | 0.05 | 인덱스 키 비교 |
| memory_temptable_create_cost | 1.00 | 메모리 임시 테이블 생성 |
| memory_temptable_row_cost | 0.10 | 메모리 임시 테이블 레코드 읽기 |
| row_evaluate_cost | 0.10 | 레코드 조건 평가 |

### engine_cost 테이블

스토리지 엔진별 작업 비용을 관리합니다.

```sql
SELECT
    engine_name,
    cost_name,
    default_value,
    cost_value,
    comment
FROM mysql.engine_cost;
```

| engine_name | cost_name | default_value | 설명 |
|------------|-----------|--------------|------|
| default | io_block_read_cost | 1.00 | 디스크 데이터 페이지 읽기 |
| default | memory_block_read_cost | 0.25 | 메모리 데이터 페이지 읽기 |

**engine_name**

- **default**: 모든 스토리지 엔진에 적용되는 기본값
- **InnoDB**, **MyISAM**, **MEMORY**: 특정 엔진별로 다른 값 설정 가능

현재는 InnoDB에서만 코스트 모델이 의미 있게 작동합니다.

## 단위 작업 비용이 미치는 영향

각 비용을 조정하면 옵티마이저의 선택이 달라집니다. 하지만 **절대 함부로 변경하지 마세요.**

### row_evaluate_cost

레코드 조건 평가 비용입니다.

**값을 높이면**

```sql
-- 많은 레코드를 평가하는 풀 테이블 스캔이 비쌈
-- 적은 레코드를 평가하는 인덱스 레인지 스캔이 선호됨
```

풀 테이블 스캔보다 인덱스 레인지 스캔을 선택할 가능성이 높아집니다.

### key_compare_cost

인덱스 키 비교 비용입니다.

**값을 높이면**

```sql
-- 정렬(ORDER BY)처럼 키 비교가 많은 작업이 비쌈
-- 가능하면 정렬을 피하는 실행 계획 선택
```

정렬을 수행하지 않는 방향의 실행 계획을 선택할 가능성이 높아집니다.

### io_block_read_cost

디스크 읽기 비용입니다.

**값을 높이면**

```sql
-- 디스크 읽기가 많은 인덱스는 비쌈
-- InnoDB 버퍼 풀에 많이 적재된 인덱스를 선호
```

버퍼 풀 적중률이 높은 인덱스를 사용할 가능성이 높아집니다.

### memory_block_read_cost

메모리 읽기 비용입니다.

**값을 높이면**

```sql
-- 메모리 읽기도 비싸다고 판단
-- 버퍼 풀 적중률이 낮아도 해당 인덱스를 사용 가능
```

버퍼 풀에 적재되지 않았어도 효율적인 인덱스라면 사용할 가능성이 높아집니다.

### disk_temptable_create_cost

디스크 임시 테이블 생성 비용입니다.

**값을 높이면**

```sql
-- 디스크 임시 테이블 생성을 회피
-- GROUP BY, ORDER BY를 인덱스로 처리하려 시도
```

임시 테이블을 만들지 않는 방향의 실행 계획을 선택할 가능성이 높아집니다.


### 기본 EXPLAIN

일반적인 EXPLAIN은 비용을 보여주지 않습니다.

```sql
EXPLAIN
SELECT *
FROM employees
WHERE first_name = 'Matt';
```

| id | select_type | table | type | key | rows | filtered |
|----|-------------|-------|------|-----|------|----------|
| 1 | SIMPLE | employees | ref | ix_firstname | 233 | 100.00 |

예상 레코드 수(rows)만 표시되고 **비용은 표시되지 않습니다.**

### EXPLAIN FORMAT=TREE

간단하게 비용을 확인할 수 있습니다.

```sql
EXPLAIN FORMAT=TREE
SELECT *
FROM employees
WHERE first_name = 'Matt';
```

**결과**

```
-> Index lookup on employees using ix_firstname (first_name='Matt')
   (cost=256.10 rows=233)
```

**해석**

- **cost=256.10**: 예상 비용
- **rows=233**: 예상 레코드 수

**더 복잡한 쿼리 예시**

```sql
EXPLAIN FORMAT=TREE
SELECT *
FROM employees
WHERE first_name = 'Matt'
  AND hire_date > '1990-01-01'
ORDER BY birth_date;
```

**결과**

```
-> Sort: employees.birth_date  (cost=285.33 rows=77)
    -> Filter: (employees.hire_date > '1990-01-01')  (cost=256.10 rows=77)
        -> Index lookup on employees using ix_firstname (first_name='Matt')
           (cost=256.10 rows=233)
```

**해석**

각 단계별로 들여쓰기되어 표시됩니다.

1. **인덱스 조회** (cost=256.10): ix_firstname 인덱스로 first_name='Matt' 검색
2. **필터링** (cost=256.10): hire_date 조건으로 233건 → 77건 필터링
3. **정렬** (cost=285.33): birth_date로 정렬

비용이 증가하는 것을 볼 수 있습니다 (256.10 → 285.33).

### EXPLAIN FORMAT=JSON

상세한 비용 정보를 확인할 수 있습니다.

```sql
EXPLAIN FORMAT=JSON
SELECT *
FROM employees
WHERE first_name = 'Matt'
```

```json
{
  "query_block": {
    "select_id": 1,
    "cost_info": {
      "query_cost": "255.08"
    },
    "table": {
      "table_name": "employees",
      "access_type": "ref",
      "key": "ix_firstname",
      "rows_examined_per_scan": 233,
      "rows_produced_per_join": 233,
      "filtered": "100.00",
      "cost_info": {
        "read_cost": "231.78",
        "eval_cost": "23.30",
        "prefix_cost": "255.08"
      }
    }
  }
}
```

**비용 항목**

- **read_cost**: 인덱스/테이블 읽기 비용 (231.78)
- **eval_cost**: 레코드 평가 비용 (23.30)
- **prefix_cost**: 전체 비용 (255.08 = read_cost + eval_cost)
- **query_cost**: 쿼리 전체 비용

### EXPLAIN ANALYZE로 실제 성능 측정

MySQL 8.0.18부터 지원하는 기능으로, **실제 쿼리를 실행**하여 예상 비용과 실제 소요 시간을 함께 보여줍니다.

**EXPLAIN vs EXPLAIN ANALYZE**

| 구분 | EXPLAIN | EXPLAIN ANALYZE |
|------|---------|-----------------|
| 실행 방식 | 실행 계획만 수립 | **실제 쿼리 실행** |
| 소요 시간 | 즉시 | 쿼리 완료까지 대기 |
| 제공 정보 | 예상 비용, 예상 rows | 예상 + **실제 시간, 실제 rows** |
| 용도 | 빠른 계획 확인 | 실제 성능 측정 |

**기본 사용법**

```sql
EXPLAIN ANALYZE
SELECT *
FROM employees
WHERE first_name = 'Matt';
```

**결과**

```
-> Index lookup on employees using ix_firstname (first_name='Matt')
   (cost=256.10 rows=233)
   (actual time=0.348..1.046 rows=233 loops=1)
```

**필드 설명**

- **cost=256.10**: 예상 비용
- **rows=233**: 예상 레코드 수
- **actual time=0.348..1.046**: 실제 소요 시간 (밀리초)
  - 첫 번째 값 (0.348): 첫 레코드를 가져오는 데 걸린 시간
  - 두 번째 값 (1.046): 마지막 레코드를 가져오는 데 걸린 시간
- **rows=233**: 실제 처리한 레코드 수
- **loops=1**: 반복 실행 횟수

**TREE 포맷 읽는 법**

EXPLAIN ANALYZE는 항상 TREE 포맷으로 결과를 표시합니다. 들여쓰기로 실행 순서를 파악할 수 있습니다.

```sql
EXPLAIN ANALYZE
SELECT e.emp_no, AVG(s.salary)
FROM employees e
INNER JOIN salaries s ON s.emp_no = e.emp_no
    AND s.salary > 50000
    AND s.from_date <= '1990-01-01'
    AND s.to_date > '1990-01-01'
WHERE e.first_name = 'Matt'
GROUP BY e.hire_date;
```

**결과**

```
A) -> Table scan on <temporary>
       (actual time=0.001..0.004 rows=48 loops=1)

B)    -> Aggregate using temporary table
          (actual time=3.799..3.808 rows=48 loops=1)

C)       -> Nested loop inner join (cost=685.24 rows=135)
             (actual time=0.367..3.602 rows=48 loops=1)

D)          -> Index lookup on e using ix_firstname (first_name='Matt')
                (cost=215.08 rows=233)
                (actual time=0.348..1.046 rows=233 loops=1)

E)          -> Filter: ((s.salary > 50000) and (s.from_date <= '1990-01-01')
                        and (s.to_date > '1990-01-01'))
                (actual time=0.009..0.011 rows=0 loops=233)

F)             -> Index lookup on s using PRIMARY (emp_no=e.emp_no)
                   (cost=0.98 rows=10)
                   (actual time=0.007..0.009 rows=10 loops=233)
```

**실행 순서 규칙**

1. **들여쓰기가 같은 레벨**: 상단에 위치한 라인이 먼저 실행
2. **들여쓰기가 다른 레벨**: 가장 안쪽에 위치한 라인이 먼저 실행

**위 쿼리의 실제 실행 순서**

1. **D) Index lookup on e using ix_firstname** - employees 테이블 인덱스로 first_name='Matt' 조회
2. **F) Index lookup on s using PRIMARY** - salaries 테이블 프라이머리 키로 emp_no 조회
3. **E) Filter** - salary, from_date, to_date 조건 필터링
4. **C) Nested loop inner join** - 조인 수행
5. **B) Aggregate using temporary table** - GROUP BY를 위한 임시 테이블 생성 및 집계
6. **A) Table scan on temporary** - 임시 테이블 결과 반환

**한글로 풀어쓴 실행 계획**

1. employees 테이블의 ix_firstname 인덱스를 통해 first_name='Matt' 조건에 일치하는 레코드 검색 (233건)
2. salaries 테이블의 PRIMARY 키를 통해 emp_no가 1번 결과의 emp_no와 동일한 레코드 검색 (평균 10건씩)
3. salary > 50000, from_date <= '1990-01-01', to_date > '1990-01-01' 조건에 일치하는 건만 필터링
4. 1번과 3번의 결과를 조인
5. 임시 테이블에 결과를 저장하면서 hire_date로 GROUP BY 집계 실행
6. 임시 테이블의 결과를 읽어서 최종 반환 (48건)

**loops의 의미**

```
F) -> Index lookup on s using PRIMARY (emp_no=e.emp_no)
      (actual time=0.007..0.009 rows=10 loops=233)
```

- **loops=233**: 이 작업을 233번 반복 실행
- **rows=10**: 매번 평균 10건의 레코드 처리
- **actual time=0.007..0.009**: 첫 레코드는 평균 0.007ms, 마지막 레코드를 읽는데는 평균 0.009ms 소요

즉, employees 테이블에서 233명을 찾았고, 각 사람마다 salaries 테이블을 조회(10건씩)하여 총 233번 반복했다는 의미입니다.

**활용 방법**

```sql
-- 1. 먼저 EXPLAIN으로 실행 계획 확인
EXPLAIN
SELECT ...;

-- 2. 계획이 합리적이면 EXPLAIN ANALYZE로 실제 성능 측정
EXPLAIN ANALYZE
SELECT ...;
```

**주의사항**

- EXPLAIN ANALYZE는 **실제로 쿼리를 실행**합니다
- 느린 쿼리는 완료될 때까지 기다려야 결과를 볼 수 있습니다
- 대용량 테이블에서는 먼저 EXPLAIN으로 계획을 확인하고 튜닝한 후 사용하세요
- UPDATE, DELETE 쿼리도 실행되므로 프로덕션 환경에서는 주의가 필요합니다

## 단위 작업 비용이 미치는 영향