---
title: "MySQL 커서(Cursor) 동작 원리와 올바른 사용법"
date: "2026-02-14"
description: "MySQL의 커서(Cursor)가 무엇인지, 어떻게 동작하는지, 그리고 언제 사용하고 언제 피해야 하는지를 핵심만 정리합니다."
category: "개발"
tags: ["MySQL", "Database", "Stored Procedure"]
---

## 커서란?

**커서**(Cursor)는 **쿼리 결과 집합을 한 행씩 순차적으로 처리하기 위한 데이터베이스 객체**입니다.

커서를 사용하면 **서버 측에서 결과 집합을 관리**하며, FETCH 명령으로 한 행씩 가져와서 처리할 수 있습니다.

```sql
-- 일반 SELECT: 클라이언트가 결과 처리 방식 결정
SELECT * FROM users WHERE age > 20;
-- MySQL 서버는 스트리밍 방식으로 전송
-- 클라이언트(JDBC 등)가 버퍼링 또는 스트리밍 선택

-- 커서 사용: 서버 측에서 결과 집합 관리
DECLARE cursor_name CURSOR FOR SELECT * FROM users WHERE age > 20;
-- 서버 메모리에서 FETCH로 한 행씩 읽음
```

## MySQL 커서의 제약사항

MySQL의 커서는 **Stored Procedure, Function, Trigger 내부에서만 사용**할 수 있습니다.

```sql
-- 일반 SQL 세션에서는 사용 불가
mysql> DECLARE cur CURSOR FOR SELECT * FROM users;
ERROR 1064: You have an error in your SQL syntax

-- Stored Procedure 내부에서만 가능
DELIMITER $$
CREATE PROCEDURE process_users()
BEGIN
    DECLARE cur CURSOR FOR SELECT * FROM users;
END$$
DELIMITER ;
```

**왜 이런 제약이 있는가?**

MySQL 클라이언트는 자체적으로 결과 집합을 처리하는 방식이 있습니다. **MySQL 서버 측 처리**와 **클라이언트 측 처리**를 구분해야 합니다.

### MySQL 서버 측 처리 방식

**기본: 스트리밍** - 조건에 맞는 레코드를 찾는 즉시 클라이언트로 전송

**ORDER BY/GROUP BY: 버퍼링** - 전체 결과를 수집한 후 정렬/그룹핑하여 전송

### 클라이언트 측 처리 방식

**JDBC 디폴트: 버퍼링** - 전체 결과를 내부 버퍼에 담음

**JDBC 스트리밍 모드** - `stmt.setFetchSize(Integer.MIN_VALUE)`로 한 행씩 받음

### 전체 흐름 정리

| 쿼리 | MySQL 서버 | JDBC (디폴트) | 클라이언트가 느끼는 것 |
|------|-----------|--------------|---------------------|
| 일반 SELECT | 스트리밍 | 버퍼링 | 한 번에 받음 |
| ORDER BY | 버퍼링 | 버퍼링 | 한 번에 받음 |
| JDBC 스트리밍 모드 | 스트리밍 | 스트리밍 | 한 행씩 받음 |

**커서는 서버 측 메커니즘**

- **클라이언트 스트리밍**: 일반 SELECT로 한 행씩 가져오기 (클라이언트 설정)
- **서버 커서**: Stored Procedure 내에서 서버 메모리의 결과 집합을 FETCH로 관리

클라이언트에서 이미 스트리밍 방식을 사용할 수 있으므로, MySQL은 일반 SQL 세션에서의 커서를 지원하지 않고 Stored Procedure 내부로 제한했습니다.

## 커서의 기본 문법

커서는 **4단계 생명주기**를 가집니다.

```
1. DECLARE (선언) → 2. OPEN (열기) → 3. FETCH (읽기) → 4. CLOSE (닫기)
```

**1. DECLARE** - 커서 선언 (쿼리는 아직 실행 안 됨)

```sql
DECLARE cursor_name CURSOR FOR SELECT id, name FROM users;
```

**2. OPEN** - 커서 열기 (이 시점에 쿼리 실행, 결과를 메모리에 로드)

```sql
OPEN cursor_name;
```

**3. FETCH** - 데이터 읽기 (한 행씩 변수에 저장)

```sql
FETCH cursor_name INTO v_id, v_name;
```

**4. CLOSE** - 커서 닫기 (메모리 해제)

```sql
CLOSE cursor_name;
```

## 커서 사용 예제

```sql
DELIMITER $$

CREATE PROCEDURE process_all_users()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_id INT;
    DECLARE v_name VARCHAR(50);

    -- 1. 커서 선언
    DECLARE user_cursor CURSOR FOR
        SELECT id, name FROM users WHERE age >= 20;

    -- 2. NOT FOUND 핸들러 (마지막 행 이후 FETCH 시 done=TRUE)
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- 3. 커서 열기
    OPEN user_cursor;

    -- 4. 루프로 전체 행 순회
    read_loop: LOOP
        FETCH user_cursor INTO v_id, v_name;

        IF done THEN
            LEAVE read_loop;
        END IF;

        -- 각 행 처리
        SELECT CONCAT('Processing: ', v_id, ', ', v_name);
    END LOOP;

    -- 5. 커서 닫기
    CLOSE user_cursor;
END$$

DELIMITER ;
```

## 커서의 내부 동작

### 메모리 사용

커서는 OPEN 시점에 **전체 결과 집합을 서버 메모리에 한 번에 로드**합니다.

```sql
DECLARE large_cursor CURSOR FOR SELECT * FROM big_table;  -- 100만 건
OPEN large_cursor;  -- 이 시점에 100만 건 전체가 서버 메모리에 로드됨!

FETCH large_cursor INTO v_id, v_name;  -- 메모리에서 1번째 행 읽음
FETCH large_cursor INTO v_id, v_name;  -- 메모리에서 2번째 행 읽음
```

**핵심:**
- 100만 건 처리하려면 OPEN 시점에 100만 건 전체가 메모리 차지
- FETCH로 "한 행씩" 가져오는 건 처리 방식일 뿐, 메모리는 이미 전체 사용 중
- 대량 데이터 시 메모리 부족 발생

### Forward-Only

MySQL 커서는 **앞으로만 이동** 가능합니다. 뒤로 이동하거나 임의 위치로 점프할 수 없습니다.

### 읽기 전용

커서로 가져온 행을 직접 수정할 수 없습니다. 별도의 UPDATE 문이 필요합니다.

| DBMS | 수정 가능 여부 |
|------|---------------|
| MySQL | 읽기 전용 (별도 UPDATE 필요) |
| PostgreSQL, Oracle | `UPDATE ... WHERE CURRENT OF cursor_name` 지원 |

## NOT FOUND 핸들러

**선언 순서**: 커서 선언 → 핸들러 선언 (순서 중요!)

```sql
DECLARE user_cursor CURSOR FOR SELECT id FROM users;
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;  -- 커서 선언 이후
```

**CONTINUE vs EXIT**

| 핸들러 | 동작 |
|--------|------|
| CONTINUE HANDLER | 조건 발생 후 다음 문장 계속 실행 |
| EXIT HANDLER | 조건 발생 후 BEGIN...END 블록 즉시 종료 |

## 커서 사용 시 주의사항

### 1. 성능 문제 (가장 중요)

커서는 **행 단위 처리**이므로 대량 데이터에서 매우 느립니다.

```sql
-- 커서로 100만 건 처리: 10분 소요
DECLARE user_cursor CURSOR FOR SELECT id FROM users WHERE status = 'inactive';
-- 100만 번 FETCH + 100만 번 UPDATE

-- 집합 연산으로 100만 건 처리: 5초 소요
UPDATE users SET status = 'archived' WHERE status = 'inactive';
```

**왜 이렇게 빠른가?**

| 항목 | 커서 | 집합 연산 |
|------|------|-----------|
| 실행 계획 | 100만 번 생성 | 1번 생성 |
| 인덱스 접근 | 100만 번 (랜덤) | 1번 스캔 (순차) |
| CPU 캐시 | 비효율적 | 효율적 |
| 옵티마이저 최적화 | 적용 불가 | 적용 가능 |

**핵심**: 데이터베이스는 집합 단위로 동작하도록 설계되었습니다. 한 번의 명령으로 여러 행을 처리할 때 내부적으로 수많은 최적화가 적용됩니다.

커서는 이런 최적화를 모두 포기하고 "일일이 손으로 처리"하는 것과 같습니다.

### 2. 메모리 사용

OPEN 시 전체 결과를 메모리에 로드하므로 대량 데이터 처리 시 메모리 부족 위험이 있습니다.

### 3. 트랜잭션 길이

커서로 처리 중에는 잠금이 유지되므로, 긴 처리 시간 동안 테이블이 잠길 수 있습니다.

## 커서를 사용해야 하는 경우

다음 조건을 **모두** 만족할 때만 사용하세요:

1. 각 행마다 **복잡하고 다른 비즈니스 로직** 필요
2. 각 행마다 **외부 stored procedure 호출** 필요
3. **집합 연산으로 해결 불가능**
4. 데이터 양이 **적음** (수백~수천 건)

## 커서 vs 집합 연산

대부분의 경우 집합 연산으로 대체 가능합니다.

```sql
-- 커서 사용
DELIMITER $$
CREATE PROCEDURE deactivate_old_users_cursor()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_id INT;
    DECLARE user_cursor CURSOR FOR
        SELECT id FROM users WHERE last_login < DATE_SUB(NOW(), INTERVAL 1 YEAR);
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN user_cursor;
    read_loop: LOOP
        FETCH user_cursor INTO v_id;
        IF done THEN LEAVE read_loop; END IF;
        UPDATE users SET status = 'inactive' WHERE id = v_id;
    END LOOP;
    CLOSE user_cursor;
END$$
DELIMITER ;

-- 집합 연산 (100배 이상 빠름)
UPDATE users
SET status = 'inactive'
WHERE last_login < DATE_SUB(NOW(), INTERVAL 1 YEAR);
```

## 정리

### 핵심 원칙

**"커서는 마지막 수단입니다. 먼저 집합 연산으로 해결할 수 있는지 확인하세요."**

### 커서를 피해야 하는 경우

- **대량 데이터** 처리 (수만 건 이상)
- 단순 UPDATE/DELETE
- 계산 결과 업데이트
- **성능이 중요**한 경우

### MySQL 서버 vs 클라이언트 처리

- **MySQL 서버**: 기본 스트리밍 (ORDER BY/GROUP BY 시 버퍼링)
- **클라이언트**: JDBC 디폴트는 버퍼링 (스트리밍 모드 설정 가능)
- **서버 커서**: Stored Procedure 내에서 서버 메모리의 결과 집합 관리

집합 연산이 불가능할 때만 커서를 사용하고, 사용하더라도 배치 크기를 제한하고 트랜잭션을 분할하여 잠금 시간을 최소화해야 합니다.
