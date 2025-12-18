---
title: 'MySQL 실행 계획 - table, partitions, type 컬럼'
date: '2025-10-24'
description: 'MySQL 실행 계획에서 table, partitions, type 컬럼을 이해하고 활용하는 방법을 알아봅니다.'
category: "개발"
tags: ['MySQL', 'Database', 'Performance']
---

> 이 글은 Real MySQL 8.0 책의 내용을 참고하여 작성되었습니다.

## table 컬럼

MySQL 실행 계획은 단위 SELECT 쿼리가 아닌 **테이블 기준**으로 표시됩니다. 테이블에 별칭이 있으면 별칭이 표시됩니다.

### 테이블을 사용하지 않는 쿼리

```sql
EXPLAIN SELECT NOW();
EXPLAIN SELECT NOW() FROM DUAL;
```

| id | select_type | table | key | key_len | Extra |
|----|-------------|-------|-----|---------|-------|
| 1 | SIMPLE | NULL | NULL | NULL | No tables used |

**DUAL 테이블**

- Oracle RDBMS 호환성을 위해 MySQL이 내부적으로 지원합니다
- `FROM DUAL`은 자동으로 제거되어 첫 번째 쿼리와 동일하게 처리됩니다
- 별도의 테이블을 사용하지 않으면 table 컬럼에 **NULL**이 표시됩니다

**주의사항**

실제로 "dual"이라는 이름의 테이블을 생성하려면 백틱으로 감싸야 합니다. 하지만 예약어이므로 사용하지 않는 것이 좋습니다.

```sql
CREATE TABLE `dual` (id INT);
INSERT INTO `dual` VALUES (1);
SELECT * FROM `dual`;
```

### 임시 테이블 표시

table 컬럼에 `<derived N>` 또는 `<union M,N>` 형태로 표시되면 임시 테이블을 의미합니다. 숫자는 단위 SELECT 쿼리의 id 값입니다.

```sql
SELECT *
FROM
    (SELECT de.emp_no FROM dept_emp de GROUP BY de.emp_no) tb,
    employees e
WHERE e.emp_no = tb.emp_no;
```

| id | select_type | table | type | key | rows | Extra |
|----|-------------|-------|------|-----|------|-------|
| 1 | PRIMARY | `<derived2>` | ALL | NULL | 331143 | NULL |
| 1 | PRIMARY | e | eq_ref | PRIMARY | 1 | NULL |
| 2 | DERIVED | de | index | ix_empno_fromdate | 331143 | Using index |

**실행 계획 분석**

1. 첫 번째 라인의 `<derived2>`는 id=2인 라인이 먼저 실행되어야 함을 의미합니다
2. 세 번째 라인(id=2)은 DERIVED 타입으로 dept_emp 테이블에서 파생 테이블을 생성합니다
3. 첫 번째와 두 번째 라인은 id가 같으므로 조인 쿼리입니다
4. `<derived2>`가 먼저 표시되므로 드라이빙 테이블이고, e 테이블이 드리븐 테이블입니다

### MATERIALIZED 서브쿼리

MySQL 8.0에서는 서브쿼리 최적화가 개선되었습니다. **select_type이 MATERIALIZED**인 경우 `<subquery N>` 형태로 표시됩니다.

이는 서브쿼리 결과를 구체화(Materialization)해서 임시 테이블로 만든 것이며, `<derived N>`과 동일하게 해석하면 됩니다.

---

## partitions 컬럼

MySQL 8.0부터는 `EXPLAIN` 명령으로 파티션 관련 실행 계획까지 모두 확인할 수 있습니다.

### 파티션 테이블 예시

```sql
CREATE TABLE employees_2 (
    emp_no int NOT NULL,
    birth_date DATE NOT NULL,
    first_name VARCHAR(14) NOT NULL,
    last_name VARCHAR(16) NOT NULL,
    gender ENUM('M','F') NOT NULL,
    hire_date DATE NOT NULL,
    PRIMARY KEY (emp_no, hire_date)
) PARTITION BY RANGE COLUMNS(hire_date)
(PARTITION p1986_1990 VALUES LESS THAN ('1990-01-01'),
 PARTITION p1991_1995 VALUES LESS THAN ('1996-01-01'),
 PARTITION p1996_2000 VALUES LESS THAN ('2000-01-01'),
 PARTITION p2001_2005 VALUES LESS THAN ('2006-01-01'));

INSERT INTO employees_2 SELECT * FROM employees;
```

### 파티션 프루닝(Partition Pruning)

```sql
EXPLAIN
SELECT *
FROM employees_2
WHERE hire_date BETWEEN '1999-11-15' AND '2000-01-15';
```

| id | select_type | table | partitions | type | rows |
|----|-------------|-------|------------|------|------|
| 1 | SIMPLE | employees_2 | p1996_2000,p2001_2005 | ALL | 21743 |

**파티션 프루닝이란?**

옵티마이저가 WHERE 조건을 분석하여 필요한 파티션만 골라내는 과정입니다. **위 쿼리는 4개 파티션 중 2개만 접근합니다.**

**type이 ALL인데 일부만 읽는 이유**

파티션은 물리적으로 개별 테이블처럼 별도의 저장 공간을 가집니다. 

따라서 전체 테이블이 아닌 p1996_2000과 p2001_2005 파티션만 풀 스캔합니다.