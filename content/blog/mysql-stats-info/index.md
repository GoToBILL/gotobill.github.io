---
title: "MySQL 테이블 통계 정보 완벽 가이드"
date: "2025-10-17"
description: "MySQL 통계 정보가 쿼리 성능에 미치는 영향과 영구 통계 정보 관리 방법을 설명합니다."
category: "개발"
tags: ["MySQL", "Database", "Performance", "Statistics", "InnoDB"]
---

## 통계 정보가 왜 중요한가?

MySQL 옵티마이저는 쿼리 실행 계획을 수립할 때 통계 정보에 의존합니다. 통계 정보가 부정확하면 최악의 실행 계획이 선택될 수 있습니다.

**실제 사례**

1억 건의 레코드가 있는 테이블인데 통계 정보가 갱신되지 않아 10건으로 잘못 기록된 경우:

- 옵티마이저 판단: "레코드가 10건밖에 없으니 인덱스보다 풀 테이블 스캔이 빠르겠다"
- 실제 실행: 1억 건을 모두 스캔
- 결과: 0.1초면 끝날 쿼리가 1시간 소요

비용 기반 최적화(Cost-based Optimization)에서 통계 정보의 정확도는 곧 쿼리 성능입니다.

## MySQL 5.5 vs 5.6+ 통계 정보 관리

### MySQL 5.5 이전: 휘발성 통계

통계 정보가 메모리에만 존재했습니다.

```sql
-- 통계 정보 확인
SHOW INDEX FROM employees;
```

**문제점**

- MySQL 재시작 시 통계 정보 소실
- 서버 시작 시 모든 테이블 통계 재수집 필요
- 의도하지 않은 시점에 통계 자동 갱신
- 갱신 시점을 예측할 수 없어 실행 계획이 갑자기 변경됨

**자동 갱신 조건**

- 테이블 새로 오픈
- 전체 레코드의 1/16 이상 변경
- ANALYZE TABLE 실행
- SHOW TABLE STATUS 실행
- InnoDB 모니터 활성화

이런 조건에서 통계가 갑자기 변경되면 잘 동작하던 쿼리가 갑자기 느려질 수 있습니다.

### MySQL 5.6+: 영구 통계 정보

통계 정보를 테이블에 저장하여 영구 보관합니다.

```sql
-- 통계 정보 저장 테이블 확인
SHOW TABLES LIKE '%_stats';
```

| Tables_in_mysql |
|-----------------|
| innodb_index_stats |
| innodb_table_stats |

**innodb_table_stats**: 테이블 전체 통계

```sql
SELECT * FROM mysql.innodb_table_stats
WHERE database_name='mydb' AND table_name='orders';
```

| n_rows | clustered_index_size | sum_of_other_index_sizes |
|--------|---------------------|--------------------------|
| 299202 | 929 | 642 |

- **n_rows**: 테이블 전체 레코드 수
- **clustered_index_size**: 프라이머리 키 크기 (InnoDB 페이지 개수)
- **sum_of_other_index_sizes**: 프라이머리 키를 제외한 인덱스의 크기

**innodb_index_stats**: 인덱스별 통계

```sql
SELECT index_name, stat_name, stat_value, stat_description
FROM mysql.innodb_index_stats
WHERE database_name='mydb' AND table_name='orders';
```

| index_name | stat_name | stat_value | stat_description |
|------------|-----------|------------|------------------|
| PRIMARY | n_diff_pfx01 | 1000000 | order_id |
| PRIMARY | n_leaf_pages | 2300 | Number of leaf pages |
| idx_user | n_diff_pfx01 | 50000 | user_id |
| idx_user | n_leaf_pages | 800 | Number of leaf pages |

- **n_diff_pfx01**: 인덱스 유니크 값 개수 (카디널리티)
- **n_leaf_pages**: 리프 노드 페이지 개수
- **size**: 인덱스 전체 페이지 개수

## 영구 통계 정보 설정

### STATS_PERSISTENT 옵션

테이블 생성 시 통계 정보 관리 방식을 지정합니다.

```sql
-- 영구 통계 사용
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    user_id INT,
    amount DECIMAL(10,2)
) ENGINE=InnoDB STATS_PERSISTENT=1;

-- 휘발성 통계 사용 (5.5 방식)
CREATE TABLE temp_orders (
    order_id INT PRIMARY KEY,
    amount DECIMAL(10,2)
) ENGINE=InnoDB STATS_PERSISTENT=0;

-- 기존 테이블 변경
ALTER TABLE products STATS_PERSISTENT=1;
```

**옵션 값**

- **STATS_PERSISTENT=1**: 통계 정보를 innodb_table_stats, innodb_index_stats에 저장
- **STATS_PERSISTENT=0**: MySQL 5.5 방식 (메모리에만 저장)
- **STATS_PERSISTENT=DEFAULT**: innodb_stats_persistent 시스템 변수 값 따름 (기본값 ON)

### STATS_AUTO_RECALC 옵션

통계 정보 자동 갱신 여부를 제어합니다.

```sql
-- 자동 갱신 비활성화
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    user_id INT
) ENGINE=InnoDB
  STATS_PERSISTENT=1
  STATS_AUTO_RECALC=0;

-- 기존 테이블 변경
ALTER TABLE orders STATS_AUTO_RECALC=1;
```

**옵션 값**

- **STATS_AUTO_RECALC=0**: 자동 갱신 비활성화, ANALYZE TABLE로만 갱신
- **STATS_AUTO_RECALC=1**: MySQL 5.5 방식처럼 자동 갱신
- **STATS_AUTO_RECALC=DEFAULT**: innodb_stats_auto_recalc 시스템 변수 값 따름 -> 1이 디폴트임.

### 샘플링 설정

MySQL은 전체 데이터를 스캔하지 않고 일부 페이지만 샘플링하여 통계를 수집합니다.

**시스템 변수**

```sql
-- 영구 통계 샘플링 (ANALYZE TABLE 실행 시)
SET GLOBAL innodb_stats_persistent_sample_pages = 20;  -- 기본값

-- 자동 통계 샘플링 (자동 갱신 시)
SET GLOBAL innodb_stats_transient_sample_pages = 8;  -- 기본값
```

**샘플링 크기와 정확도**

| 샘플 페이지 | 정확도 | 수집 시간 | 용도 |
|------------|--------|----------|------|
| 8 | 낮음 | 빠름 | 자동 갱신 (참고용) |
| 20 | 보통 | 보통 | 기본 설정 |
| 100 | 높음 | 느림 | 대용량 테이블, 중요 쿼리 |

대부분의 경우 기본값 20으로 충분합니다. 다만 수억 건 이상의 대용량 테이블이면서 쿼리 성능이 매우 중요한 경우 샘플링 값을 높일 수 있습니다.

```sql
-- 특정 테이블만 정밀하게 수집
SET GLOBAL innodb_stats_persistent_sample_pages = 100;
ANALYZE TABLE critical_orders;
SET GLOBAL innodb_stats_persistent_sample_pages = 20;  -- 원복
```

### 통계 정보 확인

```sql
-- 인덱스 통계 확인
SHOW INDEX FROM orders;

-- 상세 통계 확인
SELECT
    index_name,
    stat_name,
    stat_value,
    stat_description
FROM mysql.innodb_index_stats
WHERE database_name = 'mydb'
  AND table_name = 'orders'
ORDER BY index_name, stat_name;
```

### 설정 확인

```sql
-- 현재 설정 확인
SHOW VARIABLES LIKE 'innodb_stats%';
```

| Variable_name | Value |
|--------------|-------|
| innodb_stats_auto_recalc | ON |
| innodb_stats_persistent | ON |
| innodb_stats_persistent_sample_pages | 20 |
| innodb_stats_transient_sample_pages | 8 |

## 요약

**핵심 포인트**

1. MySQL 5.6+에서는 영구 통계 정보를 사용하여 서버 재시작 후에도 통계가 유지됩니다.
2. STATS_PERSISTENT=1을 통해서 실행 계획을 유지할 수 있습니다.
3. 샘플링 크기는 대부분 기본값(20)으로 충분하며, 필요시에만 조정합니다.