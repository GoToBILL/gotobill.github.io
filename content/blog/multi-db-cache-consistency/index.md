---
title: '복합 환경에서의 일관성 관리: Multi-DB + Multi-Cache'
date: '2025-12-02'
description: '여러 데이터베이스와 캐시가 존재하는 복잡한 환경에서 데이터 일관성을 유지하는 아키텍처와 전략을 알아봅니다.'
tags: ['분산시스템', '캐시', '데이터베이스', '아키텍처', '일관성']
---

## 들어가며

실제 대규모 서비스는 단순한 Master-Slave + 단일 캐시 구조가 아닙니다.

- 여러 개의 DB (샤딩, 서비스별 분리)
- 로컬 캐시 + 분산 캐시 (계층화)
- 여러 서비스가 같은 데이터를 캐싱

이런 복합 환경에서는 일관성 관리가 훨씬 복잡해집니다. 이 글에서는 복합 환경의 일관성 문제와 해결 방법을 다룹니다.

## 복합 환경의 아키텍처

### 일반적인 대규모 서비스 구조

<!-- [다이어그램 1: 복합 환경 전체 아키텍처]
                    [API Gateway]
                         |
        +----------------+----------------+
        |                |                |
   [Service A]      [Service B]      [Service C]
   (Local Cache)    (Local Cache)    (Local Cache)
        |                |                |
        +----------------+----------------+
                         |
                   [Redis Cluster]
                  (Distributed Cache)
                         |
        +----------------+----------------+
        |                |                |
   [DB Shard 1]    [DB Shard 2]    [DB Shard 3]
   Master-Slave    Master-Slave    Master-Slave
-->

```
[전체 아키텍처]
                      [API Gateway]
                           |
          +----------------+----------------+
          |                |                |
     [Service A]      [Service B]      [Service C]
     (Local Cache)    (Local Cache)    (Local Cache)
          |                |                |
          +-------+--------+--------+-------+
                  |                 |
            [Redis Cluster]   [Redis Cluster]
            (Distributed)     (Distributed)
                  |                 |
          +-------+--------+--------+-------+
          |                |                |
     [DB Shard 1]    [DB Shard 2]    [DB Shard 3]
     M --- S         M --- S         M --- S
```

### 데이터 흐름의 복잡성

같은 "상품" 데이터가 여러 곳에 존재할 수 있습니다:

1. **상품 서비스** - DB Master에 원본
2. **상품 서비스** - DB Slave에 복제본
3. **상품 서비스** - 로컬 캐시 (Caffeine)
4. **분산 캐시** - Redis에 저장
5. **주문 서비스** - 로컬 캐시에 상품 정보 보관
6. **검색 서비스** - Elasticsearch에 상품 인덱싱

**하나의 상품 가격이 변경되면** 이 모든 곳을 동기화해야 합니다.

## 멀티 레벨 캐시 아키텍처

### L1 (로컬) + L2 (분산) 캐시 구조

<!-- [다이어그램 2: 멀티 레벨 캐시]
[Client Request]
      |
      v
[L1: Local Cache] (Caffeine, 10초 TTL)
      | Miss
      v
[L2: Distributed Cache] (Redis, 5분 TTL)
      | Miss
      v
[Database]

장점: L1에서 대부분 처리되어 네트워크 비용 절감
문제: L1 캐시가 여러 인스턴스에 분산되어 있어 동기화 어려움
-->

```
[조회 흐름]
Client --> L1 (Local Cache) --> L2 (Redis) --> DB
              |                    |
           Hit: 반환            Hit: 반환, L1에 저장
                                Miss: DB 조회, L2/L1에 저장

[L1 특징]
- 매우 빠름 (네트워크 없음)
- 각 인스턴스별로 독립적
- 짧은 TTL (10초 ~ 1분)

[L2 특징]
- 모든 인스턴스가 공유
- 네트워크 비용 발생
- 긴 TTL (5분 ~ 1시간)
```

### 구현 예제

```java
@Service
public class MultiLevelCacheService {

    private final Cache<String, Product> localCache;  // Caffeine
    private final RedisTemplate<String, Product> redisTemplate;  // Redis
    private final ProductRepository productRepository;

    private static final Duration L1_TTL = Duration.ofSeconds(30);
    private static final Duration L2_TTL = Duration.ofMinutes(10);

    public Product getProduct(Long productId) {
        String cacheKey = "product:" + productId;

        // L1 조회
        Product l1Cached = localCache.getIfPresent(cacheKey);
        if (l1Cached != null) {
            return l1Cached;
        }

        // L2 조회
        Product l2Cached = redisTemplate.opsForValue().get(cacheKey);
        if (l2Cached != null) {
            // L1에 저장
            localCache.put(cacheKey, l2Cached);
            return l2Cached;
        }

        // DB 조회
        Product product = productRepository.findById(productId)
            .orElseThrow();

        // L2, L1 모두 저장
        redisTemplate.opsForValue().set(cacheKey, product, L2_TTL);
        localCache.put(cacheKey, product);

        return product;
    }
}
```

### L1 캐시 무효화 문제

**문제 상황**: 인스턴스 A에서 데이터를 수정했는데, 인스턴스 B의 L1 캐시는 여전히 이전 데이터를 가지고 있음

<!-- [다이어그램 3: L1 캐시 불일치]
Instance A: 상품 가격 변경 (10000 -> 15000)
           L1 캐시 삭제, L2 캐시 삭제

Instance B: L1 캐시에 이전 데이터 (10000) 그대로 존재
           사용자가 Instance B로 요청하면 10000원으로 보임

TTL 만료될 때까지 불일치 발생
-->

```
[문제 시나리오]
T1: Instance A - 상품 가격 수정 (10000 -> 15000)
    - DB 업데이트
    - L2 (Redis) 삭제
    - 자신의 L1 캐시 삭제

T2: Instance B에 요청 도착
    - L1 캐시 Hit (가격: 10000)  <-- 이전 데이터!
    - 사용자에게 10000원 반환

Instance B의 L1 TTL이 만료될 때까지 불일치
```

### 해결: Pub/Sub 기반 L1 무효화

<!-- [다이어그램 4: Pub/Sub L1 무효화]
Instance A: 데이터 수정 -> Redis Pub/Sub 채널에 무효화 메시지 발행
                               |
                    +----------+----------+
                    |          |          |
Instance A     Instance B  Instance C  Instance D
(L1 삭제)      (L1 삭제)   (L1 삭제)   (L1 삭제)

모든 인스턴스가 동시에 L1 캐시 무효화
-->

```java
@Service
public class CacheInvalidationService {

    private final RedisTemplate<String, String> redisTemplate;
    private final Cache<String, Product> localCache;

    private static final String INVALIDATION_CHANNEL = "cache:invalidation";

    // 캐시 무효화 발행
    public void invalidateCache(String cacheKey) {
        // L2 삭제
        redisTemplate.delete(cacheKey);

        // 모든 인스턴스의 L1 무효화를 위해 메시지 발행
        redisTemplate.convertAndSend(INVALIDATION_CHANNEL, cacheKey);
    }
}

@Component
public class CacheInvalidationListener implements MessageListener {

    private final Cache<String, Product> localCache;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String cacheKey = new String(message.getBody());

        // 로컬 캐시 삭제
        localCache.invalidate(cacheKey);

        log.debug("L1 캐시 무효화: {}", cacheKey);
    }
}

@Configuration
public class RedisConfig {

    @Bean
    public RedisMessageListenerContainer container(
            RedisConnectionFactory connectionFactory,
            CacheInvalidationListener listener) {

        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(listener,
            new ChannelTopic("cache:invalidation"));

        return container;
    }
}
```

## 샤딩 환경의 일관성

### 크로스 샤드 트랜잭션 문제

<!-- [다이어그램 5: 크로스 샤드 트랜잭션]
[주문 생성]
1. 주문 정보 저장 (Shard 1 - 주문 DB)
2. 재고 차감 (Shard 2 - 상품 DB)
3. 포인트 차감 (Shard 3 - 회원 DB)

3개의 서로 다른 DB에 원자적으로 처리해야 함
하나라도 실패하면 전체 롤백 필요
-->

```
[크로스 샤드 시나리오]
주문 생성 시:
  Shard 1 (주문 DB): INSERT INTO orders ...
  Shard 2 (상품 DB): UPDATE products SET stock = stock - 1 ...
  Shard 3 (회원 DB): UPDATE members SET points = points - 100 ...

문제: 3개의 독립된 DB 트랜잭션을 어떻게 원자적으로 처리?
```

### 해결 1: Saga 패턴

분산 트랜잭션 대신 보상 트랜잭션을 사용합니다.

<!-- [다이어그램 6: Saga 패턴]
[정상 흐름]
주문 생성 -> 재고 차감 -> 포인트 차감 -> 완료

[실패 시 보상]
주문 생성 -> 재고 차감 -> 포인트 차감 실패!
                    <- 재고 복구 <- 주문 취소
-->

```java
@Service
public class OrderSagaService {

    public OrderResult createOrder(OrderRequest request) {
        String sagaId = UUID.randomUUID().toString();
        List<SagaStep> executedSteps = new ArrayList<>();

        try {
            // Step 1: 주문 생성
            Order order = orderService.create(request);
            executedSteps.add(new OrderCreatedStep(order));

            // Step 2: 재고 차감
            stockService.decrease(request.getProductId(), request.getQuantity());
            executedSteps.add(new StockDecreasedStep(
                request.getProductId(), request.getQuantity()));

            // Step 3: 포인트 차감
            pointService.use(request.getMemberId(), request.getPointAmount());
            executedSteps.add(new PointUsedStep(
                request.getMemberId(), request.getPointAmount()));

            return OrderResult.success(order);

        } catch (Exception e) {
            // 보상 트랜잭션 실행 (역순)
            compensate(executedSteps);
            return OrderResult.failure(e.getMessage());
        }
    }

    private void compensate(List<SagaStep> executedSteps) {
        // 역순으로 보상 실행
        Collections.reverse(executedSteps);

        for (SagaStep step : executedSteps) {
            try {
                step.compensate();
            } catch (Exception e) {
                // 보상 실패 - 수동 처리 필요
                alertService.sendCompensationFailure(step, e);
            }
        }
    }
}

interface SagaStep {
    void compensate();
}

class StockDecreasedStep implements SagaStep {
    private final Long productId;
    private final int quantity;

    @Override
    public void compensate() {
        // 재고 복구
        stockService.increase(productId, quantity);
    }
}
```

### 해결 2: 이벤트 기반 최종 일관성

동기 트랜잭션 대신 이벤트를 통해 비동기로 처리합니다.

<!-- [다이어그램 7: 이벤트 기반 아키텍처]
[주문 서비스]
  주문 생성 -> OrderCreatedEvent 발행 -> Kafka

[상품 서비스]
  OrderCreatedEvent 수신 -> 재고 차감 -> StockDecreasedEvent 발행

[회원 서비스]
  OrderCreatedEvent 수신 -> 포인트 차감 -> PointUsedEvent 발행

각 서비스가 독립적으로 처리, 최종적으로 일관성 달성
-->

```java
// 주문 서비스
@Service
public class OrderService {

    @Transactional
    public Order createOrder(OrderRequest request) {
        // 주문만 생성 (다른 서비스는 이벤트로 처리)
        Order order = Order.create(request);
        order.setStatus(OrderStatus.PENDING);
        orderRepository.save(order);

        // 이벤트 발행
        eventPublisher.publish(new OrderCreatedEvent(
            order.getId(),
            request.getProductId(),
            request.getQuantity(),
            request.getMemberId(),
            request.getPointAmount()
        ));

        return order;
    }

    @KafkaListener(topics = "stock-decreased")
    public void handleStockDecreased(StockDecreasedEvent event) {
        Order order = orderRepository.findById(event.getOrderId())
            .orElseThrow();
        order.markStockReserved();
        orderRepository.save(order);

        checkOrderCompletion(order);
    }

    @KafkaListener(topics = "point-used")
    public void handlePointUsed(PointUsedEvent event) {
        Order order = orderRepository.findById(event.getOrderId())
            .orElseThrow();
        order.markPointUsed();
        orderRepository.save(order);

        checkOrderCompletion(order);
    }

    private void checkOrderCompletion(Order order) {
        if (order.isAllStepsCompleted()) {
            order.setStatus(OrderStatus.CONFIRMED);
            orderRepository.save(order);
        }
    }
}

// 상품 서비스
@Service
public class StockService {

    @KafkaListener(topics = "order-created")
    public void handleOrderCreated(OrderCreatedEvent event) {
        try {
            decreaseStock(event.getProductId(), event.getQuantity());

            eventPublisher.publish(new StockDecreasedEvent(
                event.getOrderId(),
                event.getProductId()
            ));

        } catch (OutOfStockException e) {
            // 재고 부족 - 실패 이벤트 발행
            eventPublisher.publish(new StockDecreaseFailed(
                event.getOrderId(),
                e.getMessage()
            ));
        }
    }
}
```

## 서비스 간 캐시 일관성

### 문제: 여러 서비스가 같은 데이터를 캐싱

<!-- [다이어그램 8: 서비스 간 캐시 불일치]
[상품 서비스]: 상품 DB의 원본, Redis에 캐시
[주문 서비스]: 주문 시 상품 정보 조회해서 자체 캐시
[검색 서비스]: Elasticsearch에 상품 인덱싱

상품 가격 변경 시:
- 상품 서비스 캐시는 업데이트
- 주문 서비스 캐시는? (모름)
- 검색 서비스 ES는? (모름)
-->

```
[시나리오]
상품 서비스: 상품 가격 변경 (10000 -> 15000)
             -> 자체 Redis 캐시 무효화

주문 서비스: 여전히 이전 가격(10000) 캐싱 중
             -> 주문 시 잘못된 가격 표시

검색 서비스: Elasticsearch에 이전 가격 인덱싱
             -> 검색 결과에 잘못된 가격 표시
```

### 해결: 도메인 이벤트 기반 동기화

<!-- [다이어그램 9: 도메인 이벤트 동기화]
[상품 서비스]
  상품 수정 -> ProductUpdatedEvent 발행 -> Kafka
                                            |
                    +-----------------------+-----------------------+
                    |                       |                       |
              [주문 서비스]            [검색 서비스]           [추천 서비스]
              캐시 무효화              ES 재인덱싱             모델 업데이트
-->

```java
// 상품 서비스 - 이벤트 발행
@Service
public class ProductService {

    @Transactional
    public void updateProduct(Long productId, ProductUpdateRequest request) {
        Product product = productRepository.findById(productId)
            .orElseThrow();

        product.update(request);
        productRepository.save(product);

        // 캐시 무효화
        cacheInvalidationService.invalidate("product:" + productId);

        // 도메인 이벤트 발행 (다른 서비스들에게 알림)
        eventPublisher.publish(new ProductUpdatedEvent(
            productId,
            product.getName(),
            product.getPrice(),
            product.getStock()
        ));
    }
}

// 주문 서비스 - 이벤트 수신
@Service
public class OrderProductCacheService {

    private final Cache<Long, ProductInfo> productCache;

    @KafkaListener(topics = "product-updated")
    public void handleProductUpdate(ProductUpdatedEvent event) {
        // 로컬 캐시 무효화
        productCache.invalidate(event.getProductId());

        log.info("상품 캐시 무효화: {}", event.getProductId());
    }
}

// 검색 서비스 - 이벤트 수신
@Service
public class ProductSearchService {

    @KafkaListener(topics = "product-updated")
    public void handleProductUpdate(ProductUpdatedEvent event) {
        // Elasticsearch 재인덱싱
        ProductDocument doc = ProductDocument.from(event);
        elasticsearchClient.index(doc);

        log.info("상품 검색 인덱스 업데이트: {}", event.getProductId());
    }
}
```

### 이벤트 발행 보장: Outbox 패턴

이벤트 발행이 실패하면 다른 서비스들의 캐시가 동기화되지 않습니다. Outbox 패턴으로 이벤트 발행을 보장합니다.

<!-- [다이어그램 10: Outbox 패턴]
[트랜잭션 내부]
1. products 테이블 UPDATE
2. outbox 테이블에 이벤트 INSERT

[별도 프로세스]
Outbox Poller: outbox 테이블 조회 -> Kafka 발행 -> 처리 완료 마킹

DB 트랜잭션으로 이벤트 저장을 보장
-->

```java
@Service
public class ProductService {

    @Transactional
    public void updateProduct(Long productId, ProductUpdateRequest request) {
        Product product = productRepository.findById(productId)
            .orElseThrow();

        product.update(request);
        productRepository.save(product);

        // 같은 트랜잭션에서 Outbox에 이벤트 저장
        OutboxEvent event = OutboxEvent.builder()
            .aggregateType("Product")
            .aggregateId(productId.toString())
            .eventType("ProductUpdated")
            .payload(objectMapper.writeValueAsString(
                new ProductUpdatedEvent(productId, product)))
            .status(OutboxStatus.PENDING)
            .build();

        outboxRepository.save(event);
    }
}

@Entity
@Table(name = "outbox_events")
public class OutboxEvent {
    @Id
    @GeneratedValue
    private Long id;

    private String aggregateType;
    private String aggregateId;
    private String eventType;

    @Column(columnDefinition = "TEXT")
    private String payload;

    @Enumerated(EnumType.STRING)
    private OutboxStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime processedAt;
}

// Outbox 이벤트 발행기 (별도 스케줄러)
@Component
public class OutboxEventPublisher {

    @Scheduled(fixedRate = 1000)
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> events = outboxRepository
            .findByStatusOrderByCreatedAtAsc(OutboxStatus.PENDING, 100);

        for (OutboxEvent event : events) {
            try {
                kafkaTemplate.send(
                    event.getEventType().toLowerCase(),
                    event.getAggregateId(),
                    event.getPayload()
                ).get();  // 동기 대기

                event.setStatus(OutboxStatus.PROCESSED);
                event.setProcessedAt(LocalDateTime.now());

            } catch (Exception e) {
                log.error("이벤트 발행 실패: {}", event.getId(), e);
                event.setStatus(OutboxStatus.FAILED);
            }

            outboxRepository.save(event);
        }
    }
}
```

## 아키텍처 종합 예제

### 대규모 이커머스 플랫폼

<!-- [다이어그램 11: 종합 아키텍처]
[Client]
    |
[API Gateway] --> [인증 서비스]
    |
+---+---+---+---+
|   |   |   |   |
[상품] [주문] [회원] [검색]
(L1) (L1) (L1) (L1)
    \   |   /
     [Redis Cluster]
         |
    [Kafka Cluster]
         |
[DB Shard 1] [DB Shard 2] [DB Shard 3]
-->

```java
// 통합 캐시 설정
@Configuration
public class CacheConfig {

    // L1: Caffeine (로컬)
    @Bean
    public Cache<String, Object> localCache() {
        return Caffeine.newBuilder()
            .maximumSize(10000)
            .expireAfterWrite(Duration.ofSeconds(30))
            .recordStats()
            .build();
    }

    // L2: Redis (분산)
    @Bean
    public RedisTemplate<String, Object> redisTemplate(
            RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        return template;
    }
}

// 멀티레벨 캐시 + 이벤트 기반 무효화 통합 서비스
@Service
public class ProductIntegrationService {

    private final Cache<String, Product> localCache;
    private final RedisTemplate<String, Product> redisTemplate;
    private final ProductRepository productRepository;
    private final OutboxRepository outboxRepository;

    private static final Duration L1_TTL = Duration.ofSeconds(30);
    private static final Duration L2_TTL = Duration.ofMinutes(10);

    // 읽기: L1 -> L2 -> DB
    public Product getProduct(Long productId) {
        String key = "product:" + productId;

        // L1
        Product l1 = localCache.getIfPresent(key);
        if (l1 != null) return l1;

        // L2
        Product l2 = redisTemplate.opsForValue().get(key);
        if (l2 != null) {
            localCache.put(key, l2);
            return l2;
        }

        // DB
        Product product = productRepository.findById(productId)
            .orElseThrow();

        redisTemplate.opsForValue().set(key, product, L2_TTL);
        localCache.put(key, product);

        return product;
    }

    // 쓰기: DB + Outbox (트랜잭션) -> 캐시 무효화 -> 이벤트 발행
    @Transactional
    public void updateProduct(Long productId, ProductUpdateRequest request) {
        Product product = productRepository.findById(productId)
            .orElseThrow();

        product.update(request);
        productRepository.save(product);

        // Outbox에 이벤트 저장 (같은 트랜잭션)
        saveToOutbox(productId, product);
    }

    // 트랜잭션 커밋 후 캐시 무효화
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onProductUpdated(ProductUpdatedInternalEvent event) {
        String key = "product:" + event.getProductId();

        // L2 무효화 + L1 무효화 브로드캐스트
        redisTemplate.delete(key);
        redisTemplate.convertAndSend("cache:invalidation", key);
    }

    // L1 무효화 수신 (다른 인스턴스에서 발생한 무효화)
    @EventListener
    public void onCacheInvalidation(CacheInvalidationEvent event) {
        localCache.invalidate(event.getKey());
    }
}
```

## 모니터링과 알림

### 일관성 검증 배치

주기적으로 캐시와 DB의 일관성을 검증합니다.

```java
@Component
public class ConsistencyChecker {

    @Scheduled(fixedRate = 60000)  // 1분마다
    public void checkConsistency() {
        // 랜덤 샘플링으로 일관성 검증
        List<Long> sampleIds = productRepository.getRandomIds(100);

        int inconsistentCount = 0;

        for (Long productId : sampleIds) {
            Product dbProduct = productRepository.findById(productId)
                .orElse(null);
            Product cachedProduct = redisTemplate.opsForValue()
                .get("product:" + productId);

            if (dbProduct != null && cachedProduct != null) {
                if (!dbProduct.equals(cachedProduct)) {
                    inconsistentCount++;
                    log.warn("일관성 불일치 감지: productId={}", productId);

                    // 자동 복구
                    redisTemplate.delete("product:" + productId);
                }
            }
        }

        // 메트릭 기록
        meterRegistry.gauge("cache.inconsistency.count", inconsistentCount);

        if (inconsistentCount > 10) {
            alertService.send("캐시 일관성 불일치 다수 감지: " + inconsistentCount);
        }
    }
}
```

### 복제 지연 + 캐시 상태 대시보드

```java
@RestController
@RequestMapping("/admin/consistency")
public class ConsistencyDashboardController {

    @GetMapping("/status")
    public ConsistencyStatus getStatus() {
        return ConsistencyStatus.builder()
            // DB 복제 지연
            .replicationLag(getReplicationLag())

            // 캐시 히트율
            .l1HitRate(localCache.stats().hitRate())
            .l2HitRate(redisStats.getHitRate())

            // Outbox 대기 이벤트
            .pendingOutboxEvents(outboxRepository.countByStatus(PENDING))

            // 최근 일관성 검증 결과
            .lastInconsistencyCount(metricsService.getLastInconsistencyCount())

            .build();
    }
}
```

## 마치며

복합 환경에서의 일관성 관리는 단순한 솔루션이 없습니다. 핵심 원칙을 정리하면:

**아키텍처 설계**
- L1 + L2 캐시 계층화로 성능과 일관성 균형
- Pub/Sub으로 L1 캐시 동기화
- 이벤트 기반 아키텍처로 서비스 간 느슨한 결합

**데이터 일관성**
- Outbox 패턴으로 이벤트 발행 보장
- Saga 패턴으로 분산 트랜잭션 대체
- 최종 일관성 + 짧은 TTL로 실용적 접근

**운영**
- 일관성 검증 배치로 문제 조기 발견
- 메트릭과 알림으로 이상 감지
- 자동 복구 메커니즘 구축

완벽한 일관성은 불가능하지만, 비즈니스 요구사항에 맞는 수준의 일관성을 합리적인 비용으로 달성하는 것이 목표입니다.
