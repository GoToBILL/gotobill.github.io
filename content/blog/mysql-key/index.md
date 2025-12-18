---
title: 'MySQL 실행 계획 - possible_keys, key, key_len, ref, rows, filtered 컬럼'
date: '2025-10-26'
description: 'MySQL 실행 계획에서 인덱스 사용과 비용 예측에 관련된 핵심 컬럼들을 알아봅니다.'
category: "개발"
tags: ['MySQL', 'Database', 'Performance']
---

> 이 글은 Real MySQL 8.0 책의 내용을 참고하여 작성되었습니다.

## possible_keys 컬럼

**의미**: 옵티마이저가 후보로 선정했던 인덱스 목록

**특징**

- 실제로 사용된 인덱스가 아니라 "사용될 법했던" 인덱스 목록입니다
- 테이블의 모든 인덱스가 나열되는 경우가 많아 튜닝에 큰 도움이 되지 않습니다
- **실행 계획 확인 시 무시해도 됩니다**

**주의사항**

possible_keys에 인덱스가 나열됐다고 해서 그 인덱스를 사용한다고 판단하지 마세요. 실제 사용 인덱스는 **key 컬럼**을 확인해야 합니다.

---

## key 컬럼

**의미**: 최종 선택된 실행 계획에서 **실제로 사용하는 인덱스**

**중요성**

쿼리 튜닝 시 의도한 인덱스가 표시되는지 확인하는 것이 매우 중요합니다.

**표시 값**

- `PRIMARY`: 프라이머리 키 사용
- `NULL`: 인덱스를 전혀 사용하지 않음 (type이 ALL일 때)
- 그 외: 테이블/인덱스 생성 시 부여한 인덱스 이름

**index_merge의 경우**

```sql
EXPLAIN
SELECT * FROM employees
WHERE emp_no BETWEEN 10001 AND 11000
      OR first_name='Smith';
```

| id | type | key | key_len | Extra |
|----|------|-----|---------|-------|
| 1 | index_merge | PRIMARY,ix_firstname | 4,58 | Using union(PRIMARY,ix_firstname); Using where |

type이 index_merge일 때는 2개 이상의 인덱스가 `,`로 구분되어 표시됩니다.

---

## key_len 컬럼

**의미**: 다중 컬럼 인덱스에서 **몇 바이트까지 사용했는지** 표시

많은 사용자가 무시하지만 **매우 중요한 정보**입니다.

### 기본 예시

**프라이머리 키 일부만 사용**

```sql
-- dept_emp 테이블: PRIMARY KEY (dept_no, emp_no)
-- dept_no: CHAR(4), utf8mb4 문자셋 (4 * 4바이트 = 16바이트)

EXPLAIN
SELECT * FROM dept_emp WHERE dept_no='d005';
```

| id | select_type | table | type | key | key_len |
|----|-------------|-------|------|-----|---------|
| 1 | SIMPLE | dept_emp | ref | PRIMARY | 16 |

dept_no만 사용했으므로 key_len이 16바이트입니다.

**프라이머리 키 전체 사용**

```sql
-- emp_no: INTEGER (4바이트)

EXPLAIN
SELECT * FROM dept_emp WHERE dept_no='d005' AND emp_no=10001;
```

| id | select_type | table | type | key | key_len |
|----|-------------|-------|------|-----|---------|
| 1 | SIMPLE | dept_emp | const | PRIMARY | 20 |

dept_no(16) + emp_no(4) = 20바이트입니다.

### NULL 허용 컬럼

```sql
CREATE TABLE titles (
    emp_no int NOT NULL,
    title varchar(50) NOT NULL,
    from_date date NOT NULL,
    to_date date DEFAULT NULL,  -- NULL 허용
    PRIMARY KEY (emp_no,from_date,title),
    KEY ix_todate (to_date)
);

EXPLAIN
SELECT * FROM titles WHERE to_date<='1985-10-10';
```

| id | select_type | table | type | key | key_len |
|----|-------------|-------|------|-----|---------|
| 1 | SIMPLE | titles | range | ix_todate | 4 |

**DATE 타입은 3바이트인데 왜 4바이트?**

NULL 허용 컬럼은 NULL 여부를 저장하기 위해 **1바이트를 추가**로 사용합니다.
- to_date: DATE 타입 3바이트
- NULL 플래그: 1바이트
- **합계: 4바이트**

---

## ref 컬럼

**의미**: 접근 방법이 ref일 때 **참조 조건으로 어떤 값이 제공됐는지** 표시

**표시 값**

- `const`: 상수값 사용
- `테이블명.컬럼명`: 다른 테이블의 컬럼값 사용
- `func`: 값의 변환이나 연산이 수행됨

### 일반적인 조인

```sql
EXPLAIN
SELECT *
FROM employees e, dept_emp de
WHERE e.emp_no=de.emp_no;
```

| id | select_type | table | type | key | ref |
|----|-------------|-------|------|-----|-----|
| 1 | SIMPLE | de | ALL | NULL | NULL |
| 1 | SIMPLE | e | eq_ref | PRIMARY | employees.de.emp_no |

조인 대상 컬럼 이름이 그대로 표시됩니다.

### func가 표시되는 경우

```sql
EXPLAIN
SELECT *
FROM employees e, dept_emp de
WHERE e.emp_no=(de.emp_no-1);
```

| id | select_type | table | type | key | ref |
|----|-------------|-------|------|-----|-----|
| 1 | SIMPLE | de | ALL | NULL | NULL |
| 1 | SIMPLE | e | eq_ref | PRIMARY | func |

**func가 표시되는 상황**

- 명시적인 값 변환 (예: `de.emp_no-1`)
- 콜레이션 변환
- 문자셋이 일치하지 않는 문자열 조인
- 숫자 타입과 문자열 타입 조인

**권장 사항**

MySQL 서버가 내부 변환을 하지 않도록 조인 컬럼의 타입과 문자셋을 일치시키는 것이 좋습니다.

---

## rows 컬럼

**의미**: 실행 계획의 효율성 판단을 위해 **예측한 레코드 건수**

**특징**

- 스토리지 엔진의 통계 정보를 기반으로 한 예상값입니다 (정확하지 않음)
- **반환할 레코드 수가 아니라**, 읽고 체크해야 할 레코드 수입니다
- 실제 쿼리 결과 건수와 일치하지 않는 경우가 많습니다

### 예시 1: 풀 테이블 스캔

```sql
EXPLAIN
SELECT * FROM dept_emp WHERE from_date>='1985-01-01';
```

| id | select_type | table | type | key | rows |
|----|-------------|-------|------|-----|------|
| 1 | SIMPLE | dept_emp | ALL | NULL | 331143 |

전체 레코드가 331,143건이므로 모든 레코드를 비교해야 한다고 판단했습니다.

### 예시 2: 인덱스 레인지 스캔

```sql
EXPLAIN
SELECT * FROM dept_emp WHERE from_date>='2002-07-01';
```

| id | select_type | table | type | key | rows |
|----|-------------|-------|------|-----|------|
| 1 | SIMPLE | dept_emp | range | ix_fromdate | 292 |

292건(8.8%)만 읽으면 되므로 인덱스 레인지 스캔을 선택했습니다.

**참고**

rows 값이 부정확하면 옵티마이저가 잘못된 실행 계획을 수립할 수 있습니다. MySQL 8.0부터는 **히스토그램** 기능으로 예측 정확도를 개선했습니다.

---

## filtered 컬럼

**의미**: 인덱스를 사용하지 못하는 조건으로 필터링한 후 남은 레코드 비율 (%)

**핵심 개념**

filtered 컬럼은 인덱스로 처리되지 않는 조건을 적용한 후 남은 레코드의 비율을 나타냅니다. 조인 시 다음 테이블로 전달될 실제 레코드 건수를 예측하는 데 중요합니다.

### 예시

```sql
EXPLAIN
SELECT *
FROM employees e,
     salaries s
WHERE e.first_name='Matt'
  AND e.hire_date BETWEEN '1990-01-01' AND '1991-01-01'
  AND s.emp_no=e.emp_no
  AND s.from_date BETWEEN '1990-01-01' AND '1991-01-01'
  AND s.salary BETWEEN 50000 AND 60000;
```

| id | select_type | table | type | key | rows | filtered |
|----|-------------|-------|------|-----|------|----------|
| 1 | SIMPLE | e | ref | ix_firstname | 233 | 16.03 |
| 1 | SIMPLE | s | ref | PRIMARY | 10 | 0.48 |

**분석**

employees 테이블에서:

1. `first_name='Matt'` (인덱스 사용): 233건 조회
2. `hire_date BETWEEN '1990-01-01' AND '1991-01-01'` (인덱스 미사용): 추가 필터링
3. filtered 16.03% = 233건 중 16.03%만 hire_date 조건도 만족
4. **실제 salaries 테이블로 조인되는 건수**: 233 × 0.1603 = **약 37건**

**왜 중요한가?**

옵티마이저는 조인 순서를 결정할 때 filtered 값을 참고합니다. 조인 후 남는 레코드가 적을수록 다음 테이블 조인 비용이 줄어들기 때문에 filtered 값이 낮은 테이블을 선행 테이블로 선택하는 경향이 있습니다.

**개선 방안**

MySQL 8.0부터는 **히스토그램** 기능으로 filtered 값의 예측 정확도를 높였습니다.

---

**튜닝 체크리스트**

1. **key**: 의도한 인덱스가 사용되는가?
2. **key_len**: 다중 컬럼 인덱스를 충분히 활용하는가?
3. **ref**: func가 표시되면 타입/문자셋 불일치 확인
4. **rows**: 예상 읽기 건수가 합리적인가?
5. **filtered**: 조인 시 필터링 비율이 적절한가?
