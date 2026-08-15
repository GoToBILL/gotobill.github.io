export const profile = {
  name: "주병주",
  role: "백엔드 개발자",
  birth: "2000.04.06",
  education: "세종대학교 컴퓨터공학과",
  summary: "최신 기술 자체보다 비용과 운영 조건에 맞는 선택을 중요하게 생각합니다. 새로운 인프라를 더하기보다 기존 구조를 개선해, 적은 리소스로 예측 가능한 성능을 만드는 백엔드 개발자입니다.",
  github: "https://github.com/gotobill",
}

export const career = [
  {
    period: "2020.03 — 2026.08",
    title: "세종대학교",
    descriptor: "세종대학교",
    logo: "/images/organizations/sejong-university-transparent.png",
    logoAlt: "세종대학교",
    logoClass: "sejong",
    role: "컴퓨터공학",
  },
  {
    period: "2025.02 — 2025.09",
    title: "IT 연합동아리 Prography",
    role: "10기 · 백엔드",
  },
  {
    period: "2025.03 — 2025.12",
    title: "소프트웨어 마에스트로 16기",
    descriptor: "SW Maestro",
    logo: "/images/organizations/software-maestro-transparent.png",
    logoAlt: "소프트웨어 마에스트로",
    logoClass: "sw-maestro",
    role: "16기 · 백엔드 · 인프라 · 마케팅",
  },
  {
    period: "2026.03.09 — 현재",
    title: "NHN Cloud",
    descriptor: "NHN Cloud",
    logo: "/images/organizations/nhn-cloud.png",
    logoAlt: "NHN Cloud",
    logoClass: "nhn-cloud",
    role: "백엔드 개발자 · 정규직",
    current: true,
  },
]

export const activities = [
  { period: "2023.09 — 2023.12", title: "42 Seoul", descriptor: "42 Seoul · 소프트웨어 교육 과정", logo: "/images/organizations/42-seoul.png", logoAlt: "42 Seoul", logoClass: "forty-two", role: "소프트웨어 엔지니어링 과정" },
  { period: "2024.03 — 2024.12", title: "멋쟁이사자처럼 12기", descriptor: "멋쟁이사자처럼 · 대학 IT 동아리", logo: "/images/organizations/likelion-transparent.png", logoAlt: "멋쟁이사자처럼", logoClass: "likelion", role: "12기 · 백엔드 엔지니어" },
  { period: "2025.02 — 2025.09", title: "Prography 10기", descriptor: "Prography · IT 연합동아리", logo: "/images/organizations/prography.png", logoAlt: "Prography", logoClass: "prography", role: "10기 · 백엔드" },
  { period: "2025.03 — 2025.12", title: "소프트웨어 마에스트로 16기", descriptor: "SW Maestro", logo: null, logoAlt: "소프트웨어 마에스트로", logoClass: "sw-maestro", role: "백엔드 · 인프라 · 마케팅" },
]

export const awards = [
  { date: "2024.12", title: "대상", event: "세종대학교 SW/AI 해커톤" },
  { date: "2024.12", title: "우수상", event: "세종대학교 컴퓨터공학과 학술제" },
  { date: "2025.06", title: "장려상", event: "세종대학교 SW/AI 해커톤" },
]

export const oss = [
  {
    date: "2025",
    title: "Spring Data JPA",
    description: "SimpleJpaRepository save() 테스트 커버리지 개선",
    href: "https://github.com/spring-projects/spring-data-jpa/issues/4125",
  },
  {
    date: "2025",
    title: "Spring Data JPA",
    description: "레퍼런스 문서 문법 오류 수정",
    href: null,
  },
]

export const skillGroups = [
  { title: "Backend", items: ["Java 21", "Spring Boot", "Spring Batch", "Spring Data JPA", "WebClient"] },
  { title: "Data", items: ["MySQL", "Apache Iceberg", "Nessie"] },
  { title: "Cloud & Infra", items: ["Kubernetes", "AWS", "Terraform", "Docker", "Nginx"] },
  { title: "Observability", items: ["Prometheus", "Grafana", "Loki", "Promtail"] },
  { title: "Quality & Tooling", items: ["Locust", "Playwright", "GitHub Actions", "Jenkins", "AI 개발 자동화"] },
]

export const projects = [
  {
    slug: "metering",
    group: "NHN Cloud",
    title: "원장 시스템 개발",
    headline: "중복을 차단하고, 멈춘 지점부터 복구하는 사용량 흐름",
    status: "진행 중",
    summary: "클라우드 사용량 과금 파이프라인의 중복·누락을 원장과 체크포인트로 탐지하고 복구하도록 설계했습니다.",
    stack: ["Java 21", "Spring Boot", "Spring Batch", "MySQL", "Kubernetes"],
    opening: [
      "클라우드 사용량은 같은 구간이 두 번 들어올 수 있습니다. 과금으로 이어지는 데이터라서 한 건의 누락과 중복도 곧 비즈니스 위험이 됩니다.",
      "처리 속도만 높이는 대신, 두 번 실행해도 한 번만 반영되고 중간에 멈춰도 정확한 지점부터 이어지는 흐름을 설계했습니다.",
    ],
    story: [
      { title: "문제의 시작", paragraphs: ["수집, 집계, 전송과 완료 처리가 한 덩어리이면 실패했을 때 어디까지 성공했는지 알기 어렵습니다. 재실행은 누락을 막지만 이미 보낸 사용량을 다시 보낼 위험을 만듭니다."] },
      { title: "제약 조건", paragraphs: ["동시에 실행되는 작업은 하나여야 하고, 애플리케이션 서버의 시간이 달라도 잠금 판단은 같아야 했습니다.", "대상과 상품마다 진행 속도가 다르므로 하나의 전역 위치로는 안전하게 재개할 수 없었습니다."] },
      { title: "설계 선택", paragraphs: ["ShedLock의 기준 시간을 DB로 통일하고 대상·상품별 체크포인트를 분리했습니다. 처리할 시간 구간을 먼저 확정한 뒤 정규화와 집계를 수행합니다.", "전송 전에는 대기 원장에 기록하고, 수신 확인 뒤에만 전송 완료와 체크포인트를 갱신합니다."] },
      { title: "실패를 막는 장치", paragraphs: ["같은 입력은 중복 방지 키로 식별해 중복을 종료합니다. 전송에 실패한 항목은 대기 원장에 남겨 제한된 횟수로 재시도합니다.", "누락된 구간은 보충 작업으로 다시 확인하고, 원장과 집계 결과가 일치하는지 별도로 점검합니다."] },
      { title: "검증", paragraphs: ["가짜 수신 서버를 둔 E2E 테스트에서 중복 입력, 중간 실패, 응답 유실과 재개를 반복했습니다. 부하 검증에서도 작업이 정해진 주기 안에 끝나는지 확인했습니다."] },
      { title: "결과", paragraphs: ["부하 테스트에서 시간당 20.1만 건을 실패 0건으로 7분 11초 만에 처리했고, 장애 재현 실험에서는 최대 53.5만 건을 유실 없이 자동 복구했습니다.", "핵심 배치 로직은 라인·브랜치 커버리지 100%를 확보했고, 전 환경에 안전 모드(fake-send)를 유지해 실제 과금 사고는 0건이었습니다."] },
    ],
    diagram: {
      title: "두 번 들어온 사용량을, 한 번만 처리하려면?",
      mermaid: `flowchart LR
        A["사용량 읽기"] --> B["정규화"] --> C["집계"] --> D[("전송 대기 원장(PENDING)")]:::store
        D --> E["전송"] --> F{"수신 확인"}:::trusted
        F -->|성공| G["전송 완료(SENT)"]:::current --> H[("대상별 체크포인트")]:::store
        B --> I{"동일 입력"}
        I -->|이미 처리| J["종료"]
        F -->|응답 유실| D
        D -->|제한 재시도| E
        H -->|중단 후 재개| A
        class I,F trusted
        class J neutral
        class E current`,
      takeaway: "전송 상태는 원장에, 대상별 체크포인트는 별도로 남깁니다.",
      annotations: ["DB 시간 기준 잠금", "중복 방지 키로 재전송 차단", "수신 확인 뒤 체크포인트 갱신"],
      lanes: [
        { label: "입력 정리", nodes: ["사용량", "대상", "시간 구간"] },
        { label: "처리", nodes: ["정규화", { label: "이미 처리?", kind: "boundary" }, "집계", "전송", { label: "수신 확인?", kind: "boundary" }] },
        { label: "복구", nodes: ["중복 종료", { label: "대기 원장", kind: "store" }, "제한 재시도", "결과 일치 확인", { label: "체크포인트", kind: "store" }] },
      ],
      branches: [{ from: "이미 처리?", label: "예", to: "중복 종료" }, { from: "수신 확인?", label: "아니오", to: "대기 원장", kind: "risk" }],
      alt: "사용량을 대상과 시간 구간으로 나누고 중복 여부를 확인한 뒤 집계·전송합니다. 중복은 종료하고 전송 실패는 대기 원장에서 재시도한 뒤 원장과 집계 결과의 일치 여부를 확인해 체크포인트를 갱신합니다.",
    },
  },
  {
    slug: "monitoring",
    group: "NHN Cloud",
    title: "K8s 모니터링 기능 개발",
    headline: "Airflow 실행과 Kubernetes 서빙 리소스의 상태를 한 흐름에서 판정하기",
    status: "비운영 환경 데이터 검증",
    summary: "Airflow 실행 상태와 Kubernetes 서빙 리소스·Revision·Pod 상태를 수집·통합해 대표 상태를 판정했습니다.",
    stack: ["Spring Boot", "Kubernetes", "Airflow", "Prometheus", "Grafana", "Loki"],
    opening: ["고객별 실행 환경의 상태는 메타데이터, 클러스터 이벤트와 주기 수집 결과에 흩어져 있었습니다. 서로 다른 시점의 신호를 화면 요청 때마다 모으면 응답도 판단도 느려집니다.", "먼저 신호를 스냅샷으로 만들고, 조회 시점에는 이미 판정된 현재 상태와 변화 이력만 읽도록 구조를 바꿨습니다."],
    story: [
      { title: "문제의 시작", paragraphs: ["같은 서비스도 신호마다 정상과 이상을 다르게 말할 수 있었습니다. 최신성 기준 없이 합치면 오래된 정상 신호가 새로운 장애를 가리거나 그 반대가 됩니다."] },
      { title: "제약 조건", paragraphs: ["일부 수집 경로가 실패해도 전체 상태 조회는 가능해야 했습니다. 검증 환경의 실제 데이터로 규칙을 확인하되 출시 이후 효과를 단정하지 않았습니다."] },
      { title: "설계 선택", paragraphs: ["수집 결과를 수집 시각이 기록된 스냅샷으로 정리했습니다. 판정 규칙은 외부 시스템에 의존하지 않는 로직으로 분리하고, 여러 하위 단계의 상태가 충돌하면 가장 심각한 상태를 대표값으로 선택했습니다.", "상태 이력은 값이 바뀔 때만 저장해 같은 신호가 반복돼도 불필요한 기록이 쌓이지 않게 했습니다."] },
      { title: "실패를 막는 장치", paragraphs: ["오래되거나 누락된 신호는 정상으로 해석하지 않고 ‘오래됨’ 또는 ‘확인 불가’로 분리했습니다. 부분 실패가 다른 신호의 최신성을 덮지 못하게 각 입력의 시간을 함께 보존했습니다."] },
      { title: "검증", paragraphs: ["비운영 환경에서 얻은 실제 데이터로 상태 조합을 확인하고, 지연·부분 실패·상태 전환을 주입해 스냅샷과 이력이 기대대로 바뀌는지 검증했습니다."] },
      { title: "결과", paragraphs: ["알파 환경 테넌트 17곳, 서빙 파이프라인 293개를 대상으로 실측 검증했고, 은퇴 리비전 오탐을 수정해 응답 리소스 수를 98개에서 8개로 줄였습니다.", "알파 E2E 시나리오 16/16을 통과했고, 단위 테스트는 110건에서 129건으로 늘렸습니다."] },
    ],
    diagram: {
      title: "서로 다른 운영 신호가 충돌할 때, 현재 상태를 어떻게 결정할까?",
      mermaid: `flowchart LR
        A["메타데이터"] --> D[("시점별 스냅샷")]:::store
        B["클러스터 이벤트"] --> D
        C["주기 수집"] --> D
        D --> E{"최신성 확인"}:::trusted
        E -->|유효| F["외부 호출 없는 판정 규칙"] --> G["가장 심각한 상태 선택"]:::current
        E -->|오래됨·누락| H["정보가 오래됨 또는 확인 불가"]:::risk
        G --> I["상태 API"] --> J[("변화 시 이력 저장")]:::store --> K["대시보드"]`,
      takeaway: "신호를 먼저 스냅샷으로 고정하고 최신성과 가장 심각한 상태를 기준으로 판정합니다.",
      annotations: ["상태가 바뀔 때만 이력 저장", "부분 실패는 확인 불가로 분리"],
      lanes: [
        { label: "신호", nodes: ["메타데이터", "클러스터 이벤트", "주기 수집", { label: "스냅샷", kind: "store" }] },
        { label: "판정", nodes: ["최신성 확인", { label: "외부 호출 없는 규칙", kind: "boundary" }, "가장 심각한 상태 선택"] },
        { label: "제공", nodes: ["상태 API", { label: "변화 이력", kind: "store" }, "대시보드"] },
      ],
      branches: [{ from: "최신성 확인", label: "오래됨·누락", to: "정보가 오래됨 또는 확인 불가", kind: "risk" }],
      alt: "메타데이터와 이벤트, 주기 수집 신호를 스냅샷으로 저장합니다. 최신성을 확인한 뒤 순수 규칙으로 가장 심각한 상태를 선택하고 API, 변화 이력과 대시보드에 제공합니다. 오래되거나 누락된 신호는 별도 상태로 분리합니다.",
    },
  },
  {
    slug: "cloudtrail",
    group: "NHN Cloud",
    title: "멀티리전 Audit 기능 구현",
    headline: "리전마다 다른 요청 경로에서도, 신뢰할 수 있는 접속 정보를 남기는 방법",
    status: "진행 중",
    summary: "한국·일본 감사 로그의 접속 정보 차이를 XFF 신뢰 검증과 리전별 진입 지점에서 같은 형식으로 정리했습니다.",
    stack: ["Java 21", "Spring Boot", "Spring Security", "Nginx", "Playwright"],
    opening: ["한국과 일본 리전은 요청이 애플리케이션에 도달하는 경로가 달랐습니다. 같은 감사 이벤트인데도 접속 정보가 서로 다른 기준으로 남을 수 있었습니다.", "XFF(X-Forwarded-For) 값을 곧바로 믿는 대신, 지역별 차이는 각 진입 지점에서 처리하고 애플리케이션에는 검증된 접속 정보만 전달했습니다."],
    story: [
      { title: "문제의 시작", paragraphs: ["XFF는 클라이언트도 보낼 수 있는 헤더입니다. 신뢰할 프록시를 구분하지 않으면 감사 로그가 사용자가 만든 값에 오염될 수 있습니다."] },
      { title: "제약 조건", paragraphs: ["리전별 인프라 차이는 유지하면서 애플리케이션 로직은 하나여야 했습니다. 내부 주소나 구체적인 경로 설정을 공개하지 않고도 신뢰 규칙을 검증할 수 있어야 했습니다."] },
      { title: "설계 선택", paragraphs: ["지역별 요청 경로는 각 리전의 진입 지점에서 같은 형식으로 정리했습니다. 신뢰할 수 있는 프록시 구간을 통과한 값만 검증된 접속 정보로 만들고, 이후 인증과 감사 로직은 같은 정보 형식을 사용합니다."] },
      { title: "실패를 막는 장치", paragraphs: ["신뢰할 수 있는 네트워크 경계 밖에서 들어온 XFF는 보수적으로 무시합니다. 여러 값이 연결된 경우에도 어느 경유 지점까지 신뢰할지 규칙으로 판단합니다."] },
      { title: "검증", paragraphs: ["XFF를 직접 주입한 요청, 여러 값이 연결된 요청, 기존 값을 변조한 요청을 각각 테스트했습니다. 지역별 진입 경로를 거쳐도 애플리케이션이 동일한 접속 정보를 받는지 확인했습니다."] },
      { title: "결과", paragraphs: ["감사 이벤트는 36종에서 50종으로 늘었고, '누가·어디서·무엇을' 3축이 한국·일본 두 리전 모두에서 채워지도록 만들었습니다.", "위조 IP 주입 실험으로 방어를 실증했고, 애플리케이션 코드에는 리전 분기를 추가하지 않았습니다."] },
    ],
    diagram: {
      title: "서로 다른 지역의 요청을, 같은 감사 신뢰 규칙으로 처리하려면?",
      mermaid: `flowchart LR
        A["한국 요청 경로"] --> C["지역별 진입 처리"]
        B["일본 요청 경로"] --> C
        C --> D{"신뢰할 수 있는 프록시 구간"}:::trusted
        D -->|검증됨| E["검증된 접속 정보"]:::current --> F[("감사 이벤트")]:::store
        G["외부 XFF"] --> D
        D -->|직접 주입·변조| H["거부 또는 무시"]:::risk`,
      takeaway: "지역 차이는 진입 지점에서 흡수하고 이후에는 검증된 접속 정보만 전달합니다.",
      annotations: ["직접 XFF 주입 → 신뢰하지 않음", "여러 XFF 값 → 오른쪽부터 신뢰 프록시를 확인", "기존 값 변조 → 확인된 접속 정보로 교체"],
      lanes: [
        { label: "한국 리전", nodes: ["한국 요청 경로", "지역별 진입 처리"] },
        { label: "일본 리전", nodes: ["일본 요청 경로", "지역별 진입 처리"] },
        { label: "공통 처리", nodes: [{ label: "신뢰할 수 있는 프록시 구간", kind: "boundary" }, "검증된 접속 정보", { label: "감사 이벤트", kind: "store" }] },
      ],
      branches: [{ from: "외부 XFF", label: "신뢰할 수 있는 범위 밖", to: "거부·무시", kind: "risk" }],
      alt: "한국과 일본 요청 경로를 각 리전의 진입 지점에서 같은 형식으로 정리합니다. 신뢰할 수 있는 프록시 구간을 통과한 접속 정보만 감사 이벤트에 기록하며 외부에서 직접 넣은 XFF는 거부하거나 무시합니다.",
    },
  },
  {
    slug: "iceberg-schema-evolution",
    group: "NHN Cloud",
    title: "Iceberg 스키마 에볼루션 구현",
    headline: "기존 데이터를 버리지 않고 컬럼을 추가하는 스키마 변경 흐름",
    status: "진행 중",
    summary: "기존 데이터를 유지한 컬럼 추가 흐름과 호환성 검증 규칙을 구현했습니다. 일부 카탈로그 읽기 경로는 추가 확인 중입니다.",
    stack: ["Java 21", "Spring Batch", "Apache Iceberg", "Nessie", "MySQL"],
    opening: ["데이터에 새 컬럼이 필요할 때마다 기존 파일을 다시 만들면 비용도 크고 과거 스냅샷의 의미도 흔들립니다. 반대로 변경을 그대로 허용하면 오래된 데이터와 새 소비자가 함께 깨질 수 있습니다.", "추가 가능한 변경만 명시적으로 허용했습니다. 입력 CSV와 테이블 필드는 이름을 기준으로 연결하고, Iceberg 내부에서 진화한 컬럼은 Iceberg 컬럼 ID(field ID)로 추적해 과거 스냅샷을 계속 읽도록 했습니다."],
    story: [
      { title: "문제의 시작", paragraphs: ["입력 스키마와 Iceberg 테이블 스키마가 달라지는 순간이 생겼습니다. 필드 위치에 기대면 컬럼 순서가 바뀌는 것만으로도 잘못된 값이 연결될 수 있었습니다."] },
      { title: "제약 조건", paragraphs: ["공개 범위에서는 컬럼 추가만 허용했습니다. 삭제와 타입 변경은 자동화하지 않고 수동 마이그레이션 대상으로 남겼습니다.", "과거 CSV에는 새 필드가 없으므로 해당 값은 NULL로 읽혀야 했습니다."] },
      { title: "설계 선택", paragraphs: ["스키마 변경 요청을 만든 뒤 호환성 검사를 통과한 경우에만 카탈로그에 커밋합니다. 입력 CSV와 테이블 필드는 위치가 아니라 이름으로 매핑하고, Iceberg 내부 컬럼은 Iceberg 컬럼 ID로 추적한 채 새 스냅샷부터 확장된 스키마를 적용합니다."] },
      { title: "실패를 막는 장치", paragraphs: ["같은 요청을 반복해도 컬럼이 중복되지 않게 했습니다. 호환되지 않는 변경은 자동 커밋 전에 멈추고 수동 마이그레이션 절차로 보냅니다."] },
      { title: "검증", paragraphs: ["11개 시나리오를 검증하며 6개 결함을 찾았고, 13개 추론 케이스로 CSV 컬럼명 매핑, Iceberg 컬럼 ID 추적과 누락 필드 처리의 경계를 확인했습니다. 과거 스냅샷과 신규 스냅샷을 함께 조회해 누락 필드를 NULL로 읽는 동작도 점검했습니다."] },
      { title: "결과", paragraphs: ["데이터를 재생성하지 않고 컬럼을 추가하면서 과거 스냅샷을 그대로 읽을 수 있는 구조를 만들었습니다."] },
    ],
    diagram: {
      title: "새 필드를 추가해도 과거 스냅샷을 읽게 하려면?",
      mermaid: `flowchart LR
        A["입력 스키마"] --> B["스키마 변경 요청"] --> C{"추가 변경인가"}:::trusted
        C -->|예| D["CSV 컬럼명으로 연결"] --> E["Iceberg 컬럼 ID로 추적"]:::current
        E --> F[("카탈로그 커밋")]:::store --> G["새 스냅샷"]
        H["과거 스냅샷"] --> I["통합 조회 검증"]
        G --> I
        C -->|삭제·타입 변경| J["수동 마이그레이션"]:::risk
        K["누락 필드"] -->|NULL| I`,
      takeaway: "호환성 검사를 통과한 추가 변경만 커밋하고 이름으로 필드를 매핑합니다.",
      annotations: ["과거 CSV의 새 필드 → NULL", "삭제·타입 변경은 자동 적용하지 않음", "일부 카탈로그 읽기 경로는 추가 확인 필요"],
      lanes: [
        { label: "변경 전", nodes: [{ label: "직접 스키마 변경", kind: "risk" }, "과거 데이터 조회 오류 위험"] },
        { label: "변경 후", nodes: ["스키마 변경 요청", { label: "호환 가능?", kind: "boundary" }, { label: "카탈로그 커밋", kind: "store" }, "새 스냅샷"] },
        { label: "조회", nodes: ["과거 스냅샷", "신규 스냅샷", "CSV 컬럼명 연결 · Iceberg 컬럼 ID 검증"] },
      ],
      branches: [{ from: "호환 가능?", label: "아니오", to: "수동 마이그레이션", kind: "risk" }],
      alt: "직접 스키마를 바꾸는 대신 스키마 변경 요청의 호환성을 검사합니다. 호환되면 카탈로그에 커밋하고 새 스냅샷을 만듭니다. CSV 입력은 이름으로 테이블 필드에 연결하고 Iceberg 내부 컬럼은 Iceberg 컬럼 ID로 추적합니다. 호환되지 않는 변경은 수동 마이그레이션으로 보냅니다.",
    },
  },
  {
    slug: "ai-harness",
    group: "NHN Cloud",
    title: "AI 개발 검증 체계 구축",
    headline: "개인 자동화를 팀이 재사용하는 검증·승인 흐름으로 확장했습니다",
    status: "진행 중",
    summary: "계획부터 구현·검증까지 이어지는 AI 개발 파이프라인과 Playwright 기반 verify-e2e를 만들어 팀의 공통 방식으로 확장했습니다. 코드 생산의 정확도를 높이고 생산량을 약 3배로 늘렸습니다.",
    stack: ["AI 개발 자동화", "GitHub Actions", "Jenkins", "Playwright", "Docker"],
    opening: ["화면 변경은 개발자가 브라우저에서 버튼을 하나씩 누르며 사용자 흐름을 직접 확인해야 했습니다. 개발과 검증이 한 사람의 순차 작업으로 묶여, 코드를 빠르게 만들어도 검증이 병목이 됐습니다.", "AI 에이전트가 계획부터 구현과 검증 증거 정리까지 수행하는 개발 파이프라인과 Playwright 기반 verify-e2e를 직접 만들었습니다. 변경 시나리오 생성, 실제 버튼·흐름 실행과 스크린샷 수집을 자동화한 뒤 팀의 공통 검증 방식으로 확장해 코드 생산의 정확도를 높이고 생산량을 약 3배로 늘렸습니다."],
    story: [
      { title: "문제의 시작", paragraphs: ["정적 검사, 단위 테스트, 문서 갱신과 화면 검증이 개인의 기억에 의존해 작업마다 완료 기준이 달랐습니다. 화면 변경도 개발자가 브라우저에서 버튼을 하나씩 눌러 확인해야 했습니다."] },
      { title: "제약 조건", paragraphs: ["개발 환경과 운영 환경의 경계를 넘지 않아야 했고, 자동화가 만든 변경도 사람이 재현할 수 있는 검사 결과를 남겨야 했습니다."] },
      { title: "팀 공통 흐름", paragraphs: ["요청에 입력·산출물·완료 조건을 명시하고 작은 단위로 나눴습니다. 직접 만든 verify-e2e가 변경 시나리오를 생성하고 Playwright로 실제 버튼과 사용자 흐름을 실행한 뒤 스크린샷 증거를 수집합니다.", "이 흐름을 팀에 공유해 동료가 같은 검증 절차를 재사용하도록 했고, 개발과 검증의 병렬성을 높였습니다. 마지막 승인 권한은 사람에게 남겨 자동화가 결정을 대신하지 않고 판단 근거를 모으게 했습니다."] },
      { title: "실패를 막는 장치", paragraphs: ["검사에 실패하면 전체 작업을 반복하지 않고 실패한 범위만 제한해 다시 시도합니다. 환경을 바꾸는 작업은 별도 승인 지점에서 멈추도록 했습니다."] },
      { title: "검증", paragraphs: ["E2E는 허용된 비운영 환경에서만 실행하고, 정적 검사·단위 테스트·E2E 결과와 화면 증거를 함께 남겼습니다. 실제 사용 기록을 기준으로 규칙별 호출과 유지 비용을 비교해 팀의 피드백을 반영했습니다."] },
      { title: "결과", paragraphs: ["코드 생산의 정확도가 크게 개선됐고 생산량은 약 3배로 늘었습니다. 상시 로드 규칙 문서는 385줄에서 88줄로, 리뷰 자동화 문서는 591줄에서 210줄로 줄였고 전체 코드는 4,524줄 순감소했습니다.", "개인 자동화를 동료가 재사용하는 팀의 검증·승인 흐름으로 확장한 뒤, 실제 사용에 맞는 규모로 단순화했습니다."] },
    ],
    diagram: {
      title: "AI가 완료라고 말할 때, 무엇을 근거로 통과시킬까?",
      mermaid: `flowchart LR
        A["완료 조건이 명확한 작업 정의"] --> B["작은 작업 단위"] --> C["AI 결과"]
        C --> D["정적 검사"]
        C --> E["단위 테스트"]
        C --> F["E2E"]
        D --> G[("검증 결과")]:::store
        E --> G
        F --> G
        G --> H{"사람 승인"}:::trusted
        H -->|승인| I["완료"]:::current
        H -->|실패| J["실패 범위만 다시 실행"]:::risk --> B`,
      takeaway: "완료 선언이 아니라 자동 검사와 검증 결과, 사람 승인을 통과 기준으로 둡니다.",
      annotations: ["실패 범위만 다시 실행", "환경 변경은 사람 승인 필요", "내부 측정: 상시 로드 규칙 분량 77% 감소"],
      lanes: [
        { label: "이전", nodes: ["큰 요청", "큰 변경", { label: "수동 확인", kind: "risk" }] },
        { label: "작업", nodes: ["완료 조건이 명확한 작업 정의", "작은 단위", "AI 결과"] },
        { label: "검증", nodes: ["정적 검사", "단위 테스트", "E2E", { label: "검증 결과", kind: "store" }, { label: "사람 승인", kind: "boundary" }] },
      ],
      branches: [{ from: "자동 검사", label: "실패", to: "실패 범위만 다시 실행", kind: "risk" }],
      alt: "큰 요청과 수동 확인 중심 흐름을 완료 조건이 명확한 작업 정의와 작은 단위로 나눕니다. AI 결과는 정적 검사, 단위 테스트, E2E와 검증 결과를 거쳐 사람이 승인하며 실패한 범위만 다시 시도합니다.",
    },
  },
  {
    slug: "cherrydan",
    group: "Prography 10기",
    title: "Cherrydan",
    headline: "검색 API 3.6초를 P95 22ms로 줄이고, 검증에서 기존 조회를 유지하며 검색 테이블을 교체하기까지",
    status: "2025.05–2025.09 · 팀 프로젝트",
    summary: "약 80만 건을 훑던 검색 병목을 관측하고, 전날 데이터 전용 검색 구조와 원자적 테이블 교체로 개선했습니다.",
    stack: ["Spring Boot", "MySQL", "Prometheus", "Grafana", "Loki", "Promtail", "Locust"],
    context: "캠페인 탐색에서 검색 응답과 관측 체계가 중요했습니다.",
    problem: "검색 지연과 자원 사용률을 한 흐름에서 비교하기 어려웠습니다.",
    decision: "요청 로그와 지표로 병목 구간을 좁히고 실행 계획을 기준으로 검색 구조와 인덱스를 조정했습니다.",
    reliability: "Prometheus, Grafana, Loki로 응답시간과 자원 신호를 함께 관찰했습니다.",
    validation: "동일한 Locust 시나리오에서 지연시간, CPU와 타임아웃을 측정했습니다.",
    outcome: "P95 22ms, CPU 15.2%, 타임아웃 0을 확인했습니다.",
    opening: [
      "키워드 알림을 누른 사용자는 전날 등록된 캠페인을 바로 확인하고 싶어 합니다. 하지만 검색은 전체 데이터에 전문 검색을 먼저 수행한 뒤 날짜를 거르는 구조였고, 트래픽이 몰리면 데이터베이스 CPU와 커넥션이 함께 고갈됐습니다.",
      "실행 계획과 운영 지표를 함께 보며 쿼리 순서, 검색 방식, 마지막에는 검색 대상 자체를 바꾸는 순서로 병목을 좁혔습니다.",
    ],
    story: [
      { title: "문제의 시작", paragraphs: ["초기 검색은 평균 3.6초가 걸렸고 데이터베이스 CPU가 96~97%까지 올랐습니다. Locust 100 VU 재현에서 커넥션 타임아웃 발생률이 약 80%였습니다.", "실행 계획을 확인해 보니 전문 검색 인덱스가 전체 약 80만 건을 먼저 훑고, 그 뒤 활성 여부와 날짜를 필터링하고 정렬했습니다. 검색어보다 날짜가 훨씬 먼저 대상을 줄일 수 있는데도 반대 순서로 비용을 쓰고 있었습니다."] },
      { title: "왜 쿼리 튜닝만으로 끝나지 않았나", paragraphs: ["첫 시도에서는 날짜 인덱스와 조인 순서를 고정해 대상을 약 5,600건으로 줄였습니다. P95는 220ms까지 낮아졌지만 축소된 데이터 전체에 검색 함수를 적용해 CPU 여유가 부족했습니다.", "두 번째로 작은 집합에서는 단순 부분 일치가 더 싸다는 점을 이용했습니다. 500 VU 조건에서 P95 47ms, CPU 42%까지 개선됐지만, 매번 큰 원본 테이블에서 대상을 골라내는 구조는 그대로였습니다."] },
      { title: "설계 선택", paragraphs: ["트래픽의 약 90%가 전날 캠페인을 찾는 알림에서 온다는 사용 패턴에 맞춰 검색용 데이터 구조를 분리했습니다. 전날 데이터는 전날 캠페인 전용 검색 데이터에서 전문 검색하고, 과거 날짜는 원본 데이터에서 부분 일치 검색으로 처리합니다.", "주기 작업이 전날의 활성 데이터만 검색 데이터에 동기화합니다. 최신 데이터가 즉시 반영되지 않는 대신, 서비스가 실제로 약속한 ‘전날 알림 결과’ 범위 안에서 예측 가능한 검색 비용을 얻는 선택이었습니다."] },
      { title: "실패를 막는 장치", paragraphs: ["전날 캠페인 검색 데이터가 비어 있거나 요청 날짜가 대상 범위를 벗어나면 원본 검색 경로로 돌아갑니다. 북마크 같은 연관 정보는 건별 조회하지 않고 묶어서 가져와 검색 개선 뒤에 새로운 N+1 병목이 생기지 않게 했습니다.", "응답 지연만 보지 않고 데이터베이스 CPU, DB 연결 풀, 처리량, 오류율과 로그를 같은 대시보드에서 비교했습니다. 한 지표의 개선이 다른 자원의 과부하로 바뀌지 않았는지 확인하기 위해서였습니다."] },
      { title: "검증", paragraphs: ["같은 부하 시나리오와 데이터 조건으로 각 단계를 비교했습니다. 최종 구조는 500 VU에서 P95 22ms, P99 150ms, 데이터베이스 CPU 15.2%를 기록했고 커넥션 타임아웃은 0%였습니다.", "초기 평균과 최종 백분위 값은 직접 개선율로 비교하지 않았습니다. 수치는 특정 데이터 분포와 부하 조건에서 얻은 결과이므로 각 검증 조건을 함께 명시했습니다."] },
    ],
    diagram: {
      title: "사용 패턴에 맞춘 검색 경로와 관측",
      mermaid: `flowchart LR
        A["검색 요청"] --> B{"전날 데이터인가"}:::trusted
        B -->|예| C[("전날 캠페인 검색 데이터")]:::store --> D["전문 검색"]:::current
        B -->|아니오| E[("원본 데이터")]:::store --> F["원본 데이터 부분 일치 검색"]
        G["주기 동기화"] --> C
        D --> H["검색 응답"]
        F --> H
        H --> I["응답 지연 · DB CPU · 오류율"] --> J[("메트릭과 로그")]:::store --> K["대시보드"]`,
      takeaway: "대부분의 요청이 읽는 작은 집합을 분리하고, 예외는 원본 검색으로 안전하게 되돌립니다.",
      alt: "검색 날짜가 전날이면 주기적으로 동기화한 전날 캠페인 검색 데이터에서 전문 검색하고, 아니면 원본 데이터에서 부분 일치 검색합니다. 두 경로의 응답 지연, DB CPU와 오류율은 메트릭과 로그로 관측합니다.",
      nodes: ["캠페인 검색", "검색 API", "실행 계획", "MySQL", "응답"],
      secondary: ["지표 + 로그", "병목 분석", "부하 검증"],
    },
  },
  {
    slug: "chefriend",
    group: "소프트웨어 마에스트로 16기",
    title: "Chefriend",
    status: "팀 프로젝트 · 성능 검증",
    summary: "외부 분석 API 호출과 이미지 전송의 대기 비용을 줄여 처리량과 응답성을 개선했습니다.",
    stack: ["Spring Boot", "WebClient", "AWS", "Terraform", "Docker"],
    context: "외부 분석 API 호출과 이미지 전달이 사용자 대기시간을 좌우했습니다.",
    problem: "동기 호출이 스레드를 점유하고 원본 이미지가 전송을 지연시켰습니다.",
    decision: "WebClient를 사용한 논블로킹 API 호출과 CDN 이미지 변환을 적용했습니다.",
    reliability: "타임아웃과 제한된 재시도로 외부 실패를 격리했습니다.",
    validation: "동일한 부하 조건에서 처리량을 비교하고 이미지 응답시간을 반복 측정했습니다.",
    outcome: "동일 32개 스레드의 부하 검증에서 처리량은 18 RPS에서 866 RPS로, 이미지 응답시간은 200ms에서 30ms로 개선했습니다.",
    diagram: {
      title: "외부 분석과 이미지 전달 흐름",
      mermaid: `flowchart LR
        A["리뷰 요청"] --> B["애플리케이션"]
        B --> C["논블로킹 방식의 분석 API 호출"]:::current
        B --> D["이미지 저장"]
        C --> E["분석 결과"]
        D --> F["CDN 변환"]:::current --> G["최적화 이미지"]
        E --> H["분석 결과와 이미지 응답 구성"]
        G --> H
        C -->|타임아웃·제한 재시도| I["타임아웃 시 요청 영향 제한"]:::risk`,
      nodes: ["리뷰 요청", "애플리케이션 API", "WebClient", "외부 분석", "결과"],
      secondaryLabel: "이미지 전달 흐름",
      secondary: ["객체 저장소", "CDN 변환", "최적화 이미지"],
    },
  },
]

export const companyProjects = projects.filter(project => project.group === "NHN Cloud")
export const selectedProjects = projects.filter(project => project.group !== "NHN Cloud")
