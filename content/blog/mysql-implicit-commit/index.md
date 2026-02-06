---
title: "MySQL 트랜잭션에서 BEGIN 대신 autocommit=0을 써야 하는 이유"
date: "2026-01-26"
description: "LOCK TABLES와 DDL 작업 시 암시적 커밋을 피하는 방법"
category: "개발"
tags: ["MySQL", "Database", "Lock", "트랜잭션"]
---

## 문제 상황

다음과 같은 작업을 안전하게 수행해야 한다고 가정하겠습니다.

```sql
-- 테이블 이름 교체 작업
LOCK TABLES old_table WRITE, new_table WRITE;
RENAME TABLE old_table TO backup_table, new_table TO old_table;
UNLOCK TABLES;
```

이 작업을 트랜잭션으로 감싸서 실패 시 롤백하고 싶다면 어떻게 해야 할까요?

```sql
-- 잘못된 방법
BEGIN;
LOCK TABLES old_table WRITE, new_table WRITE;
RENAME TABLE old_table TO backup_table, new_table TO old_table;
COMMIT;
UNLOCK TABLES;
```

위 코드는 의도대로 동작하지 않습니다. `LOCK TABLES` 실행 시점에 트랜잭션이 자동으로 커밋되어 버리기 때문입니다.

## BEGIN/START TRANSACTION의 함정: 암시적 커밋

MySQL은 특정 SQL 문장을 실행하는 순간 **암시적 커밋**(Implicit Commit)을 발생시킵니다. `BEGIN`이나 `START TRANSACTION`으로 트랜잭션을 열어두었어도, 해당 문장이 실행되면 MySQL은 사용자 허락 없이 즉시 `COMMIT`을 수행하고 트랜잭션을 종료합니다.

### 암시적 커밋을 발생시키는 주요 구문

MySQL 8.0 공식 문서에 따르면, 다음 범주의 구문들이 암시적 커밋을 발생시킵니다.

**1. DDL 구문**(Data Definition Language)

모든 DDL 구문은 실행 전에 현재 활성화된 트랜잭션을 자동으로 커밋합니다.

```sql
-- 테이블 작업
CREATE TABLE, ALTER TABLE, DROP TABLE, TRUNCATE TABLE, RENAME TABLE

-- 인덱스 작업
CREATE INDEX, DROP INDEX

-- 뷰 작업
CREATE VIEW, ALTER VIEW, DROP VIEW

-- 저장 프로시저/함수
CREATE PROCEDURE, DROP PROCEDURE, CREATE FUNCTION, DROP FUNCTION

-- 기타
CREATE TRIGGER, DROP TRIGGER, CREATE EVENT, DROP EVENT
```

**중요**: `RENAME TABLE`은 DDL 구문이므로 암시적 커밋을 발생시킵니다.

**2. 트랜잭션 제어 및 락 구문**

```sql
-- 트랜잭션 제어
BEGIN
START TRANSACTION

-- 테이블 락
LOCK TABLES
UNLOCK TABLES (비트랜잭션 테이블 락을 획득한 경우에만)

-- autocommit 변경
SET autocommit = 1 (값이 이미 1이 아닌 경우에만)
```

**핵심 문제**: `LOCK TABLES` 실행 시 현재 트랜잭션이 커밋되고, `BEGIN` 실행 시 기존 테이블 락이 해제됩니다.

**3. 권한 관리 구문**

```sql
ALTER USER, CREATE USER, DROP USER, GRANT, REVOKE, SET PASSWORD
```

**4. 관리 구문**

```sql
ANALYZE TABLE, OPTIMIZE TABLE, REPAIR TABLE, CHECK TABLE, FLUSH
```

### 암시적 커밋 동작 방식

DDL 구문은 자체적인 특별한 트랜잭션으로 처리되며, 구문 실행 **전에** 현재 활성화된 트랜잭션을 자동으로 커밋합니다.

```sql
BEGIN;
INSERT INTO users VALUES (1, 'Alice');  -- 트랜잭션에 포함됨
RENAME TABLE old_table TO new_table;    -- 이전 INSERT가 자동 커밋됨
-- ROLLBACK을 해도 INSERT는 취소되지 않음
```

`ROLLBACK`은 `RENAME TABLE` 자체를 취소하지 못하며, 이미 커밋된 `INSERT`도 되돌릴 수 없습니다.

## LOCK TABLES와 트랜잭션의 충돌

`LOCK TABLES`와 트랜잭션 제어 구문은 서로 암시적 커밋을 발생시킵니다.

**LOCK TABLES 실행 시**

테이블 락을 시도하기 **전에** 활성화된 트랜잭션을 암시적으로 커밋합니다.

```sql
BEGIN;
INSERT INTO users VALUES (1, 'Alice');
LOCK TABLES users WRITE;  -- INSERT가 자동 커밋됨
-- 이제 트랜잭션이 없음
```

**START TRANSACTION 실행 시**

트랜잭션을 시작하면 현재 트랜잭션을 암시적으로 커밋하고 기존 테이블 락을 해제합니다.

```sql
LOCK TABLES users WRITE;
BEGIN;  -- 테이블 락이 자동 해제됨
-- 이제 락이 없음
```

## autocommit=0이 필요한 이유

`SET autocommit=0`은 트랜잭션을 "시작"하는 선언이 아니라, 세션의 **기본 동작 모드**를 수동으로 바꾸는 것입니다.

### BEGIN vs autocommit=0 비교

| 특성 | START TRANSACTION | SET autocommit=0 |
|------|-------------------|------------------|
| 범위 | 단일 트랜잭션 시작 | 전체 세션에 대해 autocommit 비활성화 |
| 지속 시간 | COMMIT/ROLLBACK까지 | autocommit이 다시 활성화될 때까지 |
| COMMIT/ROLLBACK 이후 | 이전 autocommit 상태로 복원 | 새로운 트랜잭션이 자동으로 시작됨 |
| 암시적 커밋 대응 | DDL/LOCK 구문에 의해 강제 종료됨 | 지속적인 수동 모드 유지 |

### 동작 방식 차이

**BEGIN 방식**

"지금부터 다음 커밋까지 한시적으로 묶어줘" 라는 의미입니다. DDL이나 LOCK 명령이 들어오면 "이건 못 묶어!" 하고 강제 종료됩니다.

```sql
BEGIN;
INSERT INTO users VALUES (1, 'Alice');
LOCK TABLES users WRITE;  -- 트랜잭션 강제 종료
-- 이제 트랜잭션 없음
```

**autocommit=0 방식**

"앞으로 내가 COMMIT이라고 말하기 전까지는 무슨 일이 있어도 DB에 영구 저장하지 마" 라는 의미입니다. 좀 더 강압적이고 지속적인 수동 모드를 유지합니다.

```sql
SET autocommit=0;
INSERT INTO users VALUES (1, 'Alice');
LOCK TABLES users WRITE;  -- INSERT는 여전히 커밋되지 않은 상태
RENAME TABLE old_table TO new_table;  -- RENAME은 자체 커밋되지만 환경은 수동 모드 유지
COMMIT;  -- 명시적 커밋
UNLOCK TABLES;
```

## MySQL 공식 문서의 권장 패턴

MySQL 8.0 공식 문서는 InnoDB 테이블에서 `LOCK TABLES`를 사용할 때 다음 패턴을 명시적으로 권장합니다.

```sql
SET autocommit=0;
LOCK TABLES t1 WRITE, t2 READ;
-- 테이블 t1, t2로 작업 수행
COMMIT;
UNLOCK TABLES;
```

### 이 방식이 동작하는 이유

1. InnoDB는 `LOCK TABLES` 호출 시 내부적으로 자체 테이블 락을 획득합니다
2. InnoDB는 다음 `COMMIT` 시점에 내부 락을 해제합니다
3. MySQL은 `UNLOCK TABLES` 호출 시에만 테이블 락을 해제합니다
4. 이 순서는 데드락을 방지합니다

### autocommit=1 사용 시 문제점

`autocommit=1`인 경우 InnoDB가 `LOCK TABLES` 호출 직후 내부 테이블 락을 즉시 해제하여 데드락이 쉽게 발생합니다.

## RENAME TABLE 작업 예시

테이블 이름을 안전하게 교체하는 올바른 방법입니다.

```sql
SET autocommit=0;
LOCK TABLES old_table WRITE, new_table WRITE;

-- 원자적으로 실행됨 (모두 성공 또는 모두 실패)
RENAME TABLE
    old_table TO backup_table,
    new_table TO old_table;

COMMIT;
UNLOCK TABLES;
```

### RENAME TABLE의 원자성

`RENAME TABLE` 작업은 원자적으로 수행됩니다. 트랜잭션 테이블 락 조건이 충족되면 rename 작업은 원자적으로 수행되며, rename이 진행되는 동안 다른 세션은 어떤 테이블에도 접근할 수 없습니다.

- 관련된 모든 테이블이 작업 중 락됩니다
- 모든 테이블이 성공적으로 rename되거나 아무것도 변경되지 않습니다
- 부분적인 상태는 다른 세션에 보이지 않습니다

`RENAME TABLE` 중 에러가 발생하면 구문이 실패하고 변경 사항이 전혀 적용되지 않습니다.

## 메타데이터 락 자동 획득

MySQL은 모든 SQL 문장 실행 시 **메타데이터 락**(Metadata Lock)을 자동으로 획득합니다. 이는 테이블 구조의 일관성을 보장하기 위한 메커니즘입니다.

### 메타데이터 락이 자동으로 잡히는 경우

**DML 문장**

```sql
-- SELECT: MDL_SHARED_READ 락
SELECT * FROM users WHERE id = 1;

-- INSERT/UPDATE/DELETE: MDL_SHARED_WRITE 락
INSERT INTO users VALUES (1, 'Alice');
UPDATE users SET name = 'Bob' WHERE id = 1;
DELETE FROM users WHERE id = 1;
```

**DDL 문장**

```sql
-- ALTER TABLE: 2단계 진행
-- 1단계: MDL_SHARED_UPGRADABLE 락
-- 2단계: MDL_EXCLUSIVE 락으로 업그레이드
ALTER TABLE users ADD COLUMN email VARCHAR(255);

-- SHOW CREATE TABLE: MDL_SHARED 락
SHOW CREATE TABLE users;
```

### 메타데이터 락 획득 프로세스

1. 모든 쿼리는 파싱 단계에서 메타데이터 락 요청을 초기화합니다
2. 테이블을 열기 전에 메타데이터 락을 먼저 획득합니다
3. 외래키 관계가 있으면 연관 테이블에도 자동으로 확장됩니다

### 메타데이터 락 호환성

메타데이터 락은 공유 락과 배타 락으로 구분되며, 호환성은 다음과 같습니다.

| | MDL_SHARED_READ (SELECT) | MDL_SHARED_WRITE (DML) | MDL_EXCLUSIVE (DDL) |
|---|---|---|---|
| **MDL_SHARED_READ (SELECT)** | 호환 | 호환 | 충돌 |
| **MDL_SHARED_WRITE (DML)** | 호환 | 호환 | 충돌 |
| **MDL_EXCLUSIVE (DDL)** | 충돌 | 충돌 | 충돌 |

**호환**: 동시에 여러 트랜잭션이 락을 획득할 수 있습니다.

**충돌**: 락을 획득하지 못하고 대기합니다.

DML과 SELECT는 공유 락이므로 서로 충돌하지 않고 동시에 실행됩니다. DDL은 배타 락이므로 모든 작업과 충돌하며, 다른 트랜잭션이 모두 종료될 때까지 대기합니다.

### 메타데이터 락이 해제되는 시점

기본 원칙은 트랜잭션이 완료(`COMMIT`/`ROLLBACK`)될 때까지 유지되는 것입니다.

**예외 상황**

- **Autocommit 모드**: 각 문장 종료 시 즉시 해제
- **PREPARE 문**: PREPARE 후 즉시 해제
- **XA 트랜잭션**: PREPARED 상태에서 연결 해제 후에도 유지
- **실패한 문장**: 오류 발생해도 트랜잭션 끝까지 유지 (바이너리 로그 일관성)

### MySQL 락 종류와 타임아웃

MySQL에는 여러 레벨의 락이 존재하며, 각 락은 다른 타임아웃 설정을 사용합니다.

| 락 종류 | 레벨 | 충돌 조건 | 타임아웃 설정 |
|---------|------|-----------|---------------|
| IX, IS | 테이블 (의도 락) | IX끼리는 호환 | - |
| X, S | 행 (레코드 락) | 같은 행이면 충돌 | innodb_lock_wait_timeout (기본 50초) |
| 갭 락 | 행 사이 | 같은 갭이면 충돌 | innodb_lock_wait_timeout (기본 50초) |
| 넥스트 키 락 | 레코드+갭 | 범위 겹치면 충돌 | innodb_lock_wait_timeout (기본 50초) |
| 메타데이터 락 | 테이블 구조 | DDL과 DML/SELECT 충돌 시 | lock_wait_timeout (기본 31536000초 = 1년) |

**IX, IS 락**: 의도 락으로 테이블 레벨에서 "행에 락을 잡을 것이다"라는 신호만 보냅니다. IX끼리는 호환되므로 충돌하지 않습니다.

**레코드 레벨 락**: 실제 충돌은 행, 갭, 넥스트 키 락에서 발생하며 `innodb_lock_wait_timeout`이 적용됩니다.

**메타데이터 락**: DDL 실행 시 DML/SELECT와 충돌하며 `lock_wait_timeout`이 적용됩니다. 기본값이 1년이므로 사실상 무한정 대기합니다.

### 락 획득 순서

**DML**: 문장에 나타난 테이블 순서대로 획득

```sql
-- users 먼저, orders 나중에
UPDATE users u JOIN orders o ON u.id = o.user_id
SET u.total = u.total + 100;
```

**DDL**: 알파벳 순서로 정렬하여 획득 (데드락 방지)

```sql
-- 내부적으로 테이블 이름을 정렬하여 락 획득
RENAME TABLE z_table TO a_table, a_table TO z_table;
```

### 메타데이터 락 큐 동작 (MySQL 5.7 이후)

MySQL 5.7 이후부터는 메타데이터 락을 **FIFO**(First In First Out) 방식으로 처리합니다. 이는 공정성을 보장하지만, DDL 작업으로 인해 후속 SELECT 쿼리들도 함께 대기하는 상황이 발생할 수 있습니다.

**락 큐 동작 예시**

```
T1: SELECT 실행 중 (MDL_SHARED_READ 획득)
T2: RENAME 도착 (MDL_EXCLUSIVE 필요) → 큐에 대기
T3: SELECT 도착 (MDL_SHARED_READ 필요) → 큐에 대기 (T2 뒤)
T4: SELECT 도착 (MDL_SHARED_READ 필요) → 큐에 대기 (T3 뒤)
```

**문제점**

T2의 RENAME이 T1이 끝나기를 기다리는 동안, T3와 T4의 SELECT도 함께 대기합니다. T1만 끝나면 T3와 T4는 즉시 실행될 수 있지만 (공유 락이므로), FIFO 정책 때문에 T2가 먼저 처리될 때까지 기다려야 합니다.

이는 읽기 트래픽이 많은 서비스에서 **DDL 작업이 읽기 성능에 큰 영향**을 미칠 수 있음을 의미합니다.

### 확장성 측면의 해결 방안

메타데이터 락으로 인한 성능 저하를 해결하기 위한 방법들입니다.

**1. 짧은 lock_wait_timeout 설정**

DDL 작업 시 타임아웃을 짧게 설정하여 오래 기다리지 않고 재시도합니다.

```sql
SET SESSION lock_wait_timeout = 10;  -- 10초
RENAME TABLE old_table TO new_table;
-- 10초 내에 락을 획득하지 못하면 에러, 재시도 로직 필요
```

**2. Read Replica 활용**

읽기 트래픽과 DDL 작업을 분리합니다.

```
Master: RENAME TABLE 실행
Replica: SELECT 트래픽 처리
```

애플리케이션에서 읽기는 Replica로, 쓰기와 DDL은 Master로 분리하면 메타데이터 락 큐 경합을 줄일 수 있습니다.

**3. Online DDL 활용**

MySQL 8.0의 Online DDL은 대부분의 ALTER TABLE 작업을 DML과 동시에 실행할 수 있도록 지원합니다.

```sql
-- ALGORITHM=INPLACE, LOCK=NONE을 사용하면
-- 작업 중에도 SELECT/DML 가능
ALTER TABLE users ADD COLUMN email VARCHAR(255),
    ALGORITHM=INPLACE, LOCK=NONE;
```

**4. 점검 시간대 활용**

트래픽이 적은 시간대에 DDL 작업을 수행하여 메타데이터 락 경합을 최소화합니다.

## 정리

`LOCK TABLES`와 DDL 작업을 안전하게 수행하려면:

1. `BEGIN`이나 `START TRANSACTION` 대신 `SET autocommit=0` 사용
2. 작업 완료 후 `COMMIT` 명시적 호출
3. `UNLOCK TABLES`로 락 해제
4. 메타데이터 락은 자동으로 획득되며 트랜잭션 종료 시 해제됨

이 방식을 사용하면 암시적 커밋의 함정을 피하고, DDL과 락 작업을 안전하게 트랜잭션으로 관리할 수 있습니다.
