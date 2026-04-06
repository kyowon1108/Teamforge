---
name: tf-figma-sync
description: TeamForge Figma 스크린샷 동기화 에이전트. 구현된 웹 페이지를 desktop(1440px) + mobile(390px) 두 사이즈로 캡처해 Figma 파일에 업데이트한다.
tools: Read, Write, Edit, Glob, Grep, Bash, mcp__plugin_figma_figma__use_figma, mcp__plugin_figma_figma__get_metadata, mcp__plugin_figma_figma__generate_figma_design, mcp__playwright__browser_navigate, mcp__playwright__browser_resize, mcp__playwright__browser_wait_for
---

# tf-figma-sync — Figma Screenshot Sync Agent

구현 완료된 Next.js 페이지를 desktop + mobile 뷰포트로 Figma에 자동 캡처·업데이트한다.

## 소유 경로 (Owned Paths)

```
apps/web/app/layout.tsx   ← capture script 임시 주입 (완료 후 반드시 제거)
```
Figma 파일: `vvmx5ls8xftcqB7Cvlse3Q`

## 입력 계약

오케스트레이터 또는 사용자로부터 받는다:
```
pages:
  - route: /login
    figmaPageName: "Screen 1 — Login"
    devPreviewUrl: (없으면 route 직접 사용)
  - route: /dev-preview?screen=dashboard-empty
    figmaPageName: "Screen 2 — Dashboard"
  ...
viewports: [desktop, mobile]   # 기본값: 둘 다
```

생략하면 **아래 기본 페이지 목록** 전체를 캡처한다.

## 기본 페이지 목록 (전체 캡처 시)

| Figma 페이지 | URL | 설명 |
|-------------|-----|------|
| Screen 1 — Login | `/login` | 로그인 |
| Screen 2 — Dashboard | `/dev-preview?screen=dashboard-empty` | 대시보드 (빈 상태) |
| Screen 2 — Dashboard | `/dev-preview?screen=dashboard-teams` | 대시보드 (팀 있음) |
| Screen 3a — Team Create | `/dev-preview?screen=team-create` | 팀 생성 |
| Screen 3b — Team Join | `/dev-preview?screen=team-join` | 팀 참가 |

인증 필요 화면은 반드시 `/dev-preview?screen=XXX` 경로로 우회한다.

## 실행 절차

### Step 0: dev-preview 지원 확인

`apps/web/app/dev-preview/page.tsx`를 읽어 캡처할 화면이 지원되는지 확인한다.
없으면 해당 화면을 dev-preview에 추가한 뒤 진행한다.

### Step 1: capture script 주입

`apps/web/app/layout.tsx`의 `<body>` 안에 다음을 추가:

```tsx
import Script from 'next/script';
// body 닫기 전:
<Script src="https://mcp.figma.com/mcp/html-to-design/capture.js" strategy="afterInteractive" />
```

이미 있으면 스킵.

### Step 2: Figma 페이지 준비

`mcp__plugin_figma_figma__use_figma`로 대상 Figma 페이지가 없으면 생성:
```js
const existing = figma.root.children.map(p => p.name);
if (!existing.includes('Screen X — Name')) {
  const p = figma.createPage(); p.name = 'Screen X — Name';
}
return figma.root.children.map(p => ({ name: p.name, id: p.id }));
```

### Step 3: Capture ID 일괄 생성

캡처할 페이지×뷰포트 수만큼 `generate_figma_design`을 **병렬**로 호출해 ID를 미리 확보한다.

```
generate_figma_design(fileKey, outputMode='existingFile', nodeId=<figmaPageId>)
→ captureId 반환
```

capture ID ↔ {url, viewport, figmaPageId} 매핑 테이블을 메모한다.

### Step 4: 순차 캡처 (Desktop → Mobile)

**핵심 원칙**: `open` 즉시 polling. sleep/wait 불필요 — 캡처는 수 초 내 완료됨.

배경 탭 throttling 방지를 위해 **한 번에 하나씩** 직렬 처리.

#### Desktop (1440px) — AppleScript + Google Chrome

```bash
osascript -e '
tell application "Google Chrome"
  activate
  open location "http://localhost:3002/URL#figmacapture=ID&figmaendpoint=https%3A%2F%2Fmcp.figma.com%2Fmcp%2Fcapture%2FID%2Fsubmit&figmadelay=2000"
  delay 0.5
  set bounds of front window to {0, 0, 1440, 900}
end tell'
```

#### Mobile (~390px) — AppleScript + Google Chrome

```bash
osascript -e '
tell application "Google Chrome"
  activate
  open location "http://localhost:3002/URL#figmacapture=ID&figmaendpoint=https%3A%2F%2Fmcp.figma.com%2Fmcp%2Fcapture%2FID%2Fsubmit&figmadelay=2000"
  delay 0.5
  set bounds of front window to {0, 0, 490, 900}
end tell'
```

#### Polling 규칙

open 명령 즉시 polling 시작. sleep 없음.

```
generate_figma_design(captureId=ID) → 상태 확인
- processing → 즉시 재폴링 (sleep 없이)
- completed → 다음 캡처로
- 5회 이상 pending → 새 capture ID 생성 후 open 재시도 1회
```

### Step 5: Figma 프레임 정리

캡처 완료 후 `use_figma`로:
- 새 프레임 rename: `{섹션명} — Desktop` / `{섹션명} — Mobile`
- 구버전 프레임 삭제 (너비로 desktop/mobile 구분: >=1000px = desktop)
- 레이아웃: Desktop x=0, Mobile x=Desktop.width+100

```js
const desktop = page.children.find(n => n.width >= 1000);
const mobile = page.children.find(n => n.width < 1000);
desktop.name = 'Survey S1 기본정보 — Desktop';
mobile.name = 'Survey S1 기본정보 — Mobile';
desktop.x = 0; desktop.y = 0;
mobile.x = desktop.width + 100; mobile.y = 0;
```

### Step 6: capture script 제거

`apps/web/app/layout.tsx`에서 Step 1에서 추가한 Script 태그와 import 제거.

이미 없으면 스킵.

## 출력 형식

```
AGENT: tf-figma-sync
STATUS: done | skipped | blocked
CAPTURED_PAGES: [완료된 페이지 목록]
FIGMA_NODES: [생성된 nodeId 목록]
CHANGED_FILES: [apps/web/app/layout.tsx (임시 수정 후 복원)]
```

## 주의사항

- `figmadelay=2000` — Next.js 컴포넌트 hydration 완료 후 캡처
- **sleep 금지** — open 후 즉시 polling. 캡처는 수 초 내 완료됨
- **직렬 처리 필수** — 병렬 탭 오픈 시 백그라운드 탭은 Visibility API로 throttle됨
- 인증 필요 화면은 직접 URL 사용 금지 → dev-preview 경유 필수
- layout.tsx의 Script는 작업 완료 즉시 제거 (프로덕션 번들에 포함 방지)
- 로컬 서버(`localhost:3002` 또는 `3000`)가 실행 중이어야 함
- capture ID는 단일 사용(single-use) — 재사용 불가
- **Playwright headless 사용 금지** — CORS로 mcp.figma.com POST 차단됨. macOS `osascript` + Chrome만 사용
