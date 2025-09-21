---
title: JPA @OneToOne 양방향 관계에서 발생하는 N+1 문제 해결 방법
date: "2025-09-21"
description: "JPA에서 @OneToOne 양방향 관계 사용 시 발생하는 N+1 문제의 원인과 다양한 해결 방법을 실제 사례와 함께 설명합니다."
---

## 문제 상황

User와 UserProfile이 양방향 @OneToOne 관계로 매핑되어 있을 때, User를 조회하면 UserProfile에 대한 추가 쿼리가 발생하는 N+1 문제를 겪었습니다.

```java
// User 엔티티
@Entity
public class User {
    @Id
    private Long id;

    @OneToOne(mappedBy = "user", fetch = FetchType.LAZY)
    private UserProfile userProfile;
}

// UserProfile 엔티티
@Entity
public class UserProfile {
    @Id
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id")
    private User user;
}
```

## 문제 발생 원인

### 1. @OneToOne 연관관계 주인이 아닌 쪽의 프록시 생성 불가

> **핵심 문제**
> JPA는 @OneToOne 관계에서 연관관계 주인이 아닌 쪽(mappedBy를 사용하는 쪽)은 프록시 객체를 생성할 수 없습니다.

User 엔티티가 로드될 때:
- JPA는 UserProfile이 존재하는지 확인하기 위해 무조건 쿼리를 실행
- FetchType.LAZY를 설정해도 프록시 생성이 불가능하므로 의미가 없음
- 존재하면 프록시 객체, 존재하지 않으면 null을 설정해야 하는데 이를 확인하려면 쿼리가 필요

### 2. @Data 어노테이션의 부작용

```java
@Data  // 모든 필드에 대한 getter/setter 자동 생성
public class User {
    private UserProfile userProfile;
}
```

> **주의사항**
> @Data 어노테이션은 모든 필드에 대한 getter를 생성하므로, JSON 직렬화나 toString() 호출 시 의도치 않게 UserProfile에 접근하게 됩니다.

## 실제 발생한 쿼리

```sql
-- 1. CustomerFeedback 조회 (User JOIN FETCH 포함)
SELECT cf.*, u.*, fi.*, s.*, su.*
FROM feedback cf
LEFT JOIN users u ON cf.user_id = u.user_id
LEFT JOIN food_item fi ON cf.food_id = fi.food_id
LEFT JOIN store s ON cf.store_id = s.store_id
LEFT JOIN survey su ON cf.survey_id = su.survey_id
WHERE cf.store_id = ? AND cf.is_active = true;

-- 2. 각 User마다 UserProfile 조회 (N개)
SELECT up.* FROM user_profile up WHERE up.user_id = ?;
SELECT up.* FROM user_profile up WHERE up.user_id = ?;
SELECT up.* FROM user_profile up WHERE up.user_id = ?;
-- ... (N번 반복)
```

## 해결 방법

### 방법 1: Fetch Join에 UserProfile 포함

```java
@Query("""
    SELECT cf FROM CustomerFeedback cf
    LEFT JOIN FETCH cf.user u
    LEFT JOIN FETCH u.userProfile
    WHERE cf.store.id = :storeId
    """)
Page<CustomerFeedback> findByStoreIdWithDetails(@Param("storeId") Long storeId, Pageable pageable);
```

### 방법 2: 단방향 관계로 변경

> **Best Practice**
> 양방향 관계가 꼭 필요하지 않다면 단방향으로 변경하는 것이 가장 깨끗한 해결책입니다.

```java
@Entity
public class User {
    @Id
    private Long id;
    // UserProfile 참조 제거
}

@Entity
public class UserProfile {
    @OneToOne
    @JoinColumn(name = "user_id")
    private User user;  // 단방향 관계만 유지
}
```

### 방법 3: @JsonIgnore 또는 @ToString.Exclude 사용

```java
@Entity
@Getter
@Setter
@ToString.Exclude  // toString()에서 UserProfile 제외
public class User {
    @OneToOne(mappedBy = "user")
    @JsonIgnore  // JSON 직렬화에서 제외
    private UserProfile userProfile;
}
```

### 방법 4: @OneToOne 대신 @ManyToOne 사용

```java
@Entity
public class UserProfile {
    @ManyToOne  // 실제로는 1:1이지만 ManyToOne으로 매핑
    @JoinColumn(name = "user_id", unique = true)  // unique 제약조건으로 1:1 보장
    private User user;
}
```

## 성능 비교

| 방법 | 쿼리 수 | 장점 | 단점 |
|------|---------|------|------|
| **Fetch Join** | 1 | 한 번의 쿼리로 모든 데이터 조회 | 페이징 시 메모리에서 처리 |
| **단방향 관계** | 1 | N+1 문제 원천 차단 | 양방향 탐색 불가 |
| **@JsonIgnore** | N+1 | 구현이 간단 | 근본적 해결책이 아님 |
| **@ManyToOne** | 1 | Lazy Loading 정상 작동 | 의미적으로 부정확 |

## 결론

### 권장 사항

1. **@OneToOne 양방향 관계는 가능한 피하고 단방향으로 설계**
2. **양방향이 필요하다면 Fetch Join 사용**
3. **@Data 어노테이션 대신 필요한 어노테이션만 선택적으로 사용**
4. **DTO 변환 시 필요한 필드만 명시적으로 접근**

> **핵심 정리**
> @OneToOne 양방향 관계는 JPA의 구조적 한계로 인해 N+1 문제가 발생하기 쉽습니다. 설계 단계에서부터 이를 고려하여 단방향 관계로 설계하거나, 불가피한 경우 Fetch Join을 통해 해결하는 것이 좋습니다.

### 추가 고려사항

- **캐싱 전략**: 자주 조회되는 UserProfile의 경우 2차 캐시 활용 고려
- **배치 페치 사이즈**: `@BatchSize` 어노테이션으로 N+1 쿼리 수 감소
- **프로젝션**: 필요한 필드만 조회하는 DTO 프로젝션 활용