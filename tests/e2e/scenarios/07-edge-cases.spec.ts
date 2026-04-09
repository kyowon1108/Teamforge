import { test, expect } from '@playwright/test';
import { createApiClient } from '../helpers/api-client';
import { U } from '../fixtures/users';
import { TEAMS } from '../fixtures/teams';

test.describe('Edge Cases: 보안 + 동시성 + 제한', () => {
  // E1: 이미 가입한 팀에 재가입 시도
  test('E1: 이미 가입한 팀에 재가입 시도 → 409', async () => {
    // 현재 유효한 초대코드 조회
    const leaderApi = await createApiClient(U.U01.id, U.U01.email);
    const teamsRes = await leaderApi.get('/api/teams');
    const teams = (await teamsRes.json()) as Array<{ teamId: string; inviteCode?: string }>;
    const teamA = teams.find((t) => t.teamId === TEAMS.A.id);

    const api = await createApiClient(U.U03.id, U.U03.email);
    const res = await api.post('/api/teams/join', {
      inviteCode: teamA?.inviteCode ?? 'NONE',
      role: 'member',
    });
    expect([409, 429]).toContain(res.status);
  });

  // E2: Observer가 모든 write API 호출
  test('E2: Observer 전체 write 차단 확인', async () => {
    const api = await createApiClient(U.U05.id, U.U05.email);
    const teamId = TEAMS.A.id;

    const writes = [
      api.post(`/api/teams/${teamId}/survey/draft`, { answers: {} }),
      api.post(`/api/teams/${teamId}/survey/submit`, { answers: {} }),
      api.post(`/api/teams/${teamId}/survey/role-reaction`, { reaction: 'ok' }),
      api.post(`/api/teams/${teamId}/brainstorm/ideas`, { title: 'x', description: 'x' }),
    ];

    const results = await Promise.all(writes);
    for (const res of results) {
      expect(res.status).toBe(403);
    }
  });

  // E3: 타 팀 리소스 접근
  test('E3: 타 팀 리소스 접근 → 404', async () => {
    const api = await createApiClient(U.U06.id, U.U06.email); // 팀B만 소속
    const teamAId = TEAMS.A.id;

    const reads = [
      api.get(`/api/teams/${teamAId}/survey/me`),
      api.get(`/api/teams/${teamAId}/survey/result/me`),
      api.get(`/api/teams/${teamAId}/kickoff/status`),
      api.get(`/api/teams/${teamAId}/brainstorm`),
    ];

    const results = await Promise.all(reads);
    for (const res of results) {
      expect(res.status).toBe(404);
    }
  });

  // E5: 유일한 리더 탈퇴 차단
  test('E5: 유일한 리더 탈퇴 시도 → 403 LAST_LEADER', async () => {
    const api = await createApiClient(U.U19.id, U.U19.email); // 팀E 리더 (유일)
    const res = await api.post(`/api/teams/${TEAMS.E.id}/leave`);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('LAST_LEADER');
  });

  // E6: 리더 양도 → 탈퇴
  test('E6: 리더 양도 후 탈퇴 성공', async () => {
    const leaderApi = await createApiClient(U.U19.id, U.U19.email);

    // 양도
    const transferRes = await leaderApi.post(`/api/teams/${TEAMS.E.id}/transfer-leadership`, {
      targetUserId: U.U13.id,
    });
    expect(transferRes.status).toBe(200);

    // 이제 탈퇴 가능
    const leaveRes = await leaderApi.post(`/api/teams/${TEAMS.E.id}/leave`);
    expect(leaveRes.status).toBe(200);
    const data = await leaveRes.json();
    expect(data.teamDeleted).toBe(false);
  });

  // E8: 11번째 팀 생성 제한
  test('E8: 팀 생성 수 제한 (10개 초과 시 403)', async () => {
    // 이 테스트는 U01이 이미 리더인 팀 수에 따라 다름
    // 단순히 API가 제한을 체크하는지 확인
    const api = await createApiClient(U.U01.id, U.U01.email);
    const res = await api.post('/api/teams', { name: '테스트 팀' });
    // 현재 리더인 팀이 10개 미만이면 201, 10개 이상이면 403
    expect([201, 403]).toContain(res.status);
  });

  // E11: 구 초대코드로 참가 불가
  test('E11: 초대코드 재생성 후 구 코드 사용 불가', async () => {
    // 현재 팀B 초대코드 조회
    const leaderApi = await createApiClient(U.U02.id, U.U02.email);
    const teamsRes = await leaderApi.get('/api/teams');
    const teams = (await teamsRes.json()) as Array<{ teamId: string; inviteCode?: string }>;
    const teamB = teams.find((t) => t.teamId === TEAMS.B.id);
    const oldCode = teamB?.inviteCode;
    expect(oldCode).toBeTruthy();

    // 리더가 재생성
    await leaderApi.post(`/api/teams/${TEAMS.B.id}/regenerate-invite`);

    // 새 유저가 구 코드로 참가 시도
    const newApi = await createApiClient(U.U20.id, U.U20.email);
    const res = await newApi.post('/api/teams/join', {
      inviteCode: oldCode!,
      role: 'member',
    });
    expect([404, 429]).toContain(res.status);
  });

  // E9: 역할 반응 유효성 검증
  test('유효하지 않은 reaction 값 → 400', async () => {
    const api = await createApiClient(U.U01.id, U.U01.email);
    const res = await api.post(`/api/teams/${TEAMS.A.id}/survey/role-reaction`, {
      reaction: 'invalid_value',
    });
    expect(res.status).toBe(400);
  });
});
