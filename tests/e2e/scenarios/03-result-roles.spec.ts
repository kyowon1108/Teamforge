import { test, expect } from '@playwright/test';
import { createApiClient } from '../helpers/api-client';
import { U } from '../fixtures/users';
import { TEAMS } from '../fixtures/teams';

const teamAId = TEAMS.A.id;

test.describe('Screen 5: 결과 조회 + 역할', () => {
  test('제출자가 자기 결과를 조회할 수 있다', async () => {
    const api = await createApiClient(U.U01.id, U.U01.email);
    const res = await api.get(`/api/teams/${teamAId}/survey/result/me`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.axisScores).toBeDefined();
    expect(data.strengths.length).toBeGreaterThan(0);
  });

  test('옵저버는 결과 조회 불가', async () => {
    const api = await createApiClient(U.U05.id, U.U05.email);
    const res = await api.get(`/api/teams/${teamAId}/survey/result/me`);
    expect(res.status).toBe(403);
  });

  test('리더가 팀원 결과를 조회할 수 있다', async () => {
    const api = await createApiClient(U.U01.id, U.U01.email);
    const res = await api.get(`/api/teams/${teamAId}/survey/result/${U.U02.id}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.targetUserName).toBeDefined();
  });

  test('멤버는 다른 팀원 결과 조회 불가 (LEADER_ONLY)', async () => {
    const api = await createApiClient(U.U03.id, U.U03.email);
    const res = await api.get(`/api/teams/${teamAId}/survey/result/${U.U02.id}`);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('LEADER_ONLY');
  });

  test('역할 반응을 저장할 수 있다', async () => {
    const api = await createApiClient(U.U01.id, U.U01.email);
    const res = await api.post(`/api/teams/${teamAId}/survey/role-reaction`, {
      reaction: 'ok',
      note: '잘 맞는 것 같아요',
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.roleReaction).toBe('ok');
  });

  test('옵저버는 역할 반응 불가', async () => {
    const api = await createApiClient(U.U05.id, U.U05.email);
    const res = await api.post(`/api/teams/${teamAId}/survey/role-reaction`, {
      reaction: 'ok',
    });
    expect(res.status).toBe(403);
  });
});
