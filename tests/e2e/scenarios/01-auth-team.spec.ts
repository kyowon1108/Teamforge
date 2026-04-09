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

test.describe('Team Context (KF-036~KF-040)', () => {
  test('컨텍스트 없이 생성해도 200, kickoff/status에서 teamContext 모두 null', async () => {
    const api = await createApiClient(U.U20.id, U.U20.email);
    const res = await api.post('/api/teams', { name: 'NoCtx' });
    if (res.status === 403) return; // TEAM_LIMIT 가능
    expect(res.status).toBe(201);
    const { teamId } = (await res.json()) as { teamId: string };

    const statusRes = await api.get(`/api/teams/${teamId}/kickoff/status`);
    expect(statusRes.status).toBe(200);
    const data = (await statusRes.json()) as { teamContext: Record<string, unknown> | null };
    expect(data.teamContext).not.toBeNull();
    expect(data.teamContext!.teamType).toBeNull();
    expect(data.teamContext!.projectDuration).toBeNull();
    expect(data.teamContext!.completionTarget).toBeNull();
    expect(data.teamContext!.domainHints).toEqual([]);
  });

  test('컨텍스트 포함 생성 후 조회 시 7개 필드 그대로 반환', async () => {
    const api = await createApiClient(U.U20.id, U.U20.email);
    const payload = {
      name: 'CtxFull',
      teamType: 'BOOTCAMP',
      projectDuration: 'ONE_TO_THREE_MONTHS',
      completionTarget: 'MVP',
      hasNonDeveloper: true,
      usesVibeCoding: true,
      hasSkillGap: false,
      domainHints: ['AI_ML', 'EDUCATION'],
    };
    const res = await api.post('/api/teams', payload);
    if (res.status === 403) return; // TEAM_LIMIT 가능
    expect(res.status).toBe(201);
    const { teamId } = (await res.json()) as { teamId: string };

    const statusRes = await api.get(`/api/teams/${teamId}/kickoff/status`);
    expect(statusRes.status).toBe(200);
    const data = (await statusRes.json()) as {
      teamContext: {
        teamType: string;
        projectDuration: string;
        completionTarget: string;
        hasNonDeveloper: boolean;
        usesVibeCoding: boolean;
        hasSkillGap: boolean;
        domainHints: string[];
      };
    };
    expect(data.teamContext.teamType).toBe('BOOTCAMP');
    expect(data.teamContext.projectDuration).toBe('ONE_TO_THREE_MONTHS');
    expect(data.teamContext.completionTarget).toBe('MVP');
    expect(data.teamContext.hasNonDeveloper).toBe(true);
    expect(data.teamContext.usesVibeCoding).toBe(true);
    expect(data.teamContext.hasSkillGap).toBe(false);
    expect(data.teamContext.domainHints).toEqual(['AI_ML', 'EDUCATION']);
  });

  test('domainHints 3개 이상 → 422', async () => {
    const api = await createApiClient(U.U20.id, U.U20.email);
    const res = await api.post('/api/teams', {
      name: 'BadHints',
      domainHints: ['AI_ML', 'EDUCATION', 'FINTECH'],
    });
    expect([422, 403]).toContain(res.status);
  });

  test('잘못된 teamType enum → 422', async () => {
    const api = await createApiClient(U.U20.id, U.U20.email);
    const res = await api.post('/api/teams', {
      name: 'BadEnum',
      teamType: 'INVALID_VALUE',
    });
    expect([422, 403]).toContain(res.status);
  });

  test('seed 팀 A는 HACKATHON / DEMO / vibe true', async () => {
    const api = await createApiClient(U.U01.id, U.U01.email);
    const res = await api.get(`/api/teams/${TEAMS.A.id}/kickoff/status`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      teamContext: { teamType: string; completionTarget: string; usesVibeCoding: boolean; domainHints: string[] };
    };
    expect(data.teamContext.teamType).toBe('HACKATHON');
    expect(data.teamContext.completionTarget).toBe('DEMO');
    expect(data.teamContext.usesVibeCoding).toBe(true);
    expect(data.teamContext.domainHints).toEqual(expect.arrayContaining(['SOCIAL', 'AI_ML']));
  });

  test('seed 팀 E는 컨텍스트 모두 null (legacy 시뮬레이션)', async () => {
    // U13은 팀 E 멤버 (U19는 다른 테스트에서 탈퇴 가능성 있어서 U13 사용)
    const api = await createApiClient(U.U13.id, U.U13.email);
    const res = await api.get(`/api/teams/${TEAMS.E.id}/kickoff/status`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      teamContext: { teamType: string | null; domainHints: string[] };
    };
    expect(data.teamContext.teamType).toBeNull();
    expect(data.teamContext.domainHints).toEqual([]);
  });
});
