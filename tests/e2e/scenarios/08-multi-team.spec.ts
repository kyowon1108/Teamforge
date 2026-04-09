import { test, expect } from '@playwright/test';
import { createApiClient } from '../helpers/api-client';
import { U } from '../fixtures/users';
import { TEAMS } from '../fixtures/teams';

test.describe('Multi-team: 겹치는 유저의 팀 간 데이터 격리', () => {
  test('U02가 팀A와 팀B에서 각각 다른 설문 결과를 갖는다', async () => {
    const api = await createApiClient(U.U02.id, U.U02.email);

    const resA = await api.get(`/api/teams/${TEAMS.A.id}/survey/result/me`);
    const resB = await api.get(`/api/teams/${TEAMS.B.id}/survey/result/me`);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const dataA = await resA.json();
    const dataB = await resB.json();

    // 둘 다 submitted 상태
    expect(dataA.submitted).toBe(true);
    expect(dataB.submitted).toBe(true);
  });

  test('U02는 팀A에서 member, 팀B에서 leader', async () => {
    const api = await createApiClient(U.U02.id, U.U02.email);
    const res = await api.get('/api/teams');
    const teams = (await res.json()) as Array<{ teamId: string; role: string }>;

    const teamA = teams.find((t) => t.teamId === TEAMS.A.id);
    const teamB = teams.find((t) => t.teamId === TEAMS.B.id);

    expect(teamA?.role).toBe('member');
    expect(teamB?.role).toBe('leader');
  });

  test('U02는 팀A의 팀원 결과를 열람 불가 (member), 팀B에서는 가능 (leader)', async () => {
    const api = await createApiClient(U.U02.id, U.U02.email);

    // 팀A: member → LEADER_ONLY
    const resA = await api.get(`/api/teams/${TEAMS.A.id}/survey/result/${U.U03.id}`);
    expect(resA.status).toBe(403);

    // 팀B: leader → OK
    const resB = await api.get(`/api/teams/${TEAMS.B.id}/survey/result/${U.U06.id}`);
    expect(resB.status).toBe(200);
  });

  test('U08이 팀B와 팀D 각각 킥오프 현황 조회', async () => {
    const api = await createApiClient(U.U08.id, U.U08.email);

    const resB = await api.get(`/api/teams/${TEAMS.B.id}/kickoff/status`);
    const resD = await api.get(`/api/teams/${TEAMS.D.id}/kickoff/status`);

    expect(resB.status).toBe(200);
    expect(resD.status).toBe(200);
  });

  test('U01이 팀A 브레인스토밍과 팀C 접근 모두 가능', async () => {
    const api = await createApiClient(U.U01.id, U.U01.email);

    const resA = await api.get(`/api/teams/${TEAMS.A.id}/brainstorm`);
    expect(resA.status).toBe(200);

    // 팀C에는 brainstorm 세션이 없으므로 자동 생성됨
    const resC = await api.get(`/api/teams/${TEAMS.C.id}/brainstorm`);
    expect(resC.status).toBe(200);
  });

  test('inviteCode는 리더에게만 노출된다', async () => {
    const api = await createApiClient(U.U02.id, U.U02.email);
    const res = await api.get('/api/teams');
    const teams = (await res.json()) as Array<{ teamId: string; role: string; inviteCode?: string }>;

    const teamA = teams.find((t) => t.teamId === TEAMS.A.id);
    const teamB = teams.find((t) => t.teamId === TEAMS.B.id);

    expect(teamA?.inviteCode).toBeUndefined(); // member
    expect(teamB?.inviteCode).toBeDefined();   // leader
  });
});
