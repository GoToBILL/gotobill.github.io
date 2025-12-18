---
title: "Tomcat 성능 튜닝 완벽 가이드"
date: "2025-12-14"
description: "Thread Pool, JVM, OS 레벨에서 Tomcat 성능을 최적화하는 방법을 상세히 알아봅니다."
category: "개발"
tags: ["Tomcat", "Java", "Performance", "JVM", "Tuning"]
---

## Thread Pool 튜닝

### Context Switching 이해하기

스레드 수를 무작정 늘리면 성능이 좋아질까요? 아닙니다. **Context Switching** 오버헤드 때문입니다.

![Context Switching 오버헤드](./contextSwitching.png)

**Context Switching이란?**

CPU가 실행 중인 스레드를 다른 스레드로 전환할 때 발생하는 작업입니다.

```
Thread A 실행 중
    ↓
[Context Switch 발생]
    1. Thread A의 레지스터 값을 메모리에 저장
    2. Thread A의 스택 포인터 저장
    3. Thread B의 레지스터 값 복원
    4. Thread B의 스택 포인터 복원
    ↓
Thread B 실행 시작
```

**비용 발생 지점**:

| 항목 | 비용 | 설명 |
|------|------|------|
| 레지스터 저장/복원 | ~1us | CPU 레지스터 값을 메모리에 저장 |
| TLB Flush | ~5us | 가상 메모리 변환 캐시 무효화 |
| CPU Cache Miss | ~100us | L1/L2/L3 캐시를 다시 채워야 함 |
| 스케줄러 오버헤드 | ~10us | 다음 스레드 선택, 우선순위 계산 |

**4코어에서의 비교**:

| 구분 | 8 스레드 | 500 스레드 |
|------|----------|------------|
| Context Switch/초 | ~100회 | ~50,000회 |
| CPU 효율 | 95% | 60% |
| Cache Hit Rate | 높음 | 낮음 |
| 스레드 메모리 | 8MB | 500MB |

500개 스레드가 4개 코어를 두고 경쟁하면, CPU는 실제 작업보다 스레드 전환에 더 많은 시간을 씁니다.

### 기본 원칙

**CPU 집약적 작업**:
```
최적 스레드 수 = CPU 코어 수 + 1
```

**I/O 집약적 작업** (웹 애플리케이션 대부분):
```
최적 스레드 수 = CPU 코어 수 × (1 + 대기시간 / 처리시간)

예: 8코어, 처리시간 10ms, DB 대기 90ms
   = 8 × (1 + 90/10) = 8 × 10 = 80
```

**실전 공식**:
```
maxThreads = (요청 처리 시간 / 목표 응답 시간) × 초당 요청 수

예: 요청 처리 100ms, 목표 응답 200ms, 초당 1000 요청
   = (100ms / 200ms) × 1000 = 500
```

### 규모별 설정 예시

**소규모 서비스** (트래픽 < 100 TPS):
```xml
<Connector port="8080"
           protocol="HTTP/1.1"
           maxThreads="50"
           minSpareThreads="10"
           maxConnections="2000"
           acceptCount="100" />
```

**중규모 서비스** (트래픽 100-1000 TPS):
```xml
<Connector port="8080"
           protocol="HTTP/1.1"
           maxThreads="200"
           minSpareThreads="25"
           maxConnections="10000"
           acceptCount="500" />
```

**대규모 서비스** (트래픽 1000+ TPS):
```xml
<Connector port="8080"
           protocol="HTTP/1.1"
           maxThreads="500"
           minSpareThreads="50"
           maxConnections="20000"
           acceptCount="1000"

           <!-- 추가 최적화 -->
           processorCache="500"
           socket.directBuffer="true"
           socket.appReadBufSize="8192"
           socket.appWriteBufSize="8192" />
```

## JVM 튜닝

### Heap 메모리

**기본 설정**:
```bash
# catalina.sh 또는 setenv.sh
JAVA_OPTS="$JAVA_OPTS -Xms2048m -Xmx2048m"
# -Xms: 초기 Heap 크기
# -Xmx: 최대 Heap 크기
# → 같은 값으로 설정하여 동적 확장 방지 (성능 향상)
```

**Heap 크기 결정**:

| 서버 메모리 | 권장 Heap |
|------------|-----------|
| 4GB | 2~3GB |
| 8GB | 4~6GB |
| 16GB | 8~12GB |
| 32GB+ | 16~24GB (Compressed OOP 활용) |

**주의**: 32GB를 초과하면 객체 포인터 크기가 4byte에서 8byte로 증가합니다. 가능하면 32GB 이하로 유지하세요.

### GC 튜닝

**G1GC** (Java 9+ 기본, 권장):
```bash
JAVA_OPTS="$JAVA_OPTS -XX:+UseG1GC"
JAVA_OPTS="$JAVA_OPTS -XX:MaxGCPauseMillis=200"  # 목표 정지 시간
JAVA_OPTS="$JAVA_OPTS -XX:InitiatingHeapOccupancyPercent=45"  # GC 시작 임계값
```

**ZGC** (Java 15+, 대용량 Heap):
```bash
JAVA_OPTS="$JAVA_OPTS -XX:+UseZGC"
JAVA_OPTS="$JAVA_OPTS -Xmx16g"  # 대용량 Heap에 적합
```

**GC 로깅**:
```bash
# Java 8
JAVA_OPTS="$JAVA_OPTS -XX:+PrintGCDetails"
JAVA_OPTS="$JAVA_OPTS -XX:+PrintGCDateStamps"
JAVA_OPTS="$JAVA_OPTS -Xloggc:$CATALINA_BASE/logs/gc.log"

# Java 9+
JAVA_OPTS="$JAVA_OPTS -Xlog:gc*:file=$CATALINA_BASE/logs/gc.log:time,uptime,level,tags"
```

### 기타 JVM 옵션

```bash
# Thread Stack 크기 (기본 1MB)
JAVA_OPTS="$JAVA_OPTS -Xss256k"  # 작게 설정 → 더 많은 스레드 생성 가능

# Direct Memory (NIO에서 사용)
JAVA_OPTS="$JAVA_OPTS -XX:MaxDirectMemorySize=1g"

# 성능 개선
JAVA_OPTS="$JAVA_OPTS -server"  # Server VM 사용
JAVA_OPTS="$JAVA_OPTS -XX:+AlwaysPreTouch"  # Heap 메모리 미리 할당
JAVA_OPTS="$JAVA_OPTS -XX:+UseStringDeduplication"  # 중복 String 제거 (G1GC)

# 트러블슈팅
JAVA_OPTS="$JAVA_OPTS -XX:+HeapDumpOnOutOfMemoryError"
JAVA_OPTS="$JAVA_OPTS -XX:HeapDumpPath=$CATALINA_BASE/logs/heapdump.hprof"
```

## OS 레벨 튜닝

### 파일 디스크립터 제한

**문제**:
```bash
# 기본값 확인
ulimit -n
# 1024 (너무 작음!)

# maxConnections=10000인데 ulimit=1024이면 1024개만 연결 가능
```

**해결**:
```bash
# 현재 세션만
ulimit -n 65535

# 영구 설정 (/etc/security/limits.conf)
tomcat soft nofile 65535
tomcat hard nofile 65535

# 시스템 전체 (/etc/sysctl.conf)
fs.file-max = 2097152
```

### TCP 파라미터

```bash
# /etc/sysctl.conf

# TCP backlog 크기
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 8192

# TIME_WAIT 소켓 재사용 (Keep-Alive 효율 향상)
net.ipv4.tcp_tw_reuse = 1

# TIME_WAIT 타임아웃 (기본 60초 → 30초)
net.ipv4.tcp_fin_timeout = 30

# TCP 버퍼 크기
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# 적용
sudo sysctl -p
```

### Port Range

```bash
# 로컬 포트 범위 확대
net.ipv4.ip_local_port_range = 10000 65535

# 이유: 많은 외부 연결 시 (DB, Redis, 외부 API) 로컬 포트 고갈 방지
```

## APR (Apache Portable Runtime) 사용

Native C 라이브러리를 사용하여 성능을 향상시킵니다.

**장점**:
- Native I/O가 Java NIO보다 빠름
- OpenSSL 직접 사용으로 SSL/TLS 성능 우수

**설치** (Ubuntu):
```bash
# APR 라이브러리 설치
sudo apt-get install libapr1-dev libssl-dev

# Tomcat Native 컴파일
cd $CATALINA_HOME/bin
tar xzf tomcat-native.tar.gz
cd tomcat-native-*/native
./configure --with-apr=/usr/bin/apr-1-config \
            --with-java-home=$JAVA_HOME \
            --with-ssl=yes \
            --prefix=$CATALINA_HOME
make && sudo make install
```

**설정**:
```xml
<Connector port="8080"
           protocol="org.apache.coyote.http11.Http11AprProtocol"
           maxThreads="500" />
```

**확인**:
```
catalina.out에서 확인:
INFO [main] org.apache.catalina.core.AprLifecycleListener.lifecycleEvent Loaded APR based Apache Tomcat Native library
```

## 실전 최적화 사례

### 10만 TPS 처리

**목표**: 초당 10만 요청 처리

**1단계: 단일 Tomcat 최적화**

```xml
<!-- server.xml -->
<Connector port="8080"
           protocol="org.apache.coyote.http11.Http11AprProtocol"
           maxThreads="1000"
           minSpareThreads="100"
           maxConnections="50000"
           acceptCount="2000"

           connectionTimeout="5000"
           keepAliveTimeout="30000"
           maxKeepAliveRequests="1000"

           compression="on"
           compressionMinSize="2048"
           compressibleMimeType="text/html,text/xml,application/json"

           processorCache="1000"
           socket.directBuffer="true"
           socket.appReadBufSize="16384"
           socket.appWriteBufSize="16384" />
```

**JVM 설정**:
```bash
JAVA_OPTS="-server"
JAVA_OPTS="$JAVA_OPTS -Xms16g -Xmx16g"
JAVA_OPTS="$JAVA_OPTS -XX:+UseG1GC"
JAVA_OPTS="$JAVA_OPTS -XX:MaxGCPauseMillis=100"
JAVA_OPTS="$JAVA_OPTS -XX:+AlwaysPreTouch"
JAVA_OPTS="$JAVA_OPTS -Xss256k"
```

**OS 튜닝**:
```bash
# /etc/sysctl.conf
net.core.somaxconn = 8192
net.ipv4.tcp_max_syn_backlog = 16384
net.ipv4.ip_local_port_range = 10000 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
fs.file-max = 2097152

# /etc/security/limits.conf
tomcat soft nofile 1000000
tomcat hard nofile 1000000
```

**결과**: 단일 서버 3만 TPS

**2단계: 수평 확장**

```
Load Balancer (Nginx)
├── Tomcat 1 (3만 TPS)
├── Tomcat 2 (3만 TPS)
├── Tomcat 3 (3만 TPS)
└── Tomcat 4 (3만 TPS)

→ 총 12만 TPS
```

### Graceful Shutdown

배포 시 진행 중인 요청을 손실 없이 처리합니다.

```bash
#!/bin/bash
# graceful-shutdown.sh

PID=$(pgrep -f "catalina")

echo "Starting graceful shutdown..."

# 1. Health check 비활성화 (로드밸런서가 요청 중단)
curl -X POST http://localhost:8080/actuator/health/down

# 2. 30초 대기 (진행 중인 요청 완료)
sleep 30

# 3. Tomcat shutdown
$CATALINA_HOME/bin/shutdown.sh

# 4. 10초 대기
sleep 10

# 5. 강제 종료 (아직 살아있으면)
if ps -p $PID > /dev/null; then
    echo "Force kill..."
    kill -9 $PID
fi

echo "Shutdown complete"
```

### 무중단 배포 (Blue-Green)

```
1. Green 서버 배포 및 시작
   Tomcat Green (새 버전) - 준비 중

2. Health check 통과 확인
   curl http://green:8080/actuator/health

3. 로드밸런서 트래픽 전환
   Nginx: Blue → Green

4. Blue 서버 Graceful Shutdown

5. Blue 서버를 다음 배포의 Green으로 사용
```

**Nginx 설정**:
```nginx
upstream tomcat {
    server blue:8080 max_fails=3 fail_timeout=30s;
    server green:8080 max_fails=3 fail_timeout=30s backup;
}

server {
    listen 80;

    location / {
        proxy_pass http://tomcat;
        proxy_next_upstream error timeout http_500 http_502 http_503;
    }
}
```

## 캐싱 전략

### HTTP 캐싱

```java
@GetMapping("/api/campaigns/{id}")
public ResponseEntity<Campaign> getCampaign(@PathVariable("id") Long id) {
    Campaign campaign = campaignService.findById(id);

    return ResponseEntity.ok()
        .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS))  // 1시간 캐싱
        .eTag(campaign.getVersion().toString())  // ETag 기반 캐싱
        .body(campaign);
}
```

### 정적 리소스 캐싱

```xml
<!-- web.xml -->
<filter>
    <filter-name>ExpiresFilter</filter-name>
    <filter-class>org.apache.catalina.filters.ExpiresFilter</filter-class>
    <init-param>
        <param-name>ExpiresByType image</param-name>
        <param-value>access plus 1 year</param-value>
    </init-param>
    <init-param>
        <param-name>ExpiresByType text/css</param-name>
        <param-value>access plus 1 month</param-value>
    </init-param>
</filter>
```

### CDN 활용

```
Client
  ↓
CDN (정적 리소스 캐싱)
  ↓ (캐시 미스 시)
Nginx (리버스 프록시)
  ↓
Tomcat (API만 처리)
```

## 요약

**Thread Pool 튜닝**
- I/O 집약적 작업은 `CPU 코어 수 × (1 + 대기시간/처리시간)` 공식 사용
- 규모에 따라 maxThreads 50~500 설정

**JVM 튜닝**
- Heap은 서버 메모리의 50~75% 할당
- G1GC 사용, MaxGCPauseMillis로 목표 정지 시간 설정
- OOM 발생 시 자동 Heap Dump 생성 설정

**OS 튜닝**
- 파일 디스크립터 제한을 65535 이상으로 설정
- TCP backlog와 TIME_WAIT 설정 최적화

**운영**
- Graceful Shutdown으로 무중단 배포
- Blue-Green 배포로 롤백 용이하게 구성

다음 포스트에서는 Tomcat 모니터링과 트러블슈팅 방법을 알아보겠습니다.
