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
## 회사 프로젝트 배경 지식 (사내 업무 기록)

블로그가 다루는 회사 업무(NHN Cloud Foundry / AIAS)의 배경 지식입니다. 아래 표에서 관련 키워드가 보이면 해당 파일을 읽어서 문맥을 파악합니다. 원본은 GitHub `GoToBILL/transfer` 이슈로 관리되며, 최신화가 필요하면 `gh api repos/GoToBILL/transfer/issues/<번호>` 로 재조회합니다.

### 공통 용어

| 용어 | 뜻 |
|---|---|
| CP (Control Plane) | 테넌트, 파이프라인, 차트 같은 메타 정보를 관리하는 중앙 컨트롤 플레인. 회사가 직접 관리 |
| ST (System Tenant) | 고객사별로 따로 뜨는 분석용 쿠버네티스 클러스터. 실제 연산이 도는 곳 |
| ST 직행 | 콘솔이 CP를 거치지 않고 ST 서비스를 직접 호출하는 경로 |
| CP 직행 | 콘솔이 콘솔 게이트웨이를 거쳐 CP를 호출하는 경로 |

### 문서 찾아보기

| 키워드 | 파일 | 요약 |
|---|---|---|
| 미터링, 과금, 배치, Spring Batch, 분산락, 트랜잭션 아웃박스, 대사, TC-Billing | `docs/company-context/01-metering-billing-batch.md` | 자원 사용량을 과금 플랫폼(TC-Billing)에 매시간 보내는 배치 파이프라인. 이중화 환경에서 중복·누락 과금을 막기 위한 분산 락·트랜잭션 아웃박스·대사 설계 |
| 모니터링, 어드민, 테넌트 상태, 헬스체크, 판정 엔진 | `docs/company-context/02-tenant-monitoring.md` | 테넌트(ST) 상태를 수집·판정해 어드민 화면에 보여주는 관측 시스템 |
| Iceberg, 스키마 에볼루션, 카탈로그, CSV 타입 추론 | `docs/company-context/03-iceberg-schema-evolution.md` | 데이터 소스를 삭제하지 않고 컬럼을 추가할 수 있게 만든 Iceberg 카탈로그 스키마 에볼루션 작업 |
| CloudTrail, 감사 로그, CP/ST, XFF, SNAT, 접속 IP, 게이트웨이 | `docs/company-context/04-cloudtrail-audit-log.md` | ST 직행 경로에서 사용자 신원과 접속 IP가 감사 로그에 비어 있던 문제를 리전별 인프라 차이 위에서 해결한 기록 |
| 하네스, AI 협업, 슬래시 커맨드, 서브에이전트, Claude Code | `docs/company-context/05-ai-harness.md` | 사람과 AI(Claude Code)가 같은 규약으로 백로그→구현→PR을 처리하도록 만든 개발 하네스 구축기 |
