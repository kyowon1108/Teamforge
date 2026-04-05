---
date: YYYY-MM-DD
version: v1.0
area: auth | team | survey | kickoff | meeting | changes
status: draft | stable | deprecated
---

# API 계약 — [모듈명]

## 엔드포인트 목록

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/module/path` | | JWT |
| POST | `/module/path` | | JWT |

---

## [메서드] [경로]

### Request

```typescript
// Headers
Authorization: Bearer {accessToken}

// Body
{
  field: type  // 설명
}
```

### Response 200

```typescript
{
  field: type
}
```

### Error 응답

| HTTP | 에러 코드 | 설명 |
|------|----------|------|
| 400 | ERROR_CODE | |
| 401 | UNAUTHORIZED | |
| 404 | NOT_FOUND | |
| 409 | CONFLICT | |

### 비즈니스 규칙

- 규칙 1
- 규칙 2

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|---------|
| v1.0 | YYYY-MM-DD | 초안 |
