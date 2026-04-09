import { test, expect } from '@playwright/test';
import { createApiClient } from '../helpers/api-client';
import { U } from '../fixtures/users';
import { TEAMS } from '../fixtures/teams';

const teamAId = TEAMS.A.id;

test.describe('Screen 6: 킥오프 대시보드', () => {
  test('킥오프 현황 조회 (모든 설문 완료 → survey_complete)', async () => {
    const api = await createApiClient(U.U01.id, U.U01.email);
    const res = await api.get(`/api/teams/${teamAId}/kickoff/status`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.phase).toBe('survey_complete');
    expect(data.surveyStats.canProceed).toBe(true);
    expect(data.members.length).toBeGreaterThan(0);
  });

  test('옵저버도 킥오프 현황 조회 가능', async () => {
    const api = await createApiClient(U.U05.id, U.U05.email);
    const res = await api.get(`/api/teams/${teamAId}/kickoff/status`);
    expect(res.status).toBe(200);
  });

  test('리더가 팀원 목록 + 설문 상태 조회', async () => {
    const api = await createApiClient(U.U01.id, U.U01.email);
    const res = await api.get(`/api/teams/${teamAId}/kickoff/members`);
    expect(res.status).toBe(200);
    const members = await res.json();
    expect(members.length).toBe(5); // leader + 3 members + 1 observer
    // observer의 submitted는 null
    const observer = members.find((m: any) => m.role === 'observer');
    expect(observer?.submitted).toBeNull();
  });

  test('멤버는 팀원 목록 조회 불가 (LEADER_ONLY)', async () => {
    const api = await createApiClient(U.U03.id, U.U03.email);
    const res = await api.get(`/api/teams/${teamAId}/kickoff/members`);
    expect(res.status).toBe(403);
  });

  test('리더가 역할 확정 가능', async () => {
    const api = await createApiClient(U.U01.id, U.U01.email);
    const res = await api.post(`/api/teams/${teamAId}/kickoff/roles/finalize`, {
      userId: U.U03.id,
      finalRole: '프론트엔드',
    });
    expect(res.status).toBe(200);
  });

  test('멤버는 역할 확정 불가', async () => {
    const api = await createApiClient(U.U03.id, U.U03.email);
    const res = await api.post(`/api/teams/${teamAId}/kickoff/roles/finalize`, {
      userId: U.U04.id,
      finalRole: '백엔드',
    });
    expect(res.status).toBe(403);
  });

  test('다른 팀의 킥오프 현황 접근 불가', async () => {
    const api = await createApiClient(U.U06.id, U.U06.email);
    const res = await api.get(`/api/teams/${teamAId}/kickoff/status`);
    expect(res.status).toBe(404);
  });
});
