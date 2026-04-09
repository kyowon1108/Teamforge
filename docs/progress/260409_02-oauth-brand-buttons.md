# 260409_02-oauth-brand-buttons

## 작업 요약

- Playwright MCP로 Kakao Developers 콘솔(앱 ID 1423308)에 직접 접속해 REST API 키, Client Secret, Redirect URI, 동의 항목 권한 상태를 점검했고, 이메일/이름 권한이 비즈앱 등록 전에는 불가하다는 사실을 재확인했다.
- Screen 1 Login의 OAuth 3종(Google/GitHub/Kakao) 버튼을 각 서비스 공식 브랜드 가이드에 맞춰 재설계했다. 공식 SVG 로고 3개를 `apps/web/public/oauth-logos/`에 추가하고, OAuth 전용 시맨틱 토큰 7개를 `globals.css`에 신설했다.
- Screen 1 Login 페이지를 desktop(1440px) + mobile(390px)로 Figma에 재캡처했고, 레거시 프레임은 제거했다.
- TypeScript API/Web 0 errors, tf-supervisor 도메인 침범 없음, tf-security G1~G10 모두 PASS, SVG 3종 모두 안전(`<script>`/`<foreignObject>`/이벤트 핸들러 없음)으로 검증되어 `next/image`가 image context로 렌더링하므로 `dangerouslyAllowSVG` 옵션 추가도 필요 없었다.

## 구현된 기능

### Kakao 콘솔 점검 (코드 변경 없음)

| 항목 | 상태 |
| --- | --- |
| REST API 키 `3db2de7c31b37c34d5e81493a921629f` | `.env`와 일치 |
| Client Secret `FNAK6f80QU666LncGAXETlS49Ktp6Ijh` | 활성화, `.env`와 일치 |
| Redirect URI `http://localhost:3000/api/auth/callback/kakao` | 등록 완료 |
| 카카오 로그인 활성화 | ON |
| `profile_nickname` 동의 | 필수 동의 |
| `profile_image` 동의 | 사용 안 함에서 선택 동의로 변경 |
| `account_email` 동의 | 권한 없음 (비즈앱 등록 + 추가 기능 신청 필요) |
| `name` 동의 | 권한 없음 (비즈앱 등록 + 추가 기능 신청 필요) |

- 이메일/이름 정식 수집 경로는 비즈앱 심사 통과 전에는 불가하므로, NextAuth Kakao provider의 합성 이메일(`kakao_<id>@teamforge.local`) + 닉네임 fallback 정책을 그대로 유지한다.
- `apps/web/lib/auth.ts:36-44`의 fallback 로직은 이미 닉네임을 `name`으로 매핑하고 합성 이메일을 생성하므로 코드 변경은 발생하지 않았다.

### OAuth 브랜드 로고 자산 (신규)

| 파일 | 변경 |
| --- | --- |
| `apps/web/public/oauth-logos/google.svg` | 신규. 4-color G logo, 공식 가이드 색상 (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`) |
| `apps/web/public/oauth-logos/github.svg` | 신규. GitHub Mark, 단색 (`#181717` light context용) |
| `apps/web/public/oauth-logos/kakao.svg` | 신규. 카카오톡 말풍선, 단색 (`#000000` on `#FEE500`) |

- 세 SVG 모두 `<script>`, `<foreignObject>`, 이벤트 핸들러 속성을 포함하지 않아 tf-security가 안전 자산으로 분류했다.
- `next/image`로 로딩하므로 SVG는 image context에서 렌더링되며 JS 실행 경로가 존재하지 않는다. `next.config.mjs`의 `dangerouslyAllowSVG` 옵션을 추가하지 않는다.

### OAuth 시맨틱 토큰 (CSS)

| 파일 | 변경 |
| --- | --- |
| `apps/web/app/globals.css` | OAuth 시맨틱 토큰 7개 신설: `--tf-oauth-google-bg`, `--tf-oauth-google-border`, `--tf-oauth-google-text`, `--tf-oauth-github-bg`, `--tf-oauth-github-text`, `--tf-oauth-kakao-bg`, `--tf-oauth-kakao-text`. 기존 `--tf-kakao-yellow` / `--tf-kakao-text`는 legacy alias로 유지해 dev-preview/Storybook 호환을 깨지 않는다 |

- raw hex는 `globals.css` 한 곳에만 머무르고, 컴포넌트는 시맨틱 토큰만 참조한다.
- Lucide 아이콘 단일 사용 원칙(KF-040)의 예외로 OAuth 브랜드 로고는 공식 SVG 자산을 사용한다는 점을 KF-041에 명시한다.

### Login 페이지 UI

| 파일 | 변경 |
| --- | --- |
| `apps/web/app/login/page.tsx` | OAuth 3 버튼 마크업 재구성. `next/image`로 SVG 로딩, 공식 색상은 OAuth 시맨틱 토큰을 통해 적용, border-radius 6px, 높이 44px로 통일 |
| `apps/web/app/dev-preview/page.tsx` | login mock을 새 버튼 마크업과 동기화 |

### Figma 재캡처

- Screen 1 — Login (page `21:9`)
  - `430:2` "Login — Desktop" (1440 × 813)
  - `431:2` "Login — Mobile" (490 × 813)
- 레거시 프레임 `194:2`, `195:2` 제거.

### 검증 결과

- TypeScript: API 0 errors / Web 0 errors
- tf-supervisor: violations none, ok-to-commit
- tf-security: G1~G10 모두 PASS, SVG 자산 3종 안전, `dangerouslyAllowSVG` 불필요

## 설계 결정

- `KF-041`: OAuth 브랜드 로고는 Lucide React 단일 사용 원칙의 명시적 예외로 처리한다. 공식 SVG 자산을 `apps/web/public/oauth-logos/`에 두고 `next/image`로 로딩하며, Lucide에는 해당 브랜드 마크가 존재하지 않거나 가이드라인 위반이 되는 사례를 회피한다.
- `KF-042`: OAuth 브랜드 색상은 raw hex로 컴포넌트에 직접 박지 않고 OAuth 전용 시맨틱 토큰(`--tf-oauth-<provider>-bg|border|text`)으로 격리한다. 기존 `--tf-kakao-yellow` / `--tf-kakao-text`는 호환을 위해 legacy alias로 유지한다.
- `KF-043`: Kakao Developers 콘솔의 `account_email`, `name` 권한은 비즈앱 등록 + 추가 기능 신청 + 심사 통과가 필요하므로, 그 전까지는 합성 이메일(`kakao_<id>@teamforge.local`) + 닉네임 fallback 정책을 유지한다. NextAuth Kakao provider 코드는 변경하지 않는다.

## 미완료 항목

- 비즈앱 등록 절차는 사용자 직접 작업 영역이라 진행하지 않았다. 등록과 추가 기능 신청 심사가 통과되면 NextAuth Kakao provider의 합성 이메일 fallback 분기 제거를 검토할 수 있다.
- `--tf-kakao-yellow` / `--tf-kakao-text` legacy alias는 dev-preview/Storybook 호환을 위해 남겨두었으며, OAuth 시맨틱 토큰만 참조하는 형태로 정리되면 후속 세션에서 alias 제거를 검토한다.

## 다음 시작 포인트

- 비즈앱 등록 절차(사용자 직접) → 이메일/이름 정식 수집 경로 활성화 검토. 통과 후 NextAuth Kakao provider의 합성 이메일 fallback 분기 정리.
- 또는 Screen 8 (`/team/[teamId]/structure` + `/stack`) 진입. Team Context KF-036~040과 OAuth 브랜드 토큰 KF-041~042를 기반으로 새 페이지 디자인 토큰을 일관되게 가져갈 수 있다.
