---
title: 'MySQL 실행 계획 - Extra 컬럼 완벽 가이드 (2편)'
date: '2025-10-27'
description: 'MySQL 실행 계획의 Extra 컬럼 - 조인 버퍼, 임시 테이블, WHERE 필터링 최적화를 알아봅니다.'
tags: ['MySQL', 'Database', 'Performance']
---

> 이 글은 Real MySQL 8.0 책의 내용을 참고하여 작성되었습니다.

---

## 22. Using join buffer

**의미**: 조인 시 조인 버퍼 사용

조인 대상 테이블(드리븐 테이블)에 적절한 인덱스가 없을 때 조인 버퍼를 사용합니다.

```sql
EXPLAIN
SELECT *
FROM dept_emp de, employees e
WHERE de.from_date>'2005-01-01' AND e.emp_no<10904;
```

| id | select_type | table | type | key | Extra |
|----|-------------|-------|------|-----|-------|
| 1 | SIMPLE | de | range | ix_fromdate | Using index condition |
| 1 | SIMPLE | e | range | PRIMARY | Using where; Using join buffer (hash join) |

### 조인 버퍼 종류

**Block Nested Loop (BNL)**

```
Using join buffer (Block Nested Loop)
```

**언제 사용되나?**

드리븐 테이블에 조인 조건에 맞는 인덱스가 없을 때 사용됩니다.

**동작 방식**

```sql
-- dept_emp: 30만 건, employees: 10만 건
-- employees에 dept_no 인덱스 없음
SELECT *
FROM dept_emp de
INNER JOIN employees e ON de.dept_no = e.dept_no
WHERE de.from_date > '2005-01-01';
```

1. dept_emp에서 조건에 맞는 1만 건을 조인 버퍼에 저장
2. employees 테이블을 처음부터 끝까지 스캔하면서 버퍼의 1만 건과 비교
3. 인덱스가 없어서 매번 풀 스캔 필요

**문제점**: 드리븐 테이블을 반복 풀 스캔하여 비효율적

---

**Batched Key Access (BKA)**

```
Using join buffer (Batched Key Access)
```

**언제 사용되나?**

드리븐 테이블에 인덱스가 있고, MRR 최적화를 사용할 때입니다.

**동작 방식**

```sql
-- dept_emp: 30만 건, employees: 10만 건
-- employees에 dept_no 인덱스 있음
SET optimizer_switch='mrr=on,mrr_cost_based=off,batched_key_access=on';

SELECT *
FROM dept_emp de
INNER JOIN employees e ON de.dept_no = e.dept_no
WHERE de.from_date > '2005-01-01';
```

1. dept_emp에서 조건에 맞는 레코드들의 dept_no를 버퍼에 모음
   - 예: [d001, d003, d001, d005, d003, ...]
2. dept_no를 정렬하여 중복 제거
   - 정렬 후: [d001, d003, d005, ...]
3. 정렬된 순서대로 employees의 인덱스를 한 번에 조회 (MRR)
4. 디스크 랜덤 I/O를 순차 I/O로 변환

**장점**: 인덱스를 사용하면서도 디스크 접근을 최적화

---

**hash join (MySQL 8.0.18+)**

```
Using join buffer (hash join)
```

**언제 사용되나?**

등호(=) 조인이고 인덱스가 없을 때 자동으로 사용됩니다. BNL보다 훨씬 빠릅니다.

**동작 방식**

```sql
-- dept_emp: 30만 건, employees: 10만 건
-- employees에 dept_no 인덱스 없음
SELECT *
FROM dept_emp de
INNER JOIN employees e ON de.dept_no = e.dept_no
WHERE de.from_date > '2005-01-01';
```

1. **Build Phase**: dept_emp에서 1만 건을 읽어 해시 테이블 생성
   ```
   해시 테이블:
   hash(d001) → [레코드1, 레코드5, ...]
   hash(d003) → [레코드2, 레코드7, ...]
   hash(d005) → [레코드3, ...]
   ```

2. **Probe Phase**: employees를 스캔하면서 해시 테이블 조회
   - employees의 dept_no = 'd001' → 해시 테이블에서 hash(d001) 조회 (O(1))
   - 일치하는 레코드들과 조인

### 성능 개선

**문제점**

조인 조건에 인덱스가 없어서 비효율적입니다.

**해결 방법**

1. 드리븐 테이블의 조인 컬럼에 인덱스 추가
2. 조인 순서 변경 (힌트 사용)
3. `join_buffer_size` 설정 (기본 1MB, 데이터 웨어하우스는 더 크게)

---

## 23. Using MRR

**의미**: MRR(Multi Range Read) 최적화 사용

MySQL 엔진이 여러 개의 키 값을 스토리지 엔진으로 한 번에 전달하고, 스토리지 엔진은 이를 정렬하여 최소한의 페이지 접근으로 레코드를 읽습니다.

```sql
EXPLAIN
SELECT /*+ JOIN_ORDER(s, e) */ *
FROM employees e,
     salaries s
WHERE e.first_name='Matt'
  AND e.hire_date BETWEEN '1990-01-01' AND '1991-01-01'
  AND s.emp_no=e.emp_no
  AND s.from_date BETWEEN '1990-01-01' AND '1991-01-01'
  AND s.salary BETWEEN 50000 AND 60000;
```

| id | table | type | key | Extra |
|----|-------|------|-----|-------|
| 1 | s | range | ix_salary | Using index condition; Using MRR |
| 1 | e | eq_ref | PRIMARY | Using where |

**장점**

- 디스크 접근 최소화
- 대량 레코드 읽기 시 효율적

---

## 24. Using sort_union / Using union / Using intersect

**의미**: index_merge 접근 방법 사용 시 인덱스 병합 방식

### Using intersect

**의미**: AND로 연결된 조건의 교집합

```sql
EXPLAIN
SELECT *
FROM employees
WHERE emp_no BETWEEN 10001 AND 11000
  AND first_name='Smith';
```

### Using union

**의미**: OR로 연결된 조건의 합집합 (동등 비교)

```sql
EXPLAIN
SELECT *
FROM employees
WHERE emp_no=10001
   OR first_name='Smith';
```

### Using sort_union

**의미**: OR로 연결된 범위 조건의 합집합 (정렬 후 병합)

```sql
EXPLAIN
SELECT *
FROM employees
WHERE emp_no BETWEEN 10001 AND 11000
   OR first_name='Smith';
```

**차이점**

- **Using union**: 동등 비교, 중복 적음
- **Using sort_union**: 범위 비교, 프라이머리 키를 먼저 읽어 정렬 후 병합

---

## 25. Using temporary

**의미**: 중간 결과를 담기 위해 임시 테이블 사용

```sql
EXPLAIN
SELECT *
FROM employees
GROUP BY gender
ORDER BY MIN(emp_no);
```

| id | select_type | table | type | Extra |
|----|-------------|-------|------|-------|
| 1 | SIMPLE | employees | index | Using temporary; Using filesort |

### 임시 테이블 사용 케이스

**Extra에 표시되는 경우**

- GROUP BY와 ORDER BY 컬럼이 다를 때

**Extra에 표시되지 않지만 사용하는 경우**

1. **FROM 절의 서브쿼리**: 파생 테이블(Derived table)은 항상 임시 테이블
2. **COUNT(DISTINCT column1)**: 인덱스를 사용할 수 없으면 임시 테이블
3. **UNION / UNION DISTINCT**: 결과 병합 시 임시 테이블 (MySQL 8.0에서 UNION ALL은 제외)
4. **인덱스 없는 정렬**: 정렬 버퍼도 임시 테이블과 동일

### 메모리 vs 디스크

실행 계획만으로는 임시 테이블이 메모리에 생성됐는지 디스크에 생성됐는지 알 수 없습니다.

**상태 변수로 확인**

```sql
SHOW STATUS LIKE 'Created_tmp%';
```

- `Created_tmp_tables`: 생성된 임시 테이블 수
- `Created_tmp_disk_tables`: 디스크에 생성된 임시 테이블 수

### 성능 영향

임시 테이블 생성은 부하가 크므로 다음과 같이 개선하세요:

1. GROUP BY와 ORDER BY 컬럼을 동일하게
2. 인덱스 활용으로 GROUP BY/ORDER BY 처리
3. 서브쿼리를 조인으로 변경

---

## 26. Using where

**의미**: MySQL 엔진에서 WHERE 조건 필터링 수행

```sql
EXPLAIN
SELECT * FROM employees
WHERE emp_no < 10010 AND first_name='Matt';
```

| id | select_type | table | type | key | rows | filtered | Extra |
|----|-------------|-------|------|-----|------|----------|-------|
| 1 | SIMPLE | employees | range | PRIMARY | 100 | 50.00 | Using where |

### 두 가지 의미

1. **스토리지 엔진에서 읽은 레코드를 MySQL 엔진에서 필터링**
2. **일부 조건은 인덱스를 사용하지 못했음**

### 처리 과정

```
[스토리지 엔진]
emp_no BETWEEN 10001 AND 10100
→ 100건 읽음

[MySQL 엔진]
gender='F' 조건 필터링
→ 37건만 반환 (63건 버림)
```

### 성능 판단

**filtered 컬럼 확인**

- filtered = 50%: 읽은 레코드 중 50%만 반환
- filtered 값이 낮을수록 비효율적

**개선 방법**

```sql
-- 기존: emp_no만 인덱스 사용
WHERE emp_no BETWEEN 10001 AND 10100 AND gender='F'

-- 개선: 복합 인덱스 생성
CREATE INDEX idx_emp_gender ON employees(emp_no, gender);
```

복합 인덱스를 사용하면 두 조건 모두 작업 범위 결정 조건이 되어 필요한 37건만 정확하게 읽습니다.

### 주의사항

**Using where + type: ALL**

이 조합은 풀 테이블 스캔이므로 반드시 개선이 필요합니다.

```sql
EXPLAIN
SELECT * FROM employees
WHERE first_name='Matt';  -- 인덱스 없음
```

| id | select_type | table | type | Extra |
|----|-------------|-------|------|-------|
| 1 | SIMPLE | employees | ALL | Using where |

**개선**: first_name에 인덱스 추가

---

## 27. Zero limit

**의미**: 메타데이터만 필요한 경우 (LIMIT 0)

```sql
EXPLAIN SELECT * FROM employees LIMIT 0;
```

| id | select_type | table | type | Extra |
|----|-------------|-------|------|-------|
| 1 | SIMPLE | NULL | NULL | Zero limit |

**사용 목적**

쿼리 결과값의 메타데이터만 필요한 경우:
- 컬럼 개수
- 각 컬럼의 타입
- 컬럼 이름

실제 테이블 레코드는 전혀 읽지 않고 메타정보만 반환합니다.

---

## 전체 Extra 메시지 요약

### 최상 (매우 좋음)

| 메시지 | 설명 |
|--------|------|
| Using index | 커버링 인덱스, 데이터 파일 안 읽음 |
| Select tables optimized away | MIN/MAX 최적화, 1~2건만 읽음 |

### 양호 (좋음)

| 메시지 | 설명 |
|--------|------|
| Using index condition | 인덱스 컨디션 푸시다운 |
| Using index for group-by | 루스 인덱스 스캔 |
| Using index for skip scan | 인덱스 스킵 스캔 |
| Using MRR | 디스크 접근 최적화 |
| FirstMatch / LooseScan | 세미 조인 최적화 |
| Distinct | 중복 제거 최적화 |
| Not exists | 안티 조인 최적화 |

### 보통 (확인 필요)

| 메시지 | 설명 |
|--------|------|
| Using where | 필터링 수행 (filtered 값 확인) |
| Range checked for each record | 레코드마다 인덱스 선택 |

### 나쁨 (개선 필요)

| 메시지 | 설명 |
|--------|------|
| Using filesort | 정렬에 인덱스 미사용 |
| Using temporary | 임시 테이블 생성 |
| Using join buffer | 조인에 인덱스 미사용 |
| Full scan on NULL key | NULL 처리로 풀 스캔 |

### 정보성 (문제 아님)

| 메시지 | 설명 |
|--------|------|
| const row not found | const 테이블에 레코드 없음 |
| Impossible WHERE/HAVING | 조건이 항상 FALSE |
| No tables used | FROM 절 없음 |
| Plan isn't ready yet | 실행 계획 수립 중 |
| Zero limit | LIMIT 0 사용 |

---

## 실전 튜닝 가이드

### 1단계: 즉시 개선 필요 항목 확인

```sql
EXPLAIN
SELECT *
FROM employees e
    LEFT JOIN salaries s ON e.emp_no=s.emp_no
WHERE e.first_name='Matt'
ORDER BY e.birth_date;
```

**체크 포인트**

1. **Using filesort**: birth_date에 인덱스 필요
2. **Using temporary**: GROUP BY/ORDER BY 조정
3. **Using join buffer**: 조인 컬럼에 인덱스 필요
4. **type: ALL**: 테이블 풀 스캔 확인

### 2단계: 커버링 인덱스 적용 검토

```sql
-- 현재
SELECT emp_no, first_name, birth_date
FROM employees
WHERE first_name='Matt';

-- 개선: first_name, birth_date 복합 인덱스 생성
CREATE INDEX idx_name_birth ON employees(first_name, birth_date);
```

**결과**: Using index 표시 (커버링 인덱스)

### 3단계: filtered 값 확인

```sql
EXPLAIN
SELECT *
FROM employees
WHERE emp_no < 10100 AND gender='F';
```

| rows | filtered | 실제 조인 대상 |
|------|----------|---------------|
| 100 | 50.00 | 50건 |
| 100 | 10.00 | 10건 |

filtered 값이 낮으면 복합 인덱스 추가를 검토하세요.

### 4단계: 조인 순서 최적화

```sql
-- JOIN_ORDER 힌트로 조인 순서 조정
SELECT /*+ JOIN_ORDER(e, s) */ *
FROM employees e, salaries s
WHERE e.first_name='Matt'
  AND s.emp_no=e.emp_no
  AND s.salary > 50000;
```

---

## 최종 체크리스트

쿼리 튜닝 시 Extra 컬럼에서 확인할 항목:

**필수 확인**

- [ ] Using filesort 있는가? → 인덱스로 정렬 가능한가?
- [ ] Using temporary 있는가? → GROUP BY/ORDER BY 최적화 가능한가?
- [ ] Using index 표시되는가? → 커버링 인덱스 적용 가능한가?
- [ ] type: ALL + Using where인가? → 인덱스 추가 필요

**추가 확인**

- [ ] Using join buffer 있는가? → 조인 컬럼에 인덱스 필요
- [ ] filtered 값이 낮은가? → 복합 인덱스 검토
- [ ] Range checked for each record 있는가? → 조인 조건 개선
- [ ] Using MRR/ICP 사용 중인가? → 최적화 적용됨

**참고 확인**

- [ ] Using index for group-by → 루스 인덱스 스캔 (양호)
- [ ] Select tables optimized away → MIN/MAX 최적화 (최상)
- [ ] FirstMatch/LooseScan → 세미 조인 최적화 (양호)

실행 계획을 완벽하게 이해했다면 이제 실전 쿼리 최적화를 시작하세요!
