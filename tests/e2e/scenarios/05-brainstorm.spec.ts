import { test, expect } from '@playwright/test';
import { createApiClient } from '../helpers/api-client';
import { U } from '../fixtures/users';
import { TEAMS } from '../fixtures/teams';

const teamAId = TEAMS.A.id;

test.describe('Screen 7a: 브레인스토밍', () => {
  test('세션 조회 시 ideation phase', async () => {
    const api = await createApiClient(U.U01.id, U.U01.email);
    const res = await api.get(`/api/teams/${teamAId}/brainstorm`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.session.phase).toBe('ideation');
  });

  test('멤버가 아이디어 제출', async () => {
    const api = await createApiClient(U.U04.id, U.U04.email);
    const res = await api.post(`/api/teams/${teamAId}/brainstorm/ideas`, {
      title: '일정 관리 도구',
      description: '팀 일정 공유 대시보드',
    });
    expect(res.status).toBe(201);
    const idea = await res.json();
    expect(idea.title).toBe('일정 관리 도구');
  });

  test('옵저버는 아이디어 제출 불가', async () => {
    const api = await createApiClient(U.U05.id, U.U05.email);
    const res = await api.post(`/api/teams/${teamAId}/brainstorm/ideas`, {
      title: '테스트',
      description: '테스트',
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('OBSERVER_FORBIDDEN');
  });

  test('아이디어 5개 제한 확인', async () => {
    const api = await createApiClient(U.U03.id, U.U03.email);

    // U03은 seed에서 1개 이미 있음. 4개 더 추가하면 총 5개
    for (let i = 0; i < 4; i++) {
      const res = await api.post(`/api/teams/${teamAId}/brainstorm/ideas`, {
        title: `추가 아이디어 ${i + 1}`,
        description: `설명 ${i + 1}`,
      });
      expect(res.status).toBe(201);
    }

    // 6번째 시도 → 400
    const res = await api.post(`/api/teams/${teamAId}/brainstorm/ideas`, {
      title: '초과 아이디어',
      description: '이건 안 돼야 함',
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('IDEA_LIMIT_REACHED');
  });

  test('리더만 단계 전환 가능', async () => {
    // 멤버 시도 → 403
    const memberApi = await createApiClient(U.U03.id, U.U03.email);
    const memberRes = await memberApi.post(`/api/teams/${teamAId}/brainstorm/advance`);
    expect(memberRes.status).toBe(403);

    // 리더 시도 → 200
    const leaderApi = await createApiClient(U.U01.id, U.U01.email);
    const leaderRes = await leaderApi.post(`/api/teams/${teamAId}/brainstorm/advance`);
    expect(leaderRes.status).toBe(200);
    const data = await leaderRes.json();
    expect(data.phase).toBe('sharing');
  });

  test('sharing phase에서 빌드온 가능', async () => {
    const api = await createApiClient(U.U02.id, U.U02.email);

    // 아이디어 목록 조회
    const listRes = await api.get(`/api/teams/${teamAId}/brainstorm/ideas`);
    const listData = await listRes.json();
    const firstIdea = listData.ideas?.[0] ?? listData.myIdeas?.[0];
    expect(firstIdea).toBeDefined();

    // 빌드온
    const res = await api.post(`/api/teams/${teamAId}/brainstorm/ideas/${firstIdea.id}/build-on`, {
      title: 'AI 코드 에디터',
      description: '실시간 + AI 합체',
    });
    expect(res.status).toBe(201);
  });

  test('다른 팀의 브레인스토밍 접근 불가', async () => {
    const api = await createApiClient(U.U06.id, U.U06.email);
    const res = await api.get(`/api/teams/${teamAId}/brainstorm`);
    expect(res.status).toBe(404);
  });
});
