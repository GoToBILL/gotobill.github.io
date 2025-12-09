---
title: '분산 시스템의 CAP 이론 완벽 가이드'
date: '2025-11-21'
description: 'CAP 이론의 핵심 개념부터 적용까지, CP/AP 시스템 설계 전략과 구현 기법을 상세히 알아봅니다.'
tags: ['분산시스템', 'CAP이론', '시스템설계', '아키텍처']
---

## CAP 이론이란?

CAP 이론은 분산 시스템에서 다음 세 가지 속성을 동시에 모두 만족할 수 없다는 정리입니다.

- **Consistency (일관성)**: 모든 노드가 동일한 시점에 동일한 데이터를 반환
- **Availability (가용성)**: 모든 요청이 성공 또는 실패 응답을 받음
- **Partition Tolerance (파티션 허용성)**: 네트워크 분리가 발생해도 시스템이 동작

분산 시스템에서 네트워크 파티션은 언제든 발생할 수 있는 현실적인 문제이므로, 실제로는 **일관성(C)과 가용성(A) 중 하나를 선택**해야 합니다.

## CP 시스템: 일관성 우선 전략

### 동작 원리

파티션 발생 시 데이터 일관성을 보장하기 위해 일부 노드의 요청을 거부합니다.

```
[정상 상태]
N1 ← → N2 ← → N3
모든 노드가 동일한 데이터(v1)를 가짐

[파티션 발생]
N1 ← → N2    ||    N3 (네트워크 단절)

→ N1, N2의 쓰기 연산을 중지
→ 모든 노드의 데이터가 동기화될 때까지 대기
```

3개 노드 중 N3에 장애가 발생하면, 모든 노드의 데이터가 동기화될 때까지 N1, N2의 쓰기 연산을 중지합니다.

### 적용 사례

**은행 시스템**
- 계좌 잔액 조회/이체 시 정확한 금액이 필수
- 일시적인 서비스 중단보다 잘못된 금액 표시가 더 치명적

```java
@Transactional
public void transfer(Account from, Account to, BigDecimal amount) {
    // 모든 노드가 동기화될 때까지 대기
    if (!isAllNodesConsistent()) {
        throw new ServiceUnavailableException();
    }

    from.withdraw(amount);
    to.deposit(amount);

    // 모든 노드에 동기 복제 완료 후 커밋
    replicateToAllNodes();
}
```

**결제 시스템**
- 중복 결제 방지가 최우선
- 결제 실패 처리는 가능하지만 이중 결제는 불가

**분산 락 시스템**
- ZooKeeper, etcd 같은 코디네이션 서비스
- 리더 선출, 분산 락에서는 일관성이 핵심

## AP 시스템: 가용성 우선 전략

### 동작 원리

파티션 발생 시에도 모든 노드가 계속 요청을 처리하지만, 데이터 불일치가 발생할 수 있습니다.

```
[파티션 발생]
N1 ← → N2    ||    N3

사용자 A → N1, N2 파티션에 쓰기 (v2)
사용자 B → N3에 쓰기 (v3)

→ 일시적으로 다른 값 존재
→ 네트워크 복구 후 충돌 해결 (최종 일관성)
```

네트워크가 복구되면 **최종 일관성(Eventual Consistency)**을 통해 데이터를 동기화합니다.

### 적용 사례

**SNS 피드**
- 타임라인에 게시물이 몇 초 늦게 보여도 무방
- 즉각적인 응답이 사용자 경험에 더 중요

```java
public class TimelineService {

    public void postContent(Post post) {
        // 로컬 노드에만 즉시 쓰기
        localCache.write(post);

        // 비동기로 다른 노드에 복제
        asyncReplicator.replicate(post);
    }

    public List<Post> getTimeline(String userId) {
        // 현재 노드에서 즉시 반환
        return localCache.read(userId);
    }
}
```

**쇼핑몰 상품 조회**
- 재고 수량이 실시간으로 정확하지 않아도 주문 시점에만 검증하면 됨
- 상품 목록 조회는 빠른 응답이 중요

```java
public class ProductService {

    public Product getProduct(Long productId) {
        // 캐시에서 빠르게 반환
        Product product = cache.get(productId);

        if (product == null) {
            // 가장 가까운 노드에서 조회
            product = nearestNode.query(productId);
        }

        return product;
    }

    public void updateStock(Long productId, int quantity) {
        // 실제 주문 시에만 강한 일관성 보장
        if (isOrderProcess) {
            distributedLock.lock(productId);
            db.updateWithConsistency(productId, quantity);
        } else {
            // 단순 조회용 재고는 느슨한 일관성 허용
            cache.updateEventually(productId, quantity);
        }
    }
}
```

**DNS 시스템**
- 전 세계 DNS 서버가 즉시 동기화되지 않아도 됨
- TTL 기반 최종 일관성

## 구체적인 구현 기법

### 1. 데이터 복제 (Replication)

여러 노드에 데이터를 복제하여 한 노드가 다운되어도 다른 노드에서 서비스 가능합니다.

**동기 복제 (Synchronous Replication)**
```java
public class SynchronousReplicationService {

    public void write(String key, String value) {
        List<Node> replicas = getAllReplicas();

        // 모든 복제본에 동시 쓰기
        for (Node node : replicas) {
            node.write(key, value); // 블로킹 대기
        }

        // 모든 노드 쓰기 완료 후에만 성공 반환
        return;
    }
}
```
- 강한 일관성 보장 (CP 시스템)
- 모든 노드가 응답할 때까지 대기하므로 지연 시간 증가

**비동기 복제 (Asynchronous Replication)**
```java
public class AsynchronousReplicationService {

    public void write(String key, String value) {
        // 마스터 노드에만 즉시 쓰기
        masterNode.write(key, value);

        // 백그라운드로 복제
        executor.submit(() -> {
            for (Node replica : replicas) {
                replica.write(key, value);
            }
        });

        // 즉시 성공 반환
        return;
    }
}
```
- 빠른 응답 시간 (AP 시스템)
- 일시적인 데이터 불일치 가능

### 2. 쿼럼 (Quorum) 방식

읽기/쓰기 시 N개 노드 중 W개(쓰기), R개(읽기)의 응답을 받으면 성공으로 처리합니다.

**기본 공식**
```
N = 전체 노드 수
W = 쓰기 성공에 필요한 노드 수
R = 읽기 성공에 필요한 노드 수

강한 일관성 보장 조건: W + R > N
```

**예제: N=3, W=2, R=2**
```java
public class QuorumService {

    private static final int TOTAL_NODES = 3;
    private static final int WRITE_QUORUM = 2;
    private static final int READ_QUORUM = 2;

    public void write(String key, String value) {
        List<Node> nodes = getAvailableNodes();

        // 병렬로 쓰기 요청
        List<Future<Boolean>> futures = nodes.stream()
            .map(node -> executor.submit(() -> node.write(key, value)))
            .toList();

        // W개 이상 성공하면 OK
        int successCount = countSuccessful(futures);
        if (successCount >= WRITE_QUORUM) {
            return; // 성공
        }

        throw new QuorumNotMetException();
    }

    public String read(String key) {
        List<Node> nodes = getAvailableNodes();

        // 병렬로 읽기 요청
        List<Future<VersionedValue>> futures = nodes.stream()
            .map(node -> executor.submit(() -> node.read(key)))
            .toList();

        // R개 이상에서 읽고 최신 버전 선택
        List<VersionedValue> values = collectValues(futures, READ_QUORUM);
        return selectLatestVersion(values);
    }
}
```

최소 2개 노드가 응답하면 되므로 **1개 노드 장애를 감내**할 수 있습니다.

**쿼럼 설정 전략**

| 설정 | 특징 | 사용 시나리오 |
|-----|-----|------------|
| W=N, R=1 | 강한 쓰기 일관성, 빠른 읽기 | 읽기가 많은 시스템 |
| W=1, R=N | 빠른 쓰기, 강한 읽기 일관성 | 쓰기가 많은 시스템 |
| W=N/2+1, R=N/2+1 | 균형잡힌 일관성 | 범용 시스템 |
| W=1, R=1 | 최고 성능, 약한 일관성 | 캐시, 임시 데이터 |

### 3. 자동 파티션 처리 전략

실제 프로덕션 환경에서는 네트워크 파티션을 자동으로 감지하고 복구하는 메커니즘이 필요합니다.

**pause-minority (소수 파티션 중지)**
```yaml
# RabbitMQ 클러스터 설정 예시
cluster_partition_handling = pause_minority
```
전체의 절반 이하인 소수 파티션을 자동으로 중지합니다.

```
[예시: 5개 노드 클러스터]
N1, N2, N3  ||  N4, N5

→ N4, N5 파티션(2개)을 자동 중지
→ N1, N2, N3 파티션(3개)만 계속 동작
→ 스플릿 브레인 방지
```

**autoheal (자동 복구)**
```yaml
cluster_partition_handling = autoheal
```
파티션 발생 시 자동으로 하나의 파티션을 선택하고 나머지를 재시작하여 복구합니다.

```java
public class AutohealStrategy {

    public void handlePartition(List<Partition> partitions) {
        // 1. 가장 큰 파티션을 승자로 선정
        Partition winner = partitions.stream()
            .max(Comparator.comparingInt(p -> p.getNodeCount()))
            .orElseThrow();

        // 2. 나머지 파티션 노드들을 재시작
        partitions.stream()
            .filter(p -> !p.equals(winner))
            .flatMap(p -> p.getNodes().stream())
            .forEach(Node::restart);

        // 3. 재시작된 노드들이 승자 파티션에 재합류
        waitForRejoin();
    }
}
```

**pause-if-all-down (조건부 중지)**
```yaml
cluster_partition_handling = pause_if_all_down
pause_if_all_down.nodes.1 = critical-node-1
pause_if_all_down.nodes.2 = critical-node-2
```
특정 노드 리스트가 모두 다운되면 전체 클러스터를 중지합니다.

```
[예시: 핵심 노드 보호]
critical-node-1, critical-node-2 (마스터 후보)
worker-node-1, worker-node-2, worker-node-3

→ critical 노드 모두 다운 시 worker 노드도 중지
→ 데이터 무결성 보장
→ 관리자 개입 필요
```

### 4. 멀티존 아키텍처

여러 가용 영역(Availability Zone)에 노드를 분산 배치하여 한 영역의 네트워크 장애가 전체 시스템에 영향을 주지 않도록 합니다.

**AWS 멀티 AZ 구성 예시**
```
[AZ-A]           [AZ-B]           [AZ-C]
Master           Slave-1          Slave-2
App Server       App Server       App Server
```

```java
public class MultiAzLoadBalancer {

    private Map<String, List<Node>> zoneNodes;

    public Node selectNode() {
        // 1. 현재 클라이언트와 같은 AZ 노드 우선 선택
        String clientAz = getCurrentAz();
        List<Node> localNodes = zoneNodes.get(clientAz)
            .stream()
            .filter(Node::isHealthy)
            .toList();

        if (!localNodes.isEmpty()) {
            return selectRandom(localNodes);
        }

        // 2. 다른 AZ의 정상 노드 선택
        return zoneNodes.values().stream()
            .flatMap(List::stream)
            .filter(Node::isHealthy)
            .findFirst()
            .orElseThrow(() -> new NoAvailableNodeException());
    }

    public void handleZoneFailure(String failedZone) {
        // 장애 AZ의 노드를 순환에서 제외
        zoneNodes.get(failedZone).forEach(node -> {
            node.markUnhealthy();
            healthChecker.monitor(node); // 복구 모니터링
        });

        // 나머지 AZ로 트래픽 재분배
        rebalanceTraffic();
    }
}
```

**크로스 리전 복제**
```
[Region: us-east-1]     →     [Region: ap-northeast-2]
Master (Primary)        →     Slave (Standby)
실시간 쓰기                      읽기 전용 + 재해 복구
```

지리적으로 떨어진 리전 간 복제로 대규모 재해에도 대응 가능합니다.

## 적용 가이드

### 시스템 특성별 선택 기준

**CP를 선택해야 하는 경우**
- 금융 거래 (결제, 송금)
- 재고 관리 (중복 판매 방지)
- 예약 시스템 (좌석, 호텔)
- 분산 락, 리더 선출
- 의료 기록 시스템

**AP를 선택해야 하는 경우**
- 소셜 미디어 피드
- 상품 카탈로그 조회
- 분석/로그 수집
- 캐싱 시스템
- 콘텐츠 배포 (CDN)

### 하이브리드 접근

실제 프로덕션에서는 기능별로 다른 일관성 수준을 적용하는 것이 일반적입니다.

```java
@Service
public class EcommerceService {

    // 주문은 CP (강한 일관성)
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Order createOrder(OrderRequest request) {
        // 분산 락으로 재고 보호
        distributedLock.lock(request.getProductId());

        try {
            Product product = productRepository.findById(
                request.getProductId()
            ).orElseThrow();

            if (product.getStock() < request.getQuantity()) {
                throw new OutOfStockException();
            }

            // 모든 노드에 동기 복제
            product.decreaseStock(request.getQuantity());
            return orderRepository.save(new Order(request));

        } finally {
            distributedLock.unlock(request.getProductId());
        }
    }

    // 상품 조회는 AP (최종 일관성)
    @Cacheable(value = "products", cacheManager = "apCacheManager")
    public Product getProduct(Long productId) {
        // 로컬 캐시에서 빠르게 반환
        return productRepository.findById(productId)
            .orElseThrow();
    }

    // 리뷰는 AP (최종 일관성)
    @Async
    public void addReview(Review review) {
        // 비동기 처리, 일시적 불일치 허용
        reviewRepository.save(review);
        eventPublisher.publish(new ReviewCreatedEvent(review));
    }
}
```

## 주요 분산 시스템의 CAP 선택

| 시스템 | 분류 | 특징 |
|-------|-----|-----|
| MySQL (단일) | CA | 파티션 허용 X |
| MongoDB | CP | 강한 일관성, 프라이머리 다운 시 선출 대기 |
| Cassandra | AP | 최종 일관성, 높은 가용성 |
| Redis Cluster | AP | 비동기 복제, 빠른 응답 |
| ZooKeeper | CP | 쿼럼 기반, 리더 선출 |
| DynamoDB | AP | 튜닝 가능 일관성 |
| Kafka | AP (기본) | 비동기 복제, 튜닝 가능 |
| Elasticsearch | AP | 최종 일관성, 검색 성능 우선 |

## 마치며

CAP 이론은 분산 시스템 설계의 근본적인 트레이드오프를 설명합니다. 완벽한 선택은 없으며, 비즈니스 요구사항에 따라 적절한 균형점을 찾아야 합니다.

핵심은 다음과 같습니다:
- 네트워크 파티션은 언제든 발생할 수 있으므로 P는 필수
- CP와 AP 중 선택은 비즈니스 도메인에 따라 결정
- 기능별로 다른 일관성 수준을 적용하는 하이브리드 방식이 효과적
- 쿼럼, 복제, 자동 복구 등의 구체적인 구현 기법 활용

분산 시스템을 설계할 때는 항상 "이 데이터가 일시적으로 불일치해도 괜찮은가?"라는 질문을 던지고, 그에 맞는 전략을 선택해야 합니다.
