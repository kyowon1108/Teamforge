/**
 * TeamForge — 킥오프 아키텍처 설계용 플랫폼 프리셋
 *
 * topic 단계에서 결정된 platformType / features / complexity 기반으로
 * architecture 단계 진입 시 기본 스택을 자동 제안하는 데 사용.
 */

export interface StackOption {
  /** 1순위 추천 */
  primary: string;
  /** 2순위 대안 */
  secondary: string;
  /** AI가 채팅에서 제안할 전체 선택지 */
  options: string[];
}

export interface PlatformPreset {
  /** 한국어 레이블 */
  label: string;
  /**
   * topic AI가 분류 시 참조하는 feature 키워드들.
   * 사용자 입력에 이 키워드가 많을수록 이 preset이 매핑될 가능성이 높음.
   */
  featureKeywords: string[];
  stacks: {
    framework: StackOption;
    styling: StackOption;
    realtime: StackOption;
    api: StackOption;
    server: StackOption;
    db: StackOption;
    auth: StackOption;
    state: StackOption;
  };
  /**
   * 이 프로젝트 타입에서 실제로 필요한 스택 카테고리 목록 (결정 권장 순서대로).
   * architecture 단계에서 AI가 이 목록 순서대로 하나씩 추천한다.
   * 불필요한 카테고리는 포함하지 않음 (예: 포트폴리오는 server/db 불필요).
   */
  applicableCategories: string[];
  /** features 배열을 받아 realtime 여부 반환 */
  realtimeNeeded: (features: string[]) => boolean;
  /** 이 플랫폼 유형에서 특히 주의할 구현 포인트 */
  notes: string;
}

// ─────────────────────────────────────────────
// 공통 선택지 풀 (여러 preset이 공유)
// ─────────────────────────────────────────────

const WEB_FRAMEWORKS = ["Next.js", "Remix", "SvelteKit", "React (Vite)", "Vue 3 (Nuxt)"];
const MOBILE_FRAMEWORKS = ["React Native (Expo)", "Flutter", "Ionic"];
const STYLING_OPTIONS = ["Tailwind CSS", "CSS Modules", "styled-components", "Chakra UI", "MUI"];
const REALTIME_OPTIONS = ["Socket.io", "WebSocket (native)", "SSE", "Firebase Realtime DB", "Supabase Realtime", "불필요"];
const REST_GRAPHQL = ["REST", "GraphQL", "tRPC", "REST + WebSocket"];
const NODE_SERVERS = ["NestJS", "Express", "Fastify", "Hono"];
const ALL_SERVERS = [...NODE_SERVERS, "FastAPI", "Spring Boot", "Django"];
const PG_OPTIONS = ["PostgreSQL + Prisma", "PostgreSQL + TypeORM", "MySQL + Prisma", "Supabase (PostgreSQL)"];
const ALL_DB = [...PG_OPTIONS, "MongoDB + Mongoose", "Firebase Firestore", "PlanetScale + Prisma"];
const WEB_AUTH = ["NextAuth.js", "Clerk", "JWT 직접 구현", "Supabase Auth", "Firebase Auth"];
const MOBILE_AUTH = ["Firebase Auth", "Supabase Auth", "Clerk", "JWT 직접 구현"];
const STATE_OPTIONS = ["Zustand", "React Query (TanStack)", "Jotai", "Redux Toolkit", "Recoil"];
const REALTIME_KEYWORDS = ["실시간", "채팅", "알림", "소켓", "live", "collaboration", "공동편집", "입찰", "게임"];

// ─────────────────────────────────────────────
// 프리셋 정의
// ─────────────────────────────────────────────

export const PLATFORM_PRESETS = {

  // ── 웹 ─────────────────────────────────────

  web_marketplace: {
    label: "웹 마켓플레이스 / 중고거래",
    featureKeywords: ["판매", "구매", "거래", "마켓", "중고", "리뷰", "결제", "상품", "카탈로그", "입찰"],
    applicableCategories: ["framework", "server", "db", "auth", "api", "realtime", "state", "styling"],
    stacks: {
      framework:  { primary: "Next.js",              secondary: "Remix",             options: WEB_FRAMEWORKS },
      styling:    { primary: "Tailwind CSS",          secondary: "CSS Modules",       options: STYLING_OPTIONS },
      realtime:   { primary: "Socket.io",             secondary: "SSE",               options: REALTIME_OPTIONS },
      api:        { primary: "REST",                  secondary: "GraphQL",           options: REST_GRAPHQL },
      server:     { primary: "NestJS",                secondary: "Express",           options: NODE_SERVERS },
      db:         { primary: "PostgreSQL + Prisma",   secondary: "Supabase (PostgreSQL)", options: PG_OPTIONS },
      auth:       { primary: "NextAuth.js",           secondary: "Clerk",             options: WEB_AUTH },
      state:      { primary: "React Query (TanStack)", secondary: "Zustand",          options: STATE_OPTIONS },
    },
    realtimeNeeded: (f) => f.some(k => [...REALTIME_KEYWORDS, "채팅", "입찰", "알림"].includes(k)),
    notes: "결제 연동(Toss Payments / Stripe) 필수. 이미지 최적화(Next.js Image)와 검색(pg_trgm 또는 Elasticsearch) 고려.",
  },

  web_sns: {
    label: "웹 SNS / 커뮤니티 플랫폼",
    featureKeywords: ["피드", "팔로우", "좋아요", "댓글", "게시글", "sns", "커뮤니티", "프로필", "해시태그", "DM"],
    applicableCategories: ["framework", "server", "db", "auth", "api", "realtime", "state", "styling"],
    stacks: {
      framework:  { primary: "Next.js",              secondary: "SvelteKit",         options: WEB_FRAMEWORKS },
      styling:    { primary: "Tailwind CSS",          secondary: "styled-components", options: STYLING_OPTIONS },
      realtime:   { primary: "Socket.io",             secondary: "Supabase Realtime", options: REALTIME_OPTIONS },
      api:        { primary: "GraphQL",               secondary: "REST",              options: REST_GRAPHQL },
      server:     { primary: "NestJS",                secondary: "Express",           options: NODE_SERVERS },
      db:         { primary: "PostgreSQL + Prisma",   secondary: "MongoDB + Mongoose", options: ALL_DB },
      auth:       { primary: "NextAuth.js",           secondary: "Clerk",             options: WEB_AUTH },
      state:      { primary: "Zustand",               secondary: "React Query (TanStack)", options: STATE_OPTIONS },
    },
    realtimeNeeded: (f) => f.some(k => ["DM", "채팅", "알림", "실시간"].includes(k)),
    notes: "GraphQL은 피드처럼 중첩 관계 쿼리가 많을 때 REST보다 유리. DM 기능이 있으면 Socket.io 필수.",
  },

  web_collaboration: {
    label: "실시간 협업 툴 (노션 / 피그마 클론 등)",
    featureKeywords: ["공동편집", "실시간", "협업", "문서", "노션", "에디터", "칸반", "보드", "댓글", "버전"],
    applicableCategories: ["framework", "server", "db", "auth", "api", "realtime", "state", "styling"],
    stacks: {
      framework:  { primary: "Next.js",              secondary: "React (Vite)",      options: WEB_FRAMEWORKS },
      styling:    { primary: "Tailwind CSS",          secondary: "CSS Modules",       options: STYLING_OPTIONS },
      realtime:   { primary: "Socket.io",             secondary: "WebSocket (native)", options: REALTIME_OPTIONS },
      api:        { primary: "REST + WebSocket",      secondary: "tRPC",              options: REST_GRAPHQL },
      server:     { primary: "NestJS",                secondary: "Fastify",           options: NODE_SERVERS },
      db:         { primary: "PostgreSQL + Prisma",   secondary: "Supabase (PostgreSQL)", options: PG_OPTIONS },
      auth:       { primary: "NextAuth.js",           secondary: "Clerk",             options: WEB_AUTH },
      state:      { primary: "Zustand",               secondary: "Jotai",             options: STATE_OPTIONS },
    },
    realtimeNeeded: () => true,
    notes: "CRDT(Yjs / Automerge) 도입 시 공동편집 충돌 해소 가능. 초기엔 Socket.io + 낙관적 업데이트로도 충분.",
  },

  web_dashboard: {
    label: "웹 대시보드 / 분석 툴",
    featureKeywords: ["차트", "분석", "통계", "대시보드", "리포트", "지표", "KPI", "모니터링", "시각화", "데이터"],
    applicableCategories: ["framework", "server", "db", "auth", "api", "state", "styling"],
    stacks: {
      framework:  { primary: "Next.js",              secondary: "React (Vite)",      options: WEB_FRAMEWORKS },
      styling:    { primary: "Tailwind CSS",          secondary: "MUI",               options: STYLING_OPTIONS },
      realtime:   { primary: "SSE",                  secondary: "Socket.io",         options: REALTIME_OPTIONS },
      api:        { primary: "REST",                  secondary: "GraphQL",           options: REST_GRAPHQL },
      server:     { primary: "NestJS",                secondary: "FastAPI",           options: ALL_SERVERS },
      db:         { primary: "PostgreSQL + Prisma",   secondary: "MySQL + Prisma",    options: PG_OPTIONS },
      auth:       { primary: "NextAuth.js",           secondary: "Clerk",             options: WEB_AUTH },
      state:      { primary: "React Query (TanStack)", secondary: "Zustand",          options: STATE_OPTIONS },
    },
    realtimeNeeded: (f) => f.some(k => ["실시간", "모니터링", "live", "알림"].includes(k)),
    notes: "Recharts / Nivo / Chart.js 중 선택 필요. 대용량 쿼리라면 서버 집계(materialized view) 고려.",
  },

  web_portfolio: {
    label: "포트폴리오 / 소개 사이트",
    featureKeywords: ["포트폴리오", "소개", "이력서", "작품", "갤러리", "랜딩", "블로그", "프로필 페이지"],
    applicableCategories: ["framework", "styling"],
    stacks: {
      framework:  { primary: "Next.js",              secondary: "SvelteKit",         options: WEB_FRAMEWORKS },
      styling:    { primary: "Tailwind CSS",          secondary: "CSS Modules",       options: STYLING_OPTIONS },
      realtime:   { primary: "불필요",                secondary: "불필요",            options: REALTIME_OPTIONS },
      api:        { primary: "REST",                  secondary: "tRPC",              options: REST_GRAPHQL },
      server:     { primary: "Next.js API Routes",   secondary: "Express",           options: [...NODE_SERVERS, "Next.js API Routes"] },
      db:         { primary: "Supabase (PostgreSQL)", secondary: "PostgreSQL + Prisma", options: ALL_DB },
      auth:       { primary: "NextAuth.js",           secondary: "Clerk",             options: WEB_AUTH },
      state:      { primary: "React Query (TanStack)", secondary: "Zustand",          options: STATE_OPTIONS },
    },
    realtimeNeeded: () => false,
    notes: "정적 사이트(SSG)로 충분. 별도 서버 없이 Next.js API Routes + Supabase 조합이 가장 간단.",
  },

  web_reservation: {
    label: "예약 / 일정 관리 서비스",
    featureKeywords: ["예약", "일정", "캘린더", "스케줄", "타임슬롯", "부킹", "취소", "알림", "리마인더"],
    applicableCategories: ["framework", "server", "db", "auth", "api", "state", "styling"],
    stacks: {
      framework:  { primary: "Next.js",              secondary: "Remix",             options: WEB_FRAMEWORKS },
      styling:    { primary: "Tailwind CSS",          secondary: "CSS Modules",       options: STYLING_OPTIONS },
      realtime:   { primary: "SSE",                  secondary: "Socket.io",         options: REALTIME_OPTIONS },
      api:        { primary: "REST",                  secondary: "tRPC",              options: REST_GRAPHQL },
      server:     { primary: "NestJS",                secondary: "Express",           options: NODE_SERVERS },
      db:         { primary: "PostgreSQL + Prisma",   secondary: "MySQL + Prisma",    options: PG_OPTIONS },
      auth:       { primary: "NextAuth.js",           secondary: "Clerk",             options: WEB_AUTH },
      state:      { primary: "React Query (TanStack)", secondary: "Zustand",          options: STATE_OPTIONS },
    },
    realtimeNeeded: (f) => f.some(k => ["실시간 예약 현황", "알림", "충돌 방지"].includes(k)),
    notes: "동시 예약 충돌 방지를 위한 낙관적 락(optimistic locking) 또는 DB 트랜잭션 필수. 알림은 이메일/SMS(Nodemailer, Twilio) 연동 고려.",
  },

  web_game: {
    label: "웹 기반 게임",
    featureKeywords: ["게임", "멀티플레이", "점수", "랭킹", "턴제", "실시간 대전", "퍼즐", "보드게임", "캐릭터", "아이템"],
    applicableCategories: ["framework", "server", "db", "auth", "api", "realtime", "state", "styling"],
    stacks: {
      framework:  { primary: "React (Vite)",         secondary: "Next.js",           options: WEB_FRAMEWORKS },
      styling:    { primary: "CSS Modules",           secondary: "Tailwind CSS",      options: STYLING_OPTIONS },
      realtime:   { primary: "Socket.io",             secondary: "WebSocket (native)", options: REALTIME_OPTIONS },
      api:        { primary: "REST + WebSocket",      secondary: "REST",              options: REST_GRAPHQL },
      server:     { primary: "Express",               secondary: "NestJS",            options: NODE_SERVERS },
      db:         { primary: "PostgreSQL + Prisma",   secondary: "MongoDB + Mongoose", options: ALL_DB },
      auth:       { primary: "JWT 직접 구현",         secondary: "NextAuth.js",        options: WEB_AUTH },
      state:      { primary: "Zustand",               secondary: "Jotai",             options: STATE_OPTIONS },
    },
    realtimeNeeded: (f) => f.some(k => ["멀티플레이", "실시간 대전", "채팅"].includes(k)),
    notes: "Canvas/WebGL(Three.js, Phaser) 필요 여부 별도 결정. 게임 로직은 서버에서 검증해야 클라이언트 치트 방지 가능.",
  },

  web_edu: {
    label: "교육 플랫폼 / LMS",
    featureKeywords: ["강의", "수강", "퀴즈", "진도", "학습", "LMS", "교육", "과제", "성적", "수료증", "피드백"],
    applicableCategories: ["framework", "server", "db", "auth", "api", "state", "styling"],
    stacks: {
      framework:  { primary: "Next.js",              secondary: "Remix",             options: WEB_FRAMEWORKS },
      styling:    { primary: "Tailwind CSS",          secondary: "MUI",               options: STYLING_OPTIONS },
      realtime:   { primary: "Socket.io",             secondary: "SSE",               options: REALTIME_OPTIONS },
      api:        { primary: "REST",                  secondary: "GraphQL",           options: REST_GRAPHQL },
      server:     { primary: "NestJS",                secondary: "Express",           options: NODE_SERVERS },
      db:         { primary: "PostgreSQL + Prisma",   secondary: "Supabase (PostgreSQL)", options: PG_OPTIONS },
      auth:       { primary: "NextAuth.js",           secondary: "Clerk",             options: WEB_AUTH },
      state:      { primary: "React Query (TanStack)", secondary: "Zustand",          options: STATE_OPTIONS },
    },
    realtimeNeeded: (f) => f.some(k => ["라이브 강의", "Q&A", "채팅"].includes(k)),
    notes: "동영상 강의라면 HLS 스트리밍(Supabase Storage / S3 + CloudFront) 필요. 진도 추적은 별도 테이블 설계 필요.",
  },

  web_healthcare: {
    label: "의료 / 헬스케어 서비스",
    featureKeywords: ["건강", "의료", "진료", "증상", "기록", "건강 데이터", "약", "의사", "환자", "BMI", "칼로리"],
    applicableCategories: ["framework", "server", "db", "auth", "api", "state", "styling"],
    stacks: {
      framework:  { primary: "Next.js",              secondary: "React (Vite)",      options: WEB_FRAMEWORKS },
      styling:    { primary: "Tailwind CSS",          secondary: "MUI",               options: STYLING_OPTIONS },
      realtime:   { primary: "SSE",                  secondary: "불필요",            options: REALTIME_OPTIONS },
      api:        { primary: "REST",                  secondary: "GraphQL",           options: REST_GRAPHQL },
      server:     { primary: "NestJS",                secondary: "FastAPI",           options: ALL_SERVERS },
      db:         { primary: "PostgreSQL + Prisma",   secondary: "MySQL + Prisma",    options: PG_OPTIONS },
      auth:       { primary: "NextAuth.js",           secondary: "JWT 직접 구현",     options: WEB_AUTH },
      state:      { primary: "React Query (TanStack)", secondary: "Zustand",          options: STATE_OPTIONS },
    },
    realtimeNeeded: (f) => f.some(k => ["원격진료", "알림", "채팅"].includes(k)),
    notes: "개인건강정보(PHI) 처리 시 암호화 저장 필수. 학교 프로젝트라면 실제 의료 데이터 대신 mock 데이터 권장.",
  },

  web_fintech: {
    label: "핀테크 / 가계부 / 결제 서비스",
    featureKeywords: ["결제", "송금", "가계부", "지출", "수입", "투자", "환율", "거래내역", "포인트", "구독"],
    applicableCategories: ["framework", "server", "db", "auth", "api", "state", "styling"],
    stacks: {
      framework:  { primary: "Next.js",              secondary: "Remix",             options: WEB_FRAMEWORKS },
      styling:    { primary: "Tailwind CSS",          secondary: "MUI",               options: STYLING_OPTIONS },
      realtime:   { primary: "SSE",                  secondary: "Socket.io",         options: REALTIME_OPTIONS },
      api:        { primary: "REST",                  secondary: "tRPC",              options: REST_GRAPHQL },
      server:     { primary: "NestJS",                secondary: "Express",           options: NODE_SERVERS },
      db:         { primary: "PostgreSQL + Prisma",   secondary: "MySQL + Prisma",    options: PG_OPTIONS },
      auth:       { primary: "JWT 직접 구현",         secondary: "NextAuth.js",        options: WEB_AUTH },
      state:      { primary: "React Query (TanStack)", secondary: "Zustand",          options: STATE_OPTIONS },
    },
    realtimeNeeded: (f) => f.some(k => ["실시간 환율", "알림", "입금 알림"].includes(k)),
    notes: "실제 결제 연동(Toss/Stripe)은 학교 프로젝트에서는 Sandbox 모드 사용. DB 트랜잭션과 이중 지불 방지 로직 필수.",
  },

  // ── 모바일 / 크로스플랫폼 ──────────────────

  mobile_social: {
    label: "모바일 소셜 앱",
    featureKeywords: ["모바일", "앱", "피드", "팔로우", "push 알림", "ios", "android", "소셜", "채팅", "스토리"],
    applicableCategories: ["framework", "server", "db", "auth", "api", "realtime", "state", "styling"],
    stacks: {
      framework:  { primary: "React Native (Expo)",  secondary: "Flutter",           options: MOBILE_FRAMEWORKS },
      styling:    { primary: "NativeWind (Tailwind)", secondary: "StyleSheet API",    options: ["NativeWind (Tailwind)", "StyleSheet API", "Restyle"] },
      realtime:   { primary: "Firebase Realtime DB", secondary: "Socket.io",         options: REALTIME_OPTIONS },
      api:        { primary: "REST",                  secondary: "GraphQL",           options: REST_GRAPHQL },
      server:     { primary: "NestJS",                secondary: "Express",           options: NODE_SERVERS },
      db:         { primary: "Firebase Firestore",    secondary: "Supabase (PostgreSQL)", options: ALL_DB },
      auth:       { primary: "Firebase Auth",         secondary: "Supabase Auth",     options: MOBILE_AUTH },
      state:      { primary: "Zustand",               secondary: "React Query (TanStack)", options: STATE_OPTIONS },
    },
    realtimeNeeded: (f) => f.some(k => ["채팅", "알림", "실시간", "DM"].includes(k)),
    notes: "Expo를 쓰면 iOS/Android 동시 개발 가능. Push 알림은 Expo Notifications 또는 Firebase FCM 사용.",
  },

  mobile_location: {
    label: "모바일 위치 기반 서비스",
    featureKeywords: ["위치", "지도", "GPS", "주변", "맛집", "배달", "길찾기", "근처", "좌표", "geofencing"],
    applicableCategories: ["framework", "server", "db", "auth", "api", "state", "styling"],
    stacks: {
      framework:  { primary: "React Native (Expo)",  secondary: "Flutter",           options: MOBILE_FRAMEWORKS },
      styling:    { primary: "NativeWind (Tailwind)", secondary: "StyleSheet API",    options: ["NativeWind (Tailwind)", "StyleSheet API"] },
      realtime:   { primary: "Socket.io",             secondary: "Supabase Realtime", options: REALTIME_OPTIONS },
      api:        { primary: "REST",                  secondary: "GraphQL",           options: REST_GRAPHQL },
      server:     { primary: "NestJS",                secondary: "Express",           options: NODE_SERVERS },
      db:         { primary: "PostgreSQL + Prisma",   secondary: "Supabase (PostgreSQL)", options: PG_OPTIONS },
      auth:       { primary: "Firebase Auth",         secondary: "NextAuth.js",        options: MOBILE_AUTH },
      state:      { primary: "Zustand",               secondary: "React Query (TanStack)", options: STATE_OPTIONS },
    },
    realtimeNeeded: (f) => f.some(k => ["실시간 위치", "배달 추적", "드라이버"].includes(k)),
    notes: "지도는 React Native Maps(Google Maps) 또는 Mapbox 사용. PostGIS 확장으로 반경 검색(ST_DWithin) 가능.",
  },

  mobile_fitness: {
    label: "피트니스 / 건강 앱",
    featureKeywords: ["운동", "피트니스", "건강", "칼로리", "걸음수", "루틴", "다이어트", "트레킹", "수면", "심박수"],
    applicableCategories: ["framework", "db", "auth", "api", "state", "styling"],
    stacks: {
      framework:  { primary: "React Native (Expo)",  secondary: "Flutter",           options: MOBILE_FRAMEWORKS },
      styling:    { primary: "NativeWind (Tailwind)", secondary: "StyleSheet API",    options: ["NativeWind (Tailwind)", "StyleSheet API"] },
      realtime:   { primary: "불필요",                secondary: "SSE",               options: REALTIME_OPTIONS },
      api:        { primary: "REST",                  secondary: "tRPC",              options: REST_GRAPHQL },
      server:     { primary: "NestJS",                secondary: "FastAPI",           options: ALL_SERVERS },
      db:         { primary: "Supabase (PostgreSQL)", secondary: "Firebase Firestore", options: ALL_DB },
      auth:       { primary: "Supabase Auth",         secondary: "Firebase Auth",     options: MOBILE_AUTH },
      state:      { primary: "Zustand",               secondary: "Jotai",             options: STATE_OPTIONS },
    },
    realtimeNeeded: () => false,
    notes: "Apple HealthKit / Google Fit 연동은 Expo에서 expo-health 또는 react-native-health 라이브러리 사용.",
  },

  // ── AI / 데이터 ────────────────────────────

  ai_chatbot: {
    label: "AI 챗봇 / 어시스턴트",
    featureKeywords: ["AI", "챗봇", "대화", "GPT", "Claude", "LLM", "프롬프트", "어시스턴트", "질문답변", "자동응답"],
    applicableCategories: ["framework", "server", "db", "auth", "api", "realtime", "styling"],
    stacks: {
      framework:  { primary: "Next.js",              secondary: "React (Vite)",      options: WEB_FRAMEWORKS },
      styling:    { primary: "Tailwind CSS",          secondary: "CSS Modules",       options: STYLING_OPTIONS },
      realtime:   { primary: "SSE",                  secondary: "WebSocket (native)", options: REALTIME_OPTIONS },
      api:        { primary: "REST",                  secondary: "tRPC",              options: REST_GRAPHQL },
      server:     { primary: "NestJS",                secondary: "FastAPI",           options: ALL_SERVERS },
      db:         { primary: "PostgreSQL + Prisma",   secondary: "Supabase (PostgreSQL)", options: PG_OPTIONS },
      auth:       { primary: "NextAuth.js",           secondary: "Clerk",             options: WEB_AUTH },
      state:      { primary: "Zustand",               secondary: "React Query (TanStack)", options: STATE_OPTIONS },
    },
    realtimeNeeded: () => true,
    notes: "스트리밍 응답(SSE)이 핵심. OpenAI / Anthropic SDK를 서버에서 호출하고 API 키는 절대 클라이언트에 노출하지 말 것.",
  },

  ai_image: {
    label: "AI 이미지 생성 / 처리 서비스",
    featureKeywords: ["이미지 생성", "AI 그림", "텍스트투이미지", "stable diffusion", "배경 제거", "이미지 편집", "갤러리"],
    applicableCategories: ["framework", "server", "db", "auth", "api", "realtime", "styling"],
    stacks: {
      framework:  { primary: "Next.js",              secondary: "React (Vite)",      options: WEB_FRAMEWORKS },
      styling:    { primary: "Tailwind CSS",          secondary: "CSS Modules",       options: STYLING_OPTIONS },
      realtime:   { primary: "SSE",                  secondary: "WebSocket (native)", options: REALTIME_OPTIONS },
      api:        { primary: "REST",                  secondary: "REST + WebSocket",  options: REST_GRAPHQL },
      server:     { primary: "FastAPI",               secondary: "NestJS",            options: ALL_SERVERS },
      db:         { primary: "PostgreSQL + Prisma",   secondary: "Supabase (PostgreSQL)", options: PG_OPTIONS },
      auth:       { primary: "NextAuth.js",           secondary: "Clerk",             options: WEB_AUTH },
      state:      { primary: "React Query (TanStack)", secondary: "Zustand",          options: STATE_OPTIONS },
    },
    realtimeNeeded: () => true,
    notes: "이미지 생성은 시간이 오래 걸리므로 비동기 job queue(Bull/BullMQ) 고려. 생성 이미지는 Supabase Storage / S3에 저장.",
  },

  ai_dashboard: {
    label: "AI 분석 / 데이터 대시보드",
    featureKeywords: ["데이터 분석", "머신러닝", "예측", "시각화", "모델", "AI 추천", "인사이트", "리포트", "정확도"],
    applicableCategories: ["framework", "server", "db", "auth", "api", "state", "styling"],
    stacks: {
      framework:  { primary: "Next.js",              secondary: "React (Vite)",      options: WEB_FRAMEWORKS },
      styling:    { primary: "Tailwind CSS",          secondary: "MUI",               options: STYLING_OPTIONS },
      realtime:   { primary: "SSE",                  secondary: "불필요",            options: REALTIME_OPTIONS },
      api:        { primary: "REST",                  secondary: "GraphQL",           options: REST_GRAPHQL },
      server:     { primary: "FastAPI",               secondary: "NestJS",            options: ALL_SERVERS },
      db:         { primary: "PostgreSQL + Prisma",   secondary: "MySQL + Prisma",    options: PG_OPTIONS },
      auth:       { primary: "NextAuth.js",           secondary: "JWT 직접 구현",     options: WEB_AUTH },
      state:      { primary: "React Query (TanStack)", secondary: "Zustand",          options: STATE_OPTIONS },
    },
    realtimeNeeded: (f) => f.some(k => ["실시간 분석", "모니터링", "스트리밍"].includes(k)),
    notes: "Python ML 모델은 FastAPI로 서빙. 차트는 Recharts / Nivo / Plotly. 대용량 데이터는 서버 집계 후 전달.",
  },

  ai_rag: {
    label: "RAG 기반 검색 / 문서 Q&A",
    featureKeywords: ["RAG", "벡터 검색", "문서 검색", "임베딩", "FAQ", "지식베이스", "파일 업로드", "PDF", "검색 증강"],
    applicableCategories: ["framework", "server", "db", "auth", "api", "styling"],
    stacks: {
      framework:  { primary: "Next.js",              secondary: "React (Vite)",      options: WEB_FRAMEWORKS },
      styling:    { primary: "Tailwind CSS",          secondary: "CSS Modules",       options: STYLING_OPTIONS },
      realtime:   { primary: "SSE",                  secondary: "불필요",            options: REALTIME_OPTIONS },
      api:        { primary: "REST",                  secondary: "tRPC",              options: REST_GRAPHQL },
      server:     { primary: "FastAPI",               secondary: "NestJS",            options: ALL_SERVERS },
      db:         { primary: "PostgreSQL + Prisma",   secondary: "Supabase (PostgreSQL)", options: PG_OPTIONS },
      auth:       { primary: "NextAuth.js",           secondary: "Clerk",             options: WEB_AUTH },
      state:      { primary: "React Query (TanStack)", secondary: "Zustand",          options: STATE_OPTIONS },
    },
    realtimeNeeded: () => true,
    notes: "pgvector 확장으로 PostgreSQL에서 벡터 검색 가능. OpenAI text-embedding-3-small으로 임베딩 생성 권장.",
  },

  // ── 기타 ──────────────────────────────────

  iot_service: {
    label: "IoT 연동 서비스",
    featureKeywords: ["IoT", "센서", "기기", "디바이스", "스마트홈", "온도", "습도", "제어", "Arduino", "Raspberry Pi"],
    applicableCategories: ["framework", "server", "db", "auth", "api", "realtime", "state", "styling"],
    stacks: {
      framework:  { primary: "Next.js",              secondary: "React (Vite)",      options: WEB_FRAMEWORKS },
      styling:    { primary: "Tailwind CSS",          secondary: "MUI",               options: STYLING_OPTIONS },
      realtime:   { primary: "Socket.io",             secondary: "WebSocket (native)", options: REALTIME_OPTIONS },
      api:        { primary: "REST + WebSocket",      secondary: "REST",              options: REST_GRAPHQL },
      server:     { primary: "NestJS",                secondary: "Express",           options: NODE_SERVERS },
      db:         { primary: "PostgreSQL + Prisma",   secondary: "MongoDB + Mongoose", options: ALL_DB },
      auth:       { primary: "JWT 직접 구현",         secondary: "NextAuth.js",        options: WEB_AUTH },
      state:      { primary: "Zustand",               secondary: "React Query (TanStack)", options: STATE_OPTIONS },
    },
    realtimeNeeded: () => true,
    notes: "디바이스 ↔ 서버 통신은 MQTT(Mosquitto) 또는 WebSocket. 시계열 데이터는 TimescaleDB 또는 InfluxDB 고려.",
  },

  crawling_tool: {
    label: "크롤링 / 자동화 수집 도구",
    featureKeywords: ["크롤링", "스크래핑", "수집", "자동화", "봇", "파싱", "가격 비교", "뉴스 수집", "모니터링"],
    applicableCategories: ["framework", "server", "db", "api", "styling"],
    stacks: {
      framework:  { primary: "Next.js",              secondary: "React (Vite)",      options: WEB_FRAMEWORKS },
      styling:    { primary: "Tailwind CSS",          secondary: "CSS Modules",       options: STYLING_OPTIONS },
      realtime:   { primary: "SSE",                  secondary: "불필요",            options: REALTIME_OPTIONS },
      api:        { primary: "REST",                  secondary: "tRPC",              options: REST_GRAPHQL },
      server:     { primary: "FastAPI",               secondary: "Express",           options: ALL_SERVERS },
      db:         { primary: "PostgreSQL + Prisma",   secondary: "MongoDB + Mongoose", options: ALL_DB },
      auth:       { primary: "JWT 직접 구현",         secondary: "NextAuth.js",        options: WEB_AUTH },
      state:      { primary: "React Query (TanStack)", secondary: "Zustand",          options: STATE_OPTIONS },
    },
    realtimeNeeded: (f) => f.some(k => ["실시간 모니터링", "알림", "라이브"].includes(k)),
    notes: "크롤러는 Python(Scrapy/Playwright)으로 별도 서비스로 분리하고 FastAPI로 트리거. robots.txt 준수 필수.",
  },

  web_ecommerce: {
    label: "이커머스 / 쇼핑몰",
    featureKeywords: ["쇼핑몰", "이커머스", "장바구니", "주문", "배송", "재고", "상품 관리", "쿠폰", "리뷰", "위시리스트"],
    applicableCategories: ["framework", "server", "db", "auth", "api", "state", "styling"],
    stacks: {
      framework:  { primary: "Next.js",              secondary: "Remix",             options: WEB_FRAMEWORKS },
      styling:    { primary: "Tailwind CSS",          secondary: "CSS Modules",       options: STYLING_OPTIONS },
      realtime:   { primary: "SSE",                  secondary: "불필요",            options: REALTIME_OPTIONS },
      api:        { primary: "REST",                  secondary: "GraphQL",           options: REST_GRAPHQL },
      server:     { primary: "NestJS",                secondary: "Express",           options: NODE_SERVERS },
      db:         { primary: "PostgreSQL + Prisma",   secondary: "MySQL + Prisma",    options: PG_OPTIONS },
      auth:       { primary: "NextAuth.js",           secondary: "Clerk",             options: WEB_AUTH },
      state:      { primary: "Zustand",               secondary: "React Query (TanStack)", options: STATE_OPTIONS },
    },
    realtimeNeeded: (f) => f.some(k => ["재고 알림", "주문 상태 추적", "라이브 커머스"].includes(k)),
    notes: "결제는 Toss Payments / Stripe. 재고 동시성 문제(oversell)는 DB 트랜잭션 + SELECT FOR UPDATE로 해결.",
  },

} as const satisfies Record<string, PlatformPreset>;

export type PlatformPresetKey = keyof typeof PLATFORM_PRESETS;

/**
 * featureKeywords 기반으로 가장 적합한 플랫폼 프리셋을 찾는 유틸.
 * topic AI 분류 결과 또는 features 배열을 전달하면 best-match 키를 반환.
 */
export function matchPlatformPreset(features: string[]): PlatformPresetKey | null {
  const normalized = features.map((f) => f.toLowerCase());
  let bestKey: PlatformPresetKey | null = null;
  let bestScore = 0;

  for (const [key, preset] of Object.entries(PLATFORM_PRESETS) as [PlatformPresetKey, PlatformPreset][]) {
    const score = preset.featureKeywords.filter((kw) =>
      normalized.some((f) => f.includes(kw.toLowerCase())),
    ).length;
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  return bestScore > 0 ? bestKey : null;
}
