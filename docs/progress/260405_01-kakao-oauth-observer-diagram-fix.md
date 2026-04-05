---
date: 2026-04-05
seq: 01
area: frontend, auth, bug-fix
screens: [6, 8]
tags: [kakao-oauth, observer, architecture-diagram, db-reset]
decision_keys: [KF-001, KF-004]
---

# 20260405(01) — Kakao OAuth / 옵저버 카운트 / 아키텍처 다이어그램 고정

## 한 줄 요약

Kakao OAuth 전체 흐름 구현, 옵저버 팀원 수 표기 수정, Architecture 단계에서 다이어그램이 자동 덮어써지는 버그 수정.

---

## 이번에 본 사실

- `apps/web/auth.ts`: Kakao 제공자 미설정 상태였음. `KAKAO_CLIENT_ID` 없으면 런타임 에러 없이 그냥 OAuth 버튼이 disabled 처리됨
- Kakao는 비즈앱 미승인 시 email을 제공하지 않음 → `signIn` 콜백에서 email=null로 return false 처리되어 `AccessDenied` 발생
- `nest-cli.json`에 `entryFile` 미설정 → TypeScript `paths` alias로 인해 rootDir이 monorepo 루트로 잡혀 `dist/apps/api/src/main.js` 생성, `node dist/main.js` 실패
- `packages/contracts/package.json`의 `main`이 `./src/index.ts`로 되어있어 Node.js 런타임에서 실패. 빌드 후 `./dist/index.js`로 변경 필요
- `team/[teamId]/page.tsx`: 팀원 수 표시에 옵저버가 포함되어 `expectedSize` 비교가 오염됨
- `kickoff/architecture/page.tsx`: AI 채팅 응답에 mermaidCode가 있으면 무조건 `setMermaidCode()` 호출 → Topic 단계 다이어그램 덮어씀

---

## 결정사항

| 결정 키 | 채택 | 이유 | 대안 | 영향 |
|---------|------|------|------|------|
| KF-004 | 옵저버 제외 nonObserverCount | 옵저버는 외부 관찰자, 팀 정원 아님 | 전체 포함 | 5곳 수정 (헤더, allReady, missing, dialog, progress card) |
| KF-001 | pendingMermaidCode + 명시적 업데이트 버튼 | 사용자 의도하지 않은 다이어그램 변경 방지 | 자동 적용 | architecture/page.tsx 전면 수정 |

---

## 구현 상세

### Kakao OAuth
- `apps/web/auth.ts`: Kakao provider 추가 (`process.env.KAKAO_CLIENT_ID` 조건부)
- Kakao email null 처리: `kakao_{providerAccountId}@kakao.teamforge.dev` 합성 이메일
- `apps/web/.env.local`: `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET` 추가
- `apps/web/app/login/page.tsx`: disabled 버튼 → 실제 OAuth 버튼

### API 서버 빌드 수정
- `apps/api/nest-cli.json`: `"entryFile": "apps/api/src/main"` 추가
- `packages/contracts/package.json`: `main`/`types` → `./dist/index.js` / `./dist/index.d.ts`
- `packages/contracts/` 빌드 실행 (`npx tsc`)

### 옵저버 카운트 수정 (KF-004)
```typescript
// apps/web/app/team/[teamId]/page.tsx
const nonObserverCount = members.filter((m) => m.role !== "observer").length;
// 이후 allReady, missingMembers, 헤더 표시, dialog chip 전부 nonObserverCount 사용
```

### 아키텍처 다이어그램 고정 (KF-001)
```typescript
// 신규 state/ref
const [pendingMermaidCode, setPendingMermaidCode] = useState<string | null>(null);
const diagramUpdateMode = useRef(false);

// sendMessage: mermaidCode 처리
if (res.message.mermaidCode) {
  if (diagramUpdateMode.current) {
    setMermaidCode(res.message.mermaidCode);  // 명시적 업데이트 시에만
    diagramUpdateMode.current = false;
    setPendingMermaidCode(null);
  } else {
    setPendingMermaidCode(res.message.mermaidCode);  // 대기 상태
  }
}

// "다이어그램 업데이트" 버튼
onClick={() => { diagramUpdateMode.current = true; sendMessage("..."); }}
```
- 초기 로드, auto-seed, 실시간 sync 모두 `setPendingMermaidCode`로 변경
- 다이어그램 패널: pending 있을 시 "새 제안 있음" 뱃지 (animate-pulse)

---

## 보류/미구현

| 항목 | 왜 미룸 | 재개 조건 |
|------|---------|----------|
| Screen 9 도구 세팅 | integrations 도메인 설계 필요 | KF-002 확정 후 |
| Screen 10 워크스페이스 프로비저닝 | Agent 5 (MCP) 구현 범위 큼 | Phase 5 진입 전 |
| Kakao 이름 미수집 | Kakao Developers 동의항목 설정 필요 | profile_nickname → 필수 동의 활성화 |

---

## 다음 시작점 (Next Start)

`docs/progress/20260405(02).md` 로 이어짐 — Screen 1~10 플로우 문서화 + 킥오프 보완 항목 분석.

---

## 참조 소스

- 수정 파일: `apps/web/auth.ts`, `apps/web/app/login/page.tsx`, `apps/web/app/team/[teamId]/page.tsx`, `apps/web/app/team/[teamId]/kickoff/architecture/page.tsx`
- 수정 파일: `apps/api/nest-cli.json`, `packages/contracts/package.json`
- 스펙: `docs/product/system-spec.md` §5 (User roles), §7.8 (Screen 8)
