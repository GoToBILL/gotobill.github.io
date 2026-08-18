export const profile = {
  name: "주병주",
  role: "백엔드 개발자",
  birth: "2000.04.06",
  workplace: "NHN Cloud",
  summary: "최신 기술 자체보다 비용과 운영 조건에 맞는 선택을 중요하게 생각합니다. 새로운 인프라를 더하기보다 기존 구조를 개선해, 적은 리소스로 예측 가능한 성능을 만드는 백엔드 개발자입니다.",
  github: "https://github.com/gotobill",
}

export const career = [
  { period: "2020.03 — 2026.08", title: "세종대학교", descriptor: "세종대학교", logo: "/images/organizations/sejong-university-transparent.png", logoAlt: "세종대학교", logoClass: "sejong", role: "컴퓨터공학" },
  { period: "2025.02 — 2025.09", title: "IT 연합동아리 Prography", role: "10기 · 백엔드" },
  { period: "2025.03 — 2025.12", title: "소프트웨어 마에스트로 16기", descriptor: "SW Maestro", logo: "/images/organizations/software-maestro-transparent.png", logoAlt: "소프트웨어 마에스트로", logoClass: "sw-maestro", role: "16기 · 백엔드 · 인프라 · 마케팅" },
  { period: "2026.03.09 — 현재", title: "NHN Cloud", descriptor: "NHN Cloud", logo: "/images/organizations/nhn-cloud.png", logoAlt: "NHN Cloud", logoClass: "nhn-cloud", role: "백엔드 개발자 · 정규직", current: true },
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
  { date: "2025", title: "Spring Data JPA", description: "SimpleJpaRepository save() 테스트 커버리지 개선", href: "https://github.com/spring-projects/spring-data-jpa/issues/4125" },
  { date: "2025", title: "Spring Data JPA", description: "레퍼런스 문서 문법 오류 수정", href: null },
]

export const skillGroups = [
  { title: "Backend", items: ["Java 21", "Spring Boot", "Spring Batch", "Spring Data JPA", "WebClient"] },
  { title: "Data", items: ["MySQL", "Apache Iceberg", "Nessie"] },
  { title: "Cloud & Infra", items: ["Kubernetes", "AWS", "Terraform", "Docker", "Nginx"] },
  { title: "Observability", items: ["Prometheus", "Grafana", "Loki", "Promtail"] },
  { title: "Quality & Tooling", items: ["Locust", "Playwright", "GitHub Actions", "Jenkins", "AI 개발 자동화"] },
]

export const companyProjects = [
  {
    slug: "metering",
    title: "원장 시스템 개발",
    stack: ["Java 21", "Spring Boot", "Spring Batch", "MySQL", "Kubernetes"],
    publicSummary: [
      "클라우드 사용량 과금 과정의 중복·누락 문제를 해결했습니다.",
      "원장과 체크포인트 기반으로 재실행·자동 복구 구조를 설계했습니다.",
      "시간당 20.1만 건을 7분 11초에 처리하고, 최대 53.5만 건을 유실 없이 복구했습니다.",
    ],
  },
  {
    slug: "cloudtrail",
    title: "멀티리전 Audit 기능 구현",
    stack: ["Java 21", "Spring Boot", "Spring Security", "Nginx", "Playwright"],
    publicSummary: [
      "리전마다 다르게 남던 감사 로그의 사용자·접속 정보를 동일한 형식으로 기록하도록 구현했습니다.",
      "외부에서 조작한 IP가 감사 로그에 기록되지 않도록 검증 로직을 추가했습니다.",
    ],
  },
  {
    slug: "iceberg-schema-evolution",
    title: "Iceberg 스키마 에볼루션 구현",
    stack: ["Java 21", "Spring Batch", "Apache Iceberg", "Nessie", "MySQL"],
    publicSummary: [
      "스키마 변경 시 기존 데이터와 과거 스냅샷의 호환성이 깨지는 문제를 해결했습니다.",
      "컬럼 추가만 허용하고, 이름 기반 매핑과 Iceberg 컬럼 ID 추적을 구현했습니다.",
      "다양한 호환성·CSV 추론 시나리오를 검증해 데이터를 재생성하지 않고 과거 스냅샷을 읽게 했습니다.",
    ],
  },
  {
    slug: "ai-harness",
    title: "AI 개발 검증 체계 구축",
    stack: ["AI 개발 자동화", "GitHub Actions", "Jenkins", "Playwright", "Docker"],
    publicSummary: [
      "개발자가 직접 반복하던 화면 검증을 자동화했습니다.",
      "AI 에이전트와 Playwright가 테스트를 실행하고 결과와 스크린샷을 남기도록 만들었습니다.",
      "이를 팀 공통 검증 흐름으로 도입해 코드 생산량을 약 3배로 높였습니다.",
    ],
  },
]

export const selectedProjects = [
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
  },
]

export const projects = selectedProjects
