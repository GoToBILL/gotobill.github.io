---
title: "Tomcat 모니터링과 트러블슈팅 가이드"
date: "2025-12-15"
description: "JMX, Thread Dump, Heap Dump를 활용한 Tomcat 모니터링과 장애 분석 방법을 상세히 알아봅니다."
category: "개발"
tags: ["Tomcat", "Java", "Monitoring", "JMX", "Troubleshooting"]
---

## JMX (Java Management Extensions)

<iframe src="/tomcat-jmx-monitoring.html" width="100%" height="550" frameborder="0"></iframe>

### JMX 활성화

```bash
# catalina.sh 또는 setenv.sh
CATALINA_OPTS="$CATALINA_OPTS -Dcom.sun.management.jmxremote"
CATALINA_OPTS="$CATALINA_OPTS -Dcom.sun.management.jmxremote.port=9999"
CATALINA_OPTS="$CATALINA_OPTS -Dcom.sun.management.jmxremote.ssl=false"
CATALINA_OPTS="$CATALINA_OPTS -Dcom.sun.management.jmxremote.authenticate=false"
```

### JConsole 연결

```bash
jconsole localhost:9999
```

### 주요 MBean

**ThreadPool**:
```
Catalina → ThreadPool → http-nio-8080
├── currentThreadCount: 현재 스레드 수
├── currentThreadsBusy: 사용 중인 스레드 수
├── maxThreads: 최대 스레드 수
└── connectionCount: 현재 연결 수
```

**GlobalRequestProcessor**:
```
Catalina → GlobalRequestProcessor → http-nio-8080
├── requestCount: 총 요청 수
├── errorCount: 에러 수
├── processingTime: 총 처리 시간
├── maxTime: 최대 처리 시간
└── bytesReceived / bytesSent: 송수신 바이트
```

## Manager App (Tomcat Web UI)

### 활성화

```xml
<!-- conf/tomcat-users.xml -->
<tomcat-users>
  <role rolename="manager-gui"/>
  <user username="admin" password="password" roles="manager-gui"/>
</tomcat-users>
```

### 접속

`http://localhost:8080/manager/html`

**기능**:
- 애플리케이션 배포/삭제/재시작
- 세션 수 확인
- 서버 상태 (Thread Pool, Memory)

## Access Log 분석

### 설정

```xml
<Host name="localhost" appBase="webapps">
  <Valve className="org.apache.catalina.valves.AccessLogValve"
         directory="logs"
         prefix="localhost_access_log"
         suffix=".txt"
         pattern="%h %l %u %t &quot;%r&quot; %s %b %D"
         resolveHosts="false" />
</Host>
```

### Pattern 설명

| 패턴 | 설명 | 예시 |
|------|------|------|
| %h | Remote host (IP) | 192.168.1.100 |
| %t | 시간 | [14/Dec/2024:10:30:45 +0900] |
| %r | 요청 라인 | GET /api/users HTTP/1.1 |
| %s | 상태 코드 | 200, 404, 500 |
| %b | 응답 바이트 수 | 1234 |
| %D | 처리 시간 (ms) | 150 |

### 로그 예시

```
192.168.1.100 - - [14/Dec/2024:10:30:45 +0900] "GET /api/users HTTP/1.1" 200 1234 150
192.168.1.101 - - [14/Dec/2024:10:30:46 +0900] "POST /api/login HTTP/1.1" 401 256 50
```

### 분석 스크립트

```bash
# 느린 요청 찾기 (응답 시간 > 1초)
awk '$NF > 1000' localhost_access_log.*.txt

# 상위 10개 느린 URL
awk '{print $(NF-1), $7}' localhost_access_log.*.txt | sort -rn | head -10

# 에러율 (4xx, 5xx)
awk '{print $9}' localhost_access_log.*.txt | grep -E "^[45]" | wc -l
```

## Thread Dump 분석

### Thread Dump 자동 수집

```bash
#!/bin/bash
# thread-dump-monitor.sh

PID=$(pgrep -f "catalina")
DUMP_DIR="/var/log/tomcat/thread-dumps"
INTERVAL=10  # 10초 간격
COUNT=5      # 5번 수집

mkdir -p $DUMP_DIR

for i in $(seq 1 $COUNT); do
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    jstack $PID > $DUMP_DIR/thread-dump-$TIMESTAMP.txt
    echo "Thread dump collected: $TIMESTAMP"
    sleep $INTERVAL
done
```

### 분석 도구

- **fastThread**: https://fastthread.io/ (온라인 분석)
- **TDA**: Thread Dump Analyzer (로컬 분석)

## Heap Dump 분석

### 수동 생성

```bash
# PID 확인
jps -v

# Heap Dump 생성
jmap -dump:live,format=b,file=heap-dump.hprof <PID>
```

### 자동 생성 (OOM 발생 시)

```bash
JAVA_OPTS="$JAVA_OPTS -XX:+HeapDumpOnOutOfMemoryError"
JAVA_OPTS="$JAVA_OPTS -XX:HeapDumpPath=/var/log/tomcat/heap-dump.hprof"
```

### 분석 도구

- **Eclipse MAT** (Memory Analyzer Tool)
- **VisualVM**
- **JProfiler**

### 주요 분석 포인트

1. **Leak Suspects**: 메모리 누수 의심 객체
2. **Dominator Tree**: 메모리를 많이 차지하는 객체
3. **Thread 분석**: 각 스레드가 보유한 객체

## 트러블슈팅 케이스

### Case 1: Thread Pool 고갈

**증상**:
- 응답 시간 급격히 증가
- 새 요청 처리 안됨
- 로그: "All threads are busy, waiting for release"

**Thread Dump 확인**:
```
200개 스레드 모두 RUNNABLE 상태:
"catalina-exec-1" waiting on <0x12345> (DB Connection)
"catalina-exec-2" waiting on <0x12345> (DB Connection)
...
"catalina-exec-200" waiting on <0x12345> (DB Connection)
```

**원인**:
- 느린 DB 쿼리
- 외부 API 타임아웃 미설정
- synchronized 블록 병목

**해결**:
```java
// Before: 타임아웃 없음
RestTemplate restTemplate = new RestTemplate();
String result = restTemplate.getForObject(url, String.class);  // 무한 대기 가능

// After: 타임아웃 설정
HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory();
factory.setConnectTimeout(3000);  // 연결 타임아웃 3초
factory.setReadTimeout(5000);     // 읽기 타임아웃 5초

RestTemplate restTemplate = new RestTemplate(factory);
```

**DB Connection Pool 튜닝**:
```properties
# HikariCP
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.connection-timeout=3000
spring.datasource.hikari.validation-timeout=3000
spring.datasource.hikari.leak-detection-threshold=60000
```

### Case 2: OutOfMemoryError (Heap)

**증상**:
```
java.lang.OutOfMemoryError: Java heap space
```

**원인 파악**:
```bash
# Heap Dump 분석
# Eclipse MAT 사용

# 발견: ArrayList에 100만 개 객체 보유
# 원인: 페이징 없이 전체 데이터 조회
```

**코드**:
```java
// Before: 메모리 폭탄
@GetMapping("/campaigns")
public List<Campaign> getAllCampaigns() {
    return campaignRepository.findAll();  // 100만건 조회!
}

// After: 페이징 처리
@GetMapping("/campaigns")
public Page<Campaign> getCampaigns(Pageable pageable) {
    return campaignRepository.findAll(pageable);  // 20건씩
}
```

### Case 3: 높은 CPU 사용률

**증상**:
```
CPU: 100% 지속
응답 시간: 정상
```

**Thread Dump 확인**:
```
"catalina-exec-1" cpu=98.7%
   at com.example.service.HashService.calculateHash(HashService.java:45)
   at com.example.controller.ApiController.processRequest(ApiController.java:123)
```

**코드 확인**:
```java
// 무한 루프 또는 비효율적 알고리즘
public String calculateHash(String input) {
    String result = input;
    for (int i = 0; i < 1000000; i++) {  // 불필요한 반복
        result = MD5(result);
    }
    return result;
}
```

**해결**:
```java
// 캐싱 적용
@Cacheable("hashCache")
public String calculateHash(String input) {
    return MD5(input);  // 1회만 계산
}
```

### Case 4: Connection Timeout

**증상**:
```
java.net.SocketTimeoutException: Read timed out
```

**원인**:
- 네트워크 불안정
- 방화벽 타임아웃
- Keep-Alive 설정 불일치

**확인**:
```bash
# 네트워크 지연 확인
curl -w "@curl-format.txt" -o /dev/null -s http://api.example.com

# curl-format.txt:
time_namelookup:  %{time_namelookup}
time_connect:  %{time_connect}
time_starttransfer:  %{time_starttransfer}
time_total:  %{time_total}
```

**해결**:
```xml
<!-- Tomcat Keep-Alive 설정 -->
<Connector port="8080"
           protocol="HTTP/1.1"
           keepAliveTimeout="60000"
           maxKeepAliveRequests="100" />
```

```java
// Spring RestTemplate 재사용
@Bean
public RestTemplate restTemplate() {
    PoolingHttpClientConnectionManager cm = new PoolingHttpClientConnectionManager();
    cm.setMaxTotal(200);  // 전체 연결 수
    cm.setDefaultMaxPerRoute(20);  // 호스트당 연결 수

    CloseableHttpClient httpClient = HttpClients.custom()
        .setConnectionManager(cm)
        .build();

    return new RestTemplate(new HttpComponentsClientHttpRequestFactory(httpClient));
}
```

### Case 5: Session 메모리 누수

**증상**:
- Heap 사용률 지속 증가
- GC 빈번 발생
- Session 개수 계속 증가

**원인**:
```java
// Session에 큰 객체 저장
@GetMapping("/upload")
public void uploadFile(@RequestParam("file") MultipartFile file, HttpSession session) {
    byte[] data = file.getBytes();  // 10MB
    session.setAttribute("uploadedFile", data);  // Session에 저장!
}
```

**Session 확인**:
```bash
# Manager App에서 확인
http://localhost:8080/manager/html

# 또는 JMX
Catalina → Manager → /myapp
└── activeSessions: 50000 (비정상적으로 높음)
```

**해결**:
```java
// Session 대신 임시 저장소 사용
@GetMapping("/upload")
public String uploadFile(@RequestParam("file") MultipartFile file) {
    String fileId = UUID.randomUUID().toString();

    // Redis 또는 파일 시스템에 저장
    redisTemplate.opsForValue().set(
        "upload:" + fileId,
        file.getBytes(),
        10, TimeUnit.MINUTES
    );

    return fileId;
}
```

**Session Timeout 설정**:
```xml
<!-- web.xml -->
<session-config>
  <session-timeout>30</session-timeout>  <!-- 30분 -->
</session-config>
```

## 모니터링 체크리스트

### 일일 점검

| 항목 | 정상 범위 | 확인 방법 |
|------|----------|----------|
| Thread Pool 사용률 | < 80% | JMX: currentThreadsBusy / maxThreads |
| Heap 사용률 | < 80% | JMX: HeapMemoryUsage |
| GC 시간 | < 1% | GC 로그 분석 |
| 에러율 | < 1% | Access Log 분석 |
| 응답 시간 | < 500ms | Access Log %D 분석 |

### 알림 설정

```yaml
# Prometheus Alerting Rules 예시
groups:
- name: tomcat
  rules:
  - alert: TomcatHighThreadUsage
    expr: tomcat_threads_busy / tomcat_threads_max > 0.8
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Thread Pool 사용률 80% 초과"

  - alert: TomcatHighErrorRate
    expr: rate(tomcat_global_error_total[5m]) > 10
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "에러율 급증"
```

## 요약

**모니터링**
- JMX로 Thread Pool, Memory, Request 통계 수집
- Access Log로 응답 시간과 에러율 분석
- Thread Dump로 병목 지점 파악

**트러블슈팅 순서**
1. 증상 파악 (로그, 메트릭)
2. Thread Dump / Heap Dump 수집
3. 원인 분석 (fastThread, Eclipse MAT)
4. 코드 수정 또는 설정 변경
5. 검증 및 모니터링

**주요 원인과 해결책**

| 증상 | 원인 | 해결책 |
|------|------|--------|
| Thread Pool 고갈 | 느린 외부 호출 | 타임아웃 설정 |
| OOM | 대량 데이터 조회 | 페이징 처리 |
| 높은 CPU | 비효율적 알고리즘 | 캐싱, 최적화 |
| Connection Timeout | Keep-Alive 불일치 | 타임아웃 조정 |
| Session 누수 | 큰 객체 저장 | Redis 사용 |

Tomcat 시리즈 전체를 통해 아키텍처부터 트러블슈팅까지 알아보았습니다. 실제 운영 환경에서 문제가 발생했을 때 이 가이드가 도움이 되길 바랍니다.
