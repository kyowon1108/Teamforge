import { test, expect } from '@playwright/test';
import { createApiClient } from '../helpers/api-client';
import { U } from '../fixtures/users';
import { TEAMS } from '../fixtures/teams';

test.describe('Screen 1+3: 인증 + 팀 생성/참가', () => {
  test('리더가 팀 목록을 조회할 수 있다', async () => {
    const api = await createApiClient(U.U01.id, U.U01.email);
    const res = await api.get('/api/teams');
    expect(res.status).toBe(200);
    const teams = await res.json();
    expect(teams.length).toBeGreaterThanOrEqual(1);
  });

  test('멤버가 같은 팀에 재가입 시도 → 409', async () => {
    // 현재 초대코드를 리더로부터 조회
    const leaderApi = await createApiClient(U.U01.id, U.U01.email);
    const teamsRes = await leaderApi.get('/api/teams');
    const teams = (await teamsRes.json()) as Array<{ teamId: string; inviteCode?: string }>;
    const teamA = teams.find((t) => t.teamId === TEAMS.A.id);
    const currentCode = teamA?.inviteCode;
    expect(currentCode).toBeTruthy();

    const api = await createApiClient(U.U03.id, U.U03.email);
    const res = await api.post('/api/teams/join', {
      inviteCode: currentCode,
      role: 'member',
    });
    // 409 (already member) 또는 429 (throttle) 둘 다 유효
    expect([409, 429]).toContain(res.status);
  });

  test('잘못된 초대코드 → 404', async () => {
    const api = await createApiClient(U.U20.id, U.U20.email);
    const res = await api.post('/api/teams/join', {
      inviteCode: 'XXXXXX',
      role: 'member',
    });
    // 404 (not found) 또는 429 (throttle)
    expect([404, 429]).toContain(res.status);
  });

  test('유저가 여러 팀에 소속될 수 있다 (U01: 팀A+C)', async () => {
    const api = await createApiClient(U.U01.id, U.U01.email);
    const res = await api.get('/api/teams');
    const teams = (await res.json()) as Array<{ teamId: string }>;
    const teamIds = teams.map((t) => t.teamId);
    expect(teamIds).toContain(TEAMS.A.id);
    expect(teamIds).toContain(TEAMS.C.id);
  });

  test('옵저버도 팀 목록을 볼 수 있다', async () => {
    const api = await createApiClient(U.U05.id, U.U05.email);
    const res = await api.get('/api/teams');
    expect(res.status).toBe(200);
    const teams = (await res.json()) as Array<{ role: string }>;
    expect(teams.some((t) => t.role === 'observer')).toBe(true);
  });

  test('초대코드 재생성 (리더만)', async () => {
    const api = await createApiClient(U.U01.id, U.U01.email);
    const res = await api.post(`/api/teams/${TEAMS.A.id}/regenerate-invite`);
    expect(res.status).toBe(200);
    const { inviteCode } = (await res.json()) as { inviteCode: string };
    expect(inviteCode).toBeTruthy();
    expect(inviteCode).not.toBe(TEAMS.A.inviteCode); // 새 코드
  });

  test('멤버는 초대코드 재생성 불가', async () => {
    const api = await createApiClient(U.U03.id, U.U03.email);
    const res = await api.post(`/api/teams/${TEAMS.A.id}/regenerate-invite`);
    expect(res.status).toBe(403);
  });
});
