---
title: 'MySQL 실행 계획 - type 컬럼 완벽 가이드'
date: '2025-10-25'
description: 'MySQL 실행 계획에서 type 컬럼의 12가지 접근 방법을 성능 순서대로 알아봅니다.'
tags: ['MySQL', 'Database', 'Performance']
---

> 이 글은 Real MySQL 8.0 책의 내용을 참고하여 작성되었습니다.

## type 컬럼이란?

type 컬럼은 MySQL이 각 테이블의 레코드를 **어떤 방식으로 읽었는지**를 나타냅니다.

**핵심 개념**

- 인덱스를 사용했는지, 풀 테이블 스캔을 했는지 확인
- 쿼리 튜닝 시 반드시 체크해야 할 핵심 정보
- MySQL 매뉴얼에서는 **조인 타입**이라 부르지만, **테이블 접근 방법**(Access type)으로 이해하는 것이 좋습니다

**공통 규칙**

- 하나의 SELECT 쿼리는 12가지 중 **단 하나의 접근 방법만** 사용합니다
- index_merge를 제외하면 **하나의 인덱스만** 사용합니다
- MySQL 옵티마이저는 이 접근 방법들과 비용을 계산하여 최소 비용의 방법을 선택합니다

---

## type 컬럼의 12가지 값

성능이 좋은 순서대로 정리하면 다음과 같습니다.

| 순위 | type | 설명 | |
|------|------|------|------|
| 1 | system | 레코드 1건 이하 (MyISAM, MEMORY) | 
| 2 | const | PK/UK로 단일 행 조회 | 
| 3 | eq_ref | 조인에서 PK/UK로 단일 행 조회 | 
| 4 | ref | 인덱스로 동등 조건 검색 | 
| 5 | fulltext | 전문 검색 인덱스 사용 | 
| 6 | ref_or_null | ref + NULL 비교 | 
| 7 | unique_subquery | IN 서브쿼리 (중복 없음) | 
| 8 | index_subquery | IN 서브쿼리 (중복 제거) | 
| 9 | range | 인덱스 레인지 스캔 |
| 10 | index_merge | 2개 이상 인덱스 병합 | 
| 11 | index | 인덱스 풀 스캔 | 
| 12 | ALL | 풀 테이블 스캔 | 

---

## 1. system

레코드가 1건 이하인 테이블 접근 방법입니다. **InnoDB에서는 나타나지 않고**, MyISAM이나 MEMORY 테이블에서만 사용됩니다.

```sql
CREATE TABLE tb_dual (fd1 int NOT NULL) ENGINE=MyISAM;
INSERT INTO tb_dual VALUES (1);

EXPLAIN SELECT * FROM tb_dual;
```

| id | select_type | table | type | rows |
|----|-------------|-------|------|------|
| 1 | SIMPLE | tb_dual | system | 1 |

InnoDB로 변경하면 ALL 또는 index로 표시됩니다. 실무에서는 거의 보이지 않습니다.

---

## 2. const

PK나 Unique Key로 **반드시 1건만 반환**하는 쿼리에 사용됩니다.

```sql
EXPLAIN
SELECT * FROM employees WHERE emp_no=10001;
```

| id | select_type | table | type | key | key_len |
|----|-------------|-------|------|-----|---------|
| 1 | SIMPLE | employees | const | PRIMARY | 4 |

**const가 되는 조건**

- PK/UK의 **모든 컬럼**을 동등 조건으로 사용
- 반드시 1건만 반환

**const가 안 되는 경우**

```sql
-- PK의 일부만 사용
EXPLAIN
SELECT * FROM dept_emp WHERE dept_no='d005';
```

| id | select_type | table | type | key | rows |
|----|-------------|-------|------|-----|------|
| 1 | SIMPLE | dept_emp | ref | PRIMARY | 165571 |

PK의 일부만 사용하면 ref 타입으로 표시됩니다.

**옵티마이저의 상수화**

const 타입은 쿼리 최적화 단계에서 미리 실행되어 상수로 변환됩니다.

```sql
-- 원본 쿼리
SELECT COUNT(*)
FROM employees e1
WHERE first_name=(SELECT first_name FROM employees e2 WHERE emp_no=100001);

-- 옵티마이저가 변환한 쿼리
SELECT COUNT(*)
FROM employees e1
WHERE first_name='Jasminko'; -- 서브쿼리 결과를 상수로 변환
```

---

## 3. eq_ref

조인에서 **두 번째 이후 테이블**을 PK/UK로 검색할 때 사용됩니다. 반드시 1건만 반환됩니다.

```sql
EXPLAIN
SELECT * FROM dept_emp de, employees e
WHERE e.emp_no=de.emp_no AND de.dept_no='d005';
```

| id | select_type | table | type | key | key_len | rows |
|----|-------------|-------|------|-----|---------|------|
| 1 | SIMPLE | de | ref | PRIMARY | 16 | 165571 |
| 1 | SIMPLE | e | eq_ref | PRIMARY | 4 | 1 |

**eq_ref 조건**

- 조인에서만 사용
- PK/UK의 모든 컬럼을 조인 조건으로 사용
- Unique 인덱스는 NOT NULL이어야 함
- 반드시 1건만 반환

---

## 4. ref

인덱스로 **동등 조건 검색**할 때 사용됩니다. 1건 반환 보장이 없어도 됩니다.

```sql
EXPLAIN
SELECT * FROM dept_emp WHERE dept_no='d005';
```

| id | select_type | table | type | key | key_len | ref |
|----|-------------|-------|------|-----|---------|-----|
| 1 | SIMPLE | dept_emp | ref | PRIMARY | 16 | const |

ref 컬럼의 const는 비교 값이 상수('d005')임을 의미합니다.

---

## 5. fulltext

전문 검색(Full-text Search) 인덱스를 사용합니다.

```sql
CREATE TABLE employee_name (
    emp_no int NOT NULL,
    first_name varchar(14) NOT NULL,
    last_name varchar(16) NOT NULL,
    PRIMARY KEY (emp_no),
    FULLTEXT KEY fx_name (first_name, last_name) WITH PARSER ngram
) ENGINE=InnoDB;
```

```sql
EXPLAIN
SELECT *
FROM employee_name
WHERE emp_no BETWEEN 10001 AND 10005
      AND MATCH(first_name, last_name) AGAINST('Facello' IN BOOLEAN MODE);
```

| id | select_type | table | type | key | Extra |
|----|-------------|-------|------|-----|-------|
| 1 | SIMPLE | employee_name | fulltext | fx_name | Using where; Ft_hints: no_ranking |

**특징**

- 쿼리에 전문 검색 조건이 있으면 높은 우선순위로 선택됩니다
- **const, eq_ref, ref가 아닌 경우 일반 인덱스보다 전문 인덱스를 우선 선택합니다**
- 실무에서는 일반 인덱스의 range가 더 빠른 경우가 많으므로 성능 테스트가 필요합니다

---

## 6. ref_or_null

ref와 동일하지만 **NULL 비교(IS NULL)** 가 추가된 형태입니다.

```sql
EXPLAIN
SELECT * FROM titles
WHERE to_date='1985-03-01' OR to_date IS NULL;
```

| id | select_type | table | type | key | key_len | ref | rows |
|----|-------------|-------|------|-----|---------|-----|------|
| 1 | SIMPLE | titles | ref_or_null | ix_todate | 4 | const | 2 |

실무에서 많이 사용되지는 않지만, 사용되면 나쁘지 않은 접근 방법입니다.

---

## 7. unique_subquery

IN(subquery)에서 **서브쿼리가 중복 없는 유니크한 값**만 반환할 때 사용됩니다.

```sql
-- semijoin 최적화를 끄고 테스트
SET optimizer_switch='semijoin=off';

EXPLAIN
SELECT * FROM departments
WHERE dept_no IN (SELECT dept_no FROM dept_emp WHERE emp_no=10001);
```

| id | select_type | table | type | key | key_len |
|----|-------------|-------|------|-----|---------|
| 1 | PRIMARY | departments | index | ux_deptname | 162 |
| 2 | DEPENDENT SUBQUERY | dept_emp | unique_subquery | PRIMARY | 20 |

MySQL 8.0에서는 세미 조인 최적화로 인해 더 최적화된 실행 계획이 나올 수 있습니다.

---

## 8. index_subquery

IN(subquery)에서 **서브쿼리가 중복된 값을 반환**할 수 있지만, 인덱스로 중복 제거가 가능할 때 사용됩니다.

**unique_subquery vs index_subquery**

- **unique_subquery**: 서브쿼리 결과에 중복 없음, 중복 제거 불필요
- **index_subquery**: 서브쿼리 결과에 중복 가능, 인덱스로 중복 제거

---

## 9. range

인덱스를 **범위로 검색**하는 인덱스 레인지 스캔입니다.

```sql
EXPLAIN
SELECT * FROM employees WHERE emp_no BETWEEN 10002 AND 10004;
```

| id | select_type | table | type | key | key_len | rows |
|----|-------------|-------|------|-----|---------|------|
| 1 | SIMPLE | employees | range | PRIMARY | 4 | 3 |

**range를 사용하는 연산자**

- `<`, `>`, `<=`, `>=`
- `BETWEEN`
- `IN`
- `IS NULL`
- `LIKE` (와일드카드가 뒤에 있는 경우)

**참고사항**

일반적으로 **const, ref, range**를 통칭하여 "인덱스 레인지 스캔"이라 부릅니다. 이 레벨만 돼도 충분히 최적화된 것으로 볼 수 있습니다.

---

## 10. index_merge

**2개 이상의 인덱스를 사용**하여 각각 검색한 후 결과를 병합합니다.

```sql
EXPLAIN
SELECT * FROM employees
WHERE emp_no BETWEEN 10001 AND 11000
      OR first_name='Smith';
```

| id | type | key | key_len | Extra |
|----|------|-----|---------|-------|
| 1 | index_merge | PRIMARY,ix_firstname | 4,58 | Using union(PRIMARY,ix_firstname); Using where |

**특징**

- 여러 인덱스를 읽으므로 일반적으로 range보다 비효율적입니다
- 교집합, 합집합, 중복 제거 등 부가 작업이 필요합니다
- 전문 검색 인덱스에는 적용되지 않습니다

---

## 11. index

**인덱스 풀 스캔**을 의미합니다. 인덱스를 처음부터 끝까지 읽습니다.

```sql
EXPLAIN
SELECT * FROM departments ORDER BY dept_name DESC LIMIT 10;
```

| id | select_type | table | type | key | key_len | rows |
|----|-------------|-------|------|-----|---------|------|
| 1 | SIMPLE | departments | index | ux_deptname | 162 | 9 |

**index가 사용되는 경우**

- range/const/ref 방법을 사용할 수 없을 때
- **인덱스 컬럼만으로 처리 가능한 쿼리**(커버링 인덱스)
- 인덱스로 정렬/그룹핑이 가능한 경우 (별도 정렬 회피)
  
---

## 12. ALL

**풀 테이블 스캔**입니다. 테이블을 처음부터 끝까지 읽습니다.

**특징**

- MySQL에서 가장 비효율적인 방법입니다
- InnoDB는 **리드 어헤드**(Read Ahead) 기능으로 대량 I/O를 최적화합니다
- 데이터 웨어하우스나 배치 프로그램에서는 의도적으로 사용하기도 합니다
- 웹 서비스 같은 OLTP 환경에는 적합하지 않습니다

**MySQL 8.0 병렬 테이블 스캔**

MySQL 8.0에서는 병렬 쿼리 기능으로 여러 스레드가 동시에 테이블을 스캔할 수 있습니다. (초기이기에 조건 없이 전체 테이블 건수를 가져오는 정도만 가능)

```sql
-- 단일 스레드 (2분 33초)
SELECT /*+ SET_VAR(innodb_parallel_read_threads=1) */ COUNT(*) FROM big_table;

-- 4개 스레드 (21초)
SELECT /*+ SET_VAR(innodb_parallel_read_threads=4) */ COUNT(*) FROM big_table;

-- 32개 스레드 (5초)
SELECT /*+ SET_VAR(innodb_parallel_read_threads=32) */ COUNT(*) FROM big_table;
```


