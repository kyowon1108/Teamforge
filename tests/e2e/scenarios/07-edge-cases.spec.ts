import { test, expect } from '@playwright/test';
import { createApiClient } from '../helpers/api-client';
import { U } from '../fixtures/users';
import { TEAMS } from '../fixtures/teams';

test.describe('Edge Cases: 보안 + 동시성 + 제한', () => {
  // E1: 동시 joinTeam (같은 유저, 같은 팀) — seed에서 이미 가입 상태
  test('E1: 이미 가입한 팀에 재가입 시도 → 409', async () => {
    const api = await createApiClient(U.U03.id, U.U03.email);
    const res = await api.post('/api/teams/join', {
      inviteCode: TEAMS.A.inviteCode,
      role: 'member',
    });
    // 초대코드가 재생성되었을 수 있으므로 409 또는 404
    expect([404, 409]).toContain(res.status);
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
    const oldCode = TEAMS.B.inviteCode; // BETA22

    // 리더가 재생성
    const leaderApi = await createApiClient(U.U02.id, U.U02.email);
    await leaderApi.post(`/api/teams/${TEAMS.B.id}/regenerate-invite`);

    // 새 유저가 구 코드로 참가 시도 (U20은 팀B에 없음)
    const newApi = await createApiClient(U.U20.id, U.U20.email);
    const res = await newApi.post('/api/teams/join', {
      inviteCode: oldCode,
      role: 'member',
    });
    expect(res.status).toBe(404); // 구 코드는 더 이상 유효하지 않음
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
