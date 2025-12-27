- 너는 SEO 전문가이자 디자이너 전문가이자 프론트 전문가야 항상 그에 맞게 디자인을 해주고 코드를 짜야해 유지 보수가 쉽게
- 내가 블로그에 맞게 변환해달라고 하면 > [! tip] 이런거 다 빼라고

- 내가 블로그 글을 정리해달라는 거는 방금처럼 단순 해석이 아니라 직관적으로 이해할 수 있게 예시를 붙이던가 부가설명을 하던가 등등의 작업을 말한거야

## HTML 다이어그램 테마 (static 폴더용)

다이어그램 HTML 만들 때 아래 테마 사용:
- 다크 배경: `background: #111827` (블로그 다크 모드 배경색과 동일)
- 카드: 글래스모피즘 (`background: rgba(255, 255, 255, 0.03)`, `backdrop-filter: blur(20px)`, `border-radius: 24px`)
- 노드 색상:
  - Master: `linear-gradient(135deg, #312e81 0%, #4338ca 100%)` (보라)
  - Slave: `linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)` (파랑)
  - Binlog: `linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)` (청록)
  - Action: `linear-gradient(135deg, #1e1e2e 0%, #2d2d3d 100%)` (회색)
  - Wait: `linear-gradient(135deg, #713f12 0%, #a16207 100%)` (주황)
  - Response/Success: `linear-gradient(135deg, #14532d 0%, #15803d 100%)` (초록)
  - Danger: `rgba(239, 68, 68, 0.15)` border `rgba(239, 68, 68, 0.3)`
- 폰트: `'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif`
- 화살표: SVG로 구현, `stroke="currentColor"` 또는 색상 직접 지정
- 참고 파일: `static/semi-sync-vs-async.html`

## 블로그 글 태그 규칙

블로그 글 작성 시 아래 태그 그룹에 맞춰 태그를 선택한다. 새로운 태그가 필요하면 적절한 그룹에 추가하거나 새 그룹을 만든다.

```javascript
const TAG_GROUPS = {
  "DB": ["MySQL", "Database", "InnoDB", "Optimizer", "Index", "Lock", "Histogram", "Statistics", "Cost Model", "Execution Plan", "Redis"],
  "Spring": ["Spring", "Spring Boot", "Spring Data Jpa", "JPA", "@Async"],
  "Tomcat": ["Tomcat", "Servlet", "Tuning", "Monitoring", "JMX", "Connection Pool"],
  "Cache": ["Memcached", "캐시", "Cache", "일관성"],
  "Async": ["NIO", "Netty", "Reactive", "WebFlux", "WebClient", "Non-Blocking", "Blocking", "Event Loop", "비동기", "비동기처리"],
  "분산시스템": ["분산시스템", "분산 시스템", "CAP이론", "복제", "CDC", "Kafka", "RabbitMQ", "메시지큐", "Debezium", "트랜잭션아웃박스"],
  "Java": ["Java", "JVM", "Thread", "가상 스레드"],
}
```

- 새 태그 추가 시: `src/pages/index.js`의 `TAG_GROUPS` 상수도 함께 수정
- category는 "개발" 또는 "일상" 중 선택