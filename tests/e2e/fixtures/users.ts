/**
 * 20명 테스트 유저 프로필.
 * deterministic UUID로 seed/테스트에서 동일하게 참조.
 */
export const USERS = [
  { id: '00000000-0000-4000-a000-000000000001', email: 'kw@test.com', name: '이교원' },
  { id: '00000000-0000-4000-a000-000000000002', email: 'mj@test.com', name: '김민준' },
  { id: '00000000-0000-4000-a000-000000000003', email: 'sy@test.com', name: '박서연' },
  { id: '00000000-0000-4000-a000-000000000004', email: 'jh@test.com', name: '최지훈' },
  { id: '00000000-0000-4000-a000-000000000005', email: 'yw@test.com', name: '정예원' },
  { id: '00000000-0000-4000-a000-000000000006', email: 'sr@test.com', name: '한소율' },
  { id: '00000000-0000-4000-a000-000000000007', email: 'js@test.com', name: '오준서' },
  { id: '00000000-0000-4000-a000-000000000008', email: 'he@test.com', name: '임하은' },
  { id: '00000000-0000-4000-a000-000000000009', email: 'ty@test.com', name: '송태영' },
  { id: '00000000-0000-4000-a000-000000000010', email: 'cw@test.com', name: '윤채원' },
  { id: '00000000-0000-4000-a000-000000000011', email: 'dh@test.com', name: '강도현' },
  { id: '00000000-0000-4000-a000-000000000012', email: 'es@test.com', name: '조은서' },
  { id: '00000000-0000-4000-a000-000000000013', email: 'sj@test.com', name: '배수진' },
  { id: '00000000-0000-4000-a000-000000000014', email: 'ja@test.com', name: '류지안' },
  { id: '00000000-0000-4000-a000-000000000015', email: 'mje@test.com', name: '황민재' },
  { id: '00000000-0000-4000-a000-000000000016', email: 'sa@test.com', name: '문서아' },
  { id: '00000000-0000-4000-a000-000000000017', email: 'wj@test.com', name: '신우진' },
  { id: '00000000-0000-4000-a000-000000000018', email: 'sm@test.com', name: '전소미' },
  { id: '00000000-0000-4000-a000-000000000019', email: 'ny@test.com', name: '권나영' },
  { id: '00000000-0000-4000-a000-000000000020', email: 'sh@test.com', name: '양승호' },
] as const;

export type TestUser = (typeof USERS)[number];

/** 유저 ID 헬퍼 */
export const U = Object.fromEntries(
  USERS.map((u, i) => [`U${String(i + 1).padStart(2, '0')}`, u])
) as Record<string, TestUser>;
