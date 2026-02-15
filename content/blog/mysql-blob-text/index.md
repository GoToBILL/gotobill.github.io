---
title: "MySQL BLOB과 TEXT 타입: 언제 쓰고, 왜 피해야 하는가"
date: "2026-02-15"
tags: ["MySQL", "Database", "InnoDB"]
category: "개발"
description: "MySQL의 BLOB과 TEXT 타입의 내부 동작 원리, 사용 사례, 그리고 성능 문제와 대안을 공식 문서 기반으로 정리합니다."
---

MySQL에서 큰 데이터를 저장할 때 사용하는 **BLOB**(Binary Large Object)과 **TEXT** 타입은 언뜻 보면 편리해 보이지만, 실제로는 많은 성능 문제와 제약사항을 가지고 있습니다.

이 글에서는 BLOB과 TEXT의 내부 동작 원리, 사용 사례, 그리고 왜 가능한 한 피해야 하는지를 정리합니다.

## BLOB과 TEXT란?

BLOB과 TEXT는 큰 데이터를 저장하기 위한 가변 길이 타입입니다. 두 타입의 핵심 차이는 **저장하는 데이터의 성격**입니다.

**BLOB (Binary Large Object)**

바이너리 문자열(Byte Strings)로 취급되며, 정렬과 비교는 바이트의 숫자값 기반으로 수행됩니다.

모든 데이터가 바이트로 저장되지만, BLOB과 TEXT의 핵심 차이는 MySQL이 데이터를 **어떻게 해석하는가**입니다.

**TEXT는 바이트를 문자로 해석합니다.**

'안녕'을 utf8mb4로 저장하면 `[EC 95 88 EB 85 95]` 6바이트로 저장됩니다. MySQL은 문자셋 정보를 알고 있어서 "이 6바이트는 2글자구나"라고 해석합니다. 비교할 때도 문자 단위로 collation 규칙을 적용합니다.

**BLOB은 바이트를 숫자 덩어리로만 취급합니다.**

같은 `[EC 95 88 EB 85 95]`를 저장해도, MySQL은 "이게 무슨 문자인지 몰라, 그냥 숫자 236, 149, 136, 235, 133, 149의 나열이야"라고만 인식합니다. 비교할 때도 바이트값을 직접 비교합니다.

**실제 예시**

```sql
-- BLOB: 바이트값 직접 비교 (대소문자 구분)
CREATE TABLE blob_test (data BLOB);
INSERT INTO blob_test VALUES ('Hello'), ('hello');
SELECT * FROM blob_test WHERE data = 'Hello';
-- 'Hello'만 반환 (H=72, h=104로 바이트값이 다름)

-- TEXT: collation 기반 비교 (대소문자 구분 없을 수 있음)
CREATE TABLE text_test (data TEXT COLLATE utf8mb4_general_ci);
INSERT INTO text_test VALUES ('Hello'), ('hello');
SELECT * FROM text_test WHERE data = 'Hello';
-- 'Hello', 'hello' 모두 반환 (ci = case insensitive)
```

**BLOB을 사용해야 하는 경우**

JPG 이미지 파일은 `[FF D8 FF E0 ...]` 같은 바이트들의 나열입니다. 

이것은 문자가 아니라 이미지 규격에 맞는 숫자 배열입니다. **TEXT로 저장하면 MySQL이 문자로 해석하려다 데이터가 손상될 수 있습니다.**

BLOB으로 저장하면 숫자 덩어리로만 취급하여 원본 그대로 보존됩니다.

```sql
CREATE TABLE images (
    id INT PRIMARY KEY,
    image_data BLOB  -- 이미지는 문자가 아닌 바이너리 데이터
);
```

**TEXT**

비바이너리 문자열(Character Strings)로 취급되며, 정렬과 비교는 해당 문자셋의 collation 기반으로 수행됩니다.

**Collation**은 문자셋의 정렬 규칙을 의미합니다. 같은 문자셋이라도 collation에 따라 대소문자 구분 여부, 악센트 구분 여부, 정렬 순서가 달라집니다.

예를 들어 `utf8mb4_general_ci`에서 **ci**(Case Insensitive)는 대소문자를 구분하지 않는다는 의미입니다. 

**따라서 'Hello'와 'hello'가 동일한 값으로 비교됩니다.** 반면 `utf8mb4_bin`은 바이너리 비교를 수행하여 대소문자를 구분합니다.

```sql
CREATE TABLE posts (
    id INT PRIMARY KEY,
    content TEXT  -- 텍스트 데이터
);
```

## 타입별 크기

BLOB과 TEXT는 각각 4가지 크기의 변형 타입을 제공합니다.

| BLOB 타입 | TEXT 타입 | 최대 길이 | 저장 공간 |
|----------|----------|---------|---------|
| TINYBLOB | TINYTEXT | 255 바이트 | L + 1 바이트 |
| BLOB | TEXT | 65,535 바이트 (64KB) | L + 2 바이트 |
| MEDIUMBLOB | MEDIUMTEXT | 16,777,215 바이트 (16MB) | L + 3 바이트 |
| LONGBLOB | LONGTEXT | 4,294,967,295 바이트 (4GB) | L + 4 바이트 |

**L**은 실제 저장되는 데이터의 바이트 길이입니다.

**중요 제한사항**

- LONGBLOB와 LONGTEXT는 최대 4,294,967,295 바이트 (약 4GB)까지 저장할 수 있습니다.
- InnoDB의 행 크기 제한은 65,535 바이트이지만, BLOB/TEXT는 오프페이지 저장되어 포인터만 행에 포함됩니다.


**일반 컬럼: 실제 데이터가 행에 저장됨**
```sql
CREATE TABLE test (
    id INT,              -- 4 바이트
    name VARCHAR(100),   -- 최대 100 바이트
    desc VARCHAR(60000)  -- 최대 60,000 바이트
);
-- 합계: 약 60,104 바이트 (65,535 이하이므로 OK)
```

**BLOB/TEXT: 포인터만 행에 저장됨**
```
CREATE TABLE posts (
    id INT,              -- 4 바이트
    title VARCHAR(200),  -- 최대 200 바이트
    content LONGTEXT     -- 포인터만 행에 포함 (실제 4GB는 오프페이지)
);
-- 합계: 약 216 바이트 (행 크기 제한 통과, 4GB 저장 가능)
```

## 내부 저장 방식: 오프 페이지 저장

BLOB과 TEXT의 가장 중요한 특징은 **오프 페이지(Off-Page) 저장**입니다. 

InnoDB의 Row Format에 따라 저장 방식이 다릅니다.

### COMPACT / REDUNDANT (구버전, MySQL 5.6 이하)

**동작 방식**: BLOB/TEXT 데이터의 **앞부분을 행에 포함**

```
┌─────────────────────────────────┐
│ 클러스터 인덱스 레코드 (행)           │
│ ┌─────────────────────────────┐ │
│ │ 첫 768바이트 (실제 데이터)       │ │ ← BLOB/TEXT의 앞부분
│ └─────────────────────────────┘ │
│         │                       │
│         ├──→ 오버플로우 페이지 1    │ ← 768바이트 이후 데이터
│         ├──→ 오버플로우 페이지 2    │
│         └──→ 오버플로우 페이지 3    │
└─────────────────────────────────┘
```

**특징**:
- 첫 768바이트는 B-Tree 노드 내 인덱스 레코드(행)에 저장
- 768바이트 초과분만 오버플로우 페이지에 저장
- 오버플로우 페이지 포인터: 9-12바이트
- 768바이트 이하 데이터는 오버플로우 페이지를 사용하지 않아 I/O 절감

### DYNAMIC (MySQL 5.7+, MySQL 8.0 기본값)

**동작 방식**: BLOB/TEXT 데이터를 **전체 오프페이지에 저장**

```
┌─────────────────────────────────┐
│ 클러스터 인덱스 레코드 (행)           │
│ ┌─────────────────────────────┐ │
│ │ 20바이트 포인터만 저장           │ │ ← 포인터만
│ └─────────────────────────────┘ │
│         │                       │
│         └──→ 오프 페이지           │ ← 전체 데이터
│              (전체 데이터)         │
└─────────────────────────────────┘
```

**특징**:
- 40바이트 초과 시 **전체 데이터**를 오프페이지에 저장 (COMPACT와 다름)
- 행에는 **20바이트 포인터**만 유지
- 40바이트 이하는 인라인 저장 (행에 직접 저장)
- 행 크기를 최소화하여 B-Tree 효율 향상

**포인터 크기 비교**:

| Row Format | 포인터 크기 | 행에 저장되는 BLOB/TEXT 데이터 |
|-----------|-----------|--------------------------|
| COMPACT/REDUNDANT | 9-12바이트 | 첫 768바이트 |
| DYNAMIC | 20바이트 | 없음 (40바이트 이하만 전체 저장) |

**오버플로우 페이지 동작**

행 크기가 페이지 크기의 절반을 초과하면 가변 길이 컬럼이 페이지 외부 저장소(오버플로우 페이지)로 자동 이동됩니다.

**가변 길이 컬럼 타입**

BLOB/TEXT뿐만 아니라 다음 컬럼 타입들도 오버플로우 페이지로 이동할 수 있습니다:

- **VARCHAR**: 가변 길이 문자열
- **VARBINARY**: 가변 길이 바이너리 데이터
- **TEXT**: TINYTEXT, TEXT, MEDIUMTEXT, LONGTEXT
- **BLOB**: TINYBLOB, BLOB, MEDIUMBLOB, LONGBLOB

**포인터 저장 방식**

오버플로우 페이지로 이동한 데이터는 **행에 포인터를 남깁니다**:

- **COMPACT/REDUNDANT**: 9-12바이트 포인터 + 첫 768바이트 저장
- **DYNAMIC**: 20바이트 포인터만 저장 (40바이트 초과 시)

**16KB 페이지 크기 제약**

InnoDB의 기본 페이지 크기는 **16KB**입니다.

B-Tree 구조를 유지하려면 한 페이지에 최소 2개의 행이 들어가야 하므로, 행 크기는 **8KB(페이지 크기의 절반)** 이하로 유지하는 것이 설계 원칙입니다.

행 크기가 8KB를 초과하면 오버플로우 메커니즘이 자동으로 작동하여 가변 길이 컬럼을 오버플로우 페이지로 이동시킵니다. 이 과정은 행이 8KB 이하가 될 때까지 반복됩니다.

```sql
-- 현재 Row Format 확인
SHOW TABLE STATUS LIKE 'posts'\G

-- Row Format 변경
ALTER TABLE posts ROW_FORMAT=DYNAMIC;
```

## 왜 사용하는가? 실제 사용 사례

### TEXT 타입 사용 사례

**1. 긴 게시글 본문**

```sql
CREATE TABLE posts (
    id INT PRIMARY KEY,
    title VARCHAR(200),
    content TEXT,  -- 수천 자 이상의 긴 글
    author_id INT,
    created_at DATETIME,
    INDEX idx_author_created (author_id, created_at)
);
```

**왜 VARCHAR 대신 TEXT를 사용하는가?**

VARCHAR(N)은 선언한 최대 크기 N이 행 크기 계산에 포함됩니다. 반면 TEXT는 포인터(9-20바이트)만 행 크기에 포함됩니다.

```sql
-- VARCHAR 사용 시 (불가능)
CREATE TABLE posts (
    title VARCHAR(200),      -- 200바이트
    content VARCHAR(60000),  -- 60,000바이트
    summary VARCHAR(5000)    -- 5,000바이트
);
-- 합계: 65,200바이트 → 행 크기 제한(65,535) 초과!
-- 65,535 초과하면 CREATE TABLE 자체가 실패

-- TEXT 사용 시 (가능)
CREATE TABLE posts (
    title VARCHAR(200),      -- 200바이트
    content TEXT,            -- 포인터 약 12-20바이트
    summary TEXT             -- 포인터 약 12-20바이트
);
-- 합계: 약 230바이트 → 행 크기 제한 통과
```

여러 개의 큰 텍스트 컬럼이 필요하면 TEXT를 사용해야 합니다.

**2. 로그 메시지**

```sql
CREATE TABLE error_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    stack_trace TEXT,  -- 긴 스택 트레이스
    error_message VARCHAR(500),
    created_at DATETIME,
    INDEX idx_created (created_at)
);
```

스택 트레이스처럼 길이가 가변적이고 예측하기 어려운 데이터에 사용됩니다.

**3. JSON 데이터 (MySQL 5.7 이전)**

```sql
CREATE TABLE settings (
    user_id INT PRIMARY KEY,
    preferences TEXT  -- {"theme": "dark", "lang": "ko", ...}
);
```

단, MySQL 5.7 이상에서는 **JSON 타입**을 사용하는 것이 훨씬 좋습니다.

### BLOB 타입 사용 사례

**1. 암호화된 데이터**

```sql
CREATE TABLE encrypted_data (
    id INT PRIMARY KEY,
    encrypted_content BLOB,  -- AES 암호화된 바이너리
    created_at DATETIME
);
```

암호화된 바이너리 데이터는 문자셋 변환이 일어나면 안 되므로 BLOB을 사용합니다.

**2. 직렬화된 객체**

```sql
CREATE TABLE cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    cache_value MEDIUMBLOB,  -- 직렬화된 객체
    expires_at DATETIME
);
```

직렬화된 바이너리 객체를 저장할 때 BLOB을 사용합니다.

## BLOB과 TEXT의 단점

### 1. 인덱스 제약사항

BLOB과 TEXT 컬럼을 인덱싱할 때는 반드시 **Prefix Length**를 지정해야 합니다.

```sql
-- 올바른 예시
CREATE TABLE test (
    content TEXT,
    INDEX idx_content (content(100))  -- 처음 100자만 인덱싱
);

-- 잘못된 예시 (에러 발생)
CREATE TABLE test (
    content TEXT,
    INDEX idx_content (content)  -- ERROR: BLOB/TEXT column 'content' used in key specification without a key length
);
```

**Row Format별 Prefix 길이 제한**

| Row Format | 최대 Prefix 길이 |
|-----------|-----------------|
| REDUNDANT / COMPACT | 767 바이트 |
| DYNAMIC / COMPRESSED | 3,072 바이트 |
| MyISAM | 1,000 바이트 |

**멀티바이트 문자셋 고려사항**

utf8mb4 문자셋에서 COMPACT row format 사용 시, 약 191자만 인덱싱할 수 있습니다.

767 ÷ 4 = 191.75자

```sql
-- utf8mb4 문자셋에서 인덱스 생성
CREATE TABLE posts (
    content TEXT CHARACTER SET utf8mb4,
    INDEX idx_content (content(191))  -- COMPACT: 최대 191자
) ROW_FORMAT=COMPACT;

-- DYNAMIC: 최대 768자
CREATE TABLE posts (
    content TEXT CHARACTER SET utf8mb4,
    INDEX idx_content (content(768))  -- DYNAMIC: 최대 768자
) ROW_FORMAT=DYNAMIC;
```

### 2. 성능 문제

**오프 페이지 저장으로 인한 추가 I/O**

BLOB/TEXT 데이터가 오프 페이지에 저장되면, 데이터를 읽을 때 추가 I/O가 발생합니다.

```sql
-- 목록 조회 시 불필요한 content까지 읽음
SELECT * FROM posts ORDER BY created_at DESC LIMIT 10;

-- 최적화: 필요한 컬럼만 선택
SELECT id, title, author_id, created_at
FROM posts
ORDER BY created_at DESC
LIMIT 10;
```

**버퍼 풀 메모리 낭비**

BLOB/TEXT 데이터가 버퍼 풀에 캐시되면 다른 중요한 데이터를 밀어낼 수 있습니다.

**정렬 제약**

`max_sort_length` 기본값은 1024바이트입니다. ORDER BY 시 처음 1024바이트만 정렬에 사용됩니다.

```sql
-- 기본값: 1024바이트만 정렬
SELECT id, content FROM posts ORDER BY content;

-- 정렬 길이 증가 (세션 단위)
SET SESSION max_sort_length = 2000;
SELECT id, content FROM posts ORDER BY content;
```

**데이터 전송 제약**

큰 BLOB/TEXT 데이터 전송 시 `max_allowed_packet` 조정이 필요합니다.

```sql
-- 서버 설정 확인
SHOW VARIABLES LIKE 'max_allowed_packet';

-- 전역 설정 변경 (서버 재시작 필요)
SET GLOBAL max_allowed_packet = 104857600;  -- 100MB
```

### 3. 임시 테이블 문제

**MySQL 8.0.13 이전**

BLOB 또는 TEXT 컬럼이 포함된 쿼리는 메모리 기반 MEMORY 엔진을 사용할 수 없어, 자동으로 디스크 기반 임시 테이블로 전환됩니다.

```sql
-- MySQL 8.0.12 이하: 디스크 임시 테이블 사용
SELECT content, COUNT(*)
FROM posts
GROUP BY content;
```

**MySQL 8.0.13 이상 (TempTable 엔진)**

TempTable 엔진이 BLOB 및 TEXT 타입을 지원하여 성능이 개선되었습니다.

```sql
-- TempTable 엔진 확인
SHOW VARIABLES LIKE 'internal_tmp_mem_storage_engine';
-- 기본값: TempTable (권장)

-- TempTable 메모리 설정
SHOW VARIABLES LIKE 'temptable_max_ram';
-- 기본값: 1GB
```

**디스크 기반 임시 테이블로 전환되는 조건**

-   `tmp_table_size` 초과
-   `temptable_max_ram` 초과 (기본값: 1GB)
-   512바이트를 초과하는 문자열 컬럼 포함

**모니터링**

```sql
-- 임시 테이블 생성 통계 확인
SHOW STATUS LIKE 'Created_tmp%';

-- Created_tmp_tables: 메모리/디스크 모두
-- Created_tmp_disk_tables: 디스크만
```

### 4. 기타 제약사항

**DEFAULT 값을 가질 수 없음**

```sql
-- 에러 발생
CREATE TABLE posts (
    content TEXT DEFAULT 'empty'
);

-- 해결: 애플리케이션에서 처리
CREATE TABLE posts (
    content TEXT
);
```

## 대안과 최적화 방법

### 1. VARCHAR 사용 (64KB 이하)

대부분의 경우 VARCHAR로 충분합니다.

```sql
-- 대부분의 게시글 제목/설명
title VARCHAR(200)
description VARCHAR(2000)  -- 2000자면 충분

-- TEXT는 정말 필요한 경우에만
content TEXT
```

### 2. 파일은 외부 스토리지에 저장

```sql
-- 안티패턴: DB에 이미지 저장
CREATE TABLE users (
    id INT PRIMARY KEY,
    profile_image BLOB  -- X
);

-- 올바른 방법: S3/CDN 경로만 저장
CREATE TABLE users (
    id INT PRIMARY KEY,
    profile_image_url VARCHAR(500)  -- O
    -- 예: https://cdn.example.com/images/user123.jpg
);
```

**외부 스토리지 사용의 장점**

-   DB 용량 절약
-   백업 속도 향상
-   CDN을 통한 빠른 전송
-   DB 부하 감소
-   이미지 리사이징, 변환 등 처리 용이

### 3. JSON 타입 사용 (MySQL 5.7+)

```sql
-- 안티패턴: TEXT로 JSON 저장
CREATE TABLE settings (
    user_id INT PRIMARY KEY,
    preferences TEXT  -- {"theme": "dark", "lang": "ko"}
);

-- 올바른 방법: JSON 타입
CREATE TABLE settings (
    user_id INT PRIMARY KEY,
    preferences JSON  -- JSON 유효성 검증, 함수 지원
);

-- JSON 함수 사용
SELECT JSON_EXTRACT(preferences, '$.theme') AS theme
FROM settings
WHERE user_id = 1;

-- Generated Column + Index
ALTER TABLE settings
ADD COLUMN theme VARCHAR(20) AS (JSON_UNQUOTE(JSON_EXTRACT(preferences, '$.theme'))),
ADD INDEX idx_theme (theme);
```

**JSON 타입의 장점**

-   JSON 유효성 검증
-   JSON 함수 지원 (`JSON_EXTRACT`, `JSON_SET`, `JSON_ARRAY` 등)
-   부분 업데이트 가능
-   Generated Column을 통한 인덱스 지원

### 4. 별도 테이블로 분리

```sql
-- 게시글 메타데이터
CREATE TABLE posts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    author_id INT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME,
    INDEX idx_author_created (author_id, created_at),
    INDEX idx_created (created_at)
);

-- 게시글 본문은 별도 테이블
CREATE TABLE post_contents (
    post_id INT PRIMARY KEY,
    content MEDIUMTEXT NOT NULL,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);
```

**분리의 장점**

-   목록 조회 시 본문을 읽지 않아 빠름
-   본문이 필요할 때만 별도 조회
-   인덱스 효율 향상
-   버퍼 풀 효율 향상

```sql
-- 목록 조회: 빠름 (post_contents 접근 안 함)
SELECT id, title, author_id, created_at
FROM posts
ORDER BY created_at DESC
LIMIT 20;

-- 상세 조회: JOIN으로 본문 가져오기
SELECT p.*, pc.content
FROM posts p
JOIN post_contents pc ON p.id = pc.post_id
WHERE p.id = 123;
```

### 5. 압축 사용

**MySQL 테이블 레벨 압축**

MySQL이 자동으로 압축/해제를 처리합니다. 테이블의 모든 컬럼이 압축됩니다.

```sql
CREATE TABLE logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    log TEXT,
    created_at DATETIME,
    INDEX idx_created (created_at)
) ROW_FORMAT=COMPRESSED;

-- 검색 가능 (MySQL이 자동 해제)
SELECT * FROM logs WHERE log LIKE '%error%';
```

**애플리케이션 레벨 압축**

애플리케이션 코드에서 gzip 등으로 압축하여 BLOB에 저장합니다.

```sql
CREATE TABLE snapshots (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200),          -- 검색 가능
    snapshot_data MEDIUMBLOB,   -- 애플리케이션이 gzip 압축
    created_at DATETIME,
    INDEX idx_created (created_at)
);

-- 검색 불가능 (압축된 상태로 저장)
-- WHERE snapshot_data LIKE '%..%' 동작 안 함
```

**비교**

| 방식 | 압축 주체 | 검색 가능 | CPU 부담 | 선택적 압축 |
|------|-----------|-----------|----------|------------|
| 테이블 레벨 | MySQL | 가능 | MySQL 서버 | 불가능 (전체) |
| 애플리케이션 | 애플리케이션 | 불가능 | 애플리케이션 | 가능 (특정 컬럼) |

**권장사항**

일반적으로는 MySQL 테이블 레벨 압축을 사용하고, 다음과 같은 특수한 경우에만 애플리케이션 레벨 압축을 사용합니다:

- 검색이 필요 없는 데이터 (로그 스냅샷, 백업 데이터)
- 특정 컬럼만 압축하고 다른 컬럼은 검색해야 하는 경우
- MySQL CPU 사용을 최소화해야 하는 경우

### 6. TempTable 최적화

MySQL 8.0.13 이상을 사용하고, TempTable 설정을 최적화합니다.

```sql
-- TempTable 메모리 증가 (서버 메모리가 충분한 경우)
SET GLOBAL temptable_max_ram = 2147483648;  -- 2GB

-- 현재 설정 확인
SHOW VARIABLES LIKE 'temptable%';
```

## 정리: 언제 무엇을 사용할까?

| 상황 | 권장 방법 |
|------|-----------|
| 짧은 텍스트 (수백 자) | `VARCHAR(500)` |
| 긴 텍스트 (수천 자) | `TEXT` (별도 테이블로 분리 권장) |
| 매우 긴 텍스트 (수만 자 이상) | `MEDIUMTEXT` 또는 `LONGTEXT` (별도 테이블 필수) |
| JSON 데이터 | `JSON` 타입 (MySQL 5.7+) |
| 이미지/파일 | S3/CDN + `VARCHAR(URL)` |
| 암호화된 바이너리 | `BLOB` |
| 로그/스택 트레이스 | `TEXT` (읽기 전용, 자주 조회 안 함) |

## 결론

BLOB과 TEXT는 큰 데이터를 저장할 수 있는 편리한 타입이지만, 다음과 같은 단점이 있습니다.

**주요 단점 요약**

1.  **오프 페이지 저장**으로 추가 I/O 발생
2.  **인덱스 Prefix 제약**으로 검색 최적화 어려움
3.  **임시 테이블** 사용 시 디스크 전환 가능 (MySQL 8.0.13 이전)
4.  **정렬, 그룹핑** 성능 저하
5.  **버퍼 풀** 메모리 낭비

**권장사항**

-   가능하면 **VARCHAR**를 사용합니다.
-   이미지/파일은 **외부 스토리지**(S3, CDN)를 사용합니다.
-   JSON 데이터는 **JSON 타입**을 사용합니다.
-   정말 필요한 경우에만 TEXT를 사용하고, **별도 테이블로 분리**합니다.
-   MySQL 8.0.13 이상을 사용하여 **TempTable의 BLOB 지원**을 활용합니다.

BLOB과 TEXT는 "언제 쓸 것인가"보다 "언제 쓰지 말 것인가"를 먼저 고민해야 하는 타입입니다.
