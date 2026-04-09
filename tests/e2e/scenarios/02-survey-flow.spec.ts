import { test, expect } from '@playwright/test';
import { createApiClient } from '../helpers/api-client';
import { U } from '../fixtures/users';
import { TEAMS } from '../fixtures/teams';
import { SURVEY_TEMPLATES } from '../fixtures/survey-answers';

const teamAId = TEAMS.A.id;

test.describe('Screen 4: 설문 플로우', () => {
  test('제출된 설문을 조회할 수 있다', async () => {
    const api = await createApiClient(U.U01.id, U.U01.email);
    const res = await api.get(`/api/teams/${teamAId}/survey/me`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.submitted).toBe(true);
  });

  test('이미 제출된 설문은 재제출해도 덮어쓰지 않는다', async () => {
    const api = await createApiClient(U.U01.id, U.U01.email);
    const res = await api.post(`/api/teams/${teamAId}/survey/submit`, {
      answers: SURVEY_TEMPLATES.executor, // 다른 답변으로 시도
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.submitted).toBe(true); // idempotent
  });

  test('옵저버는 설문 제출 불가', async () => {
    const api = await createApiClient(U.U05.id, U.U05.email);
    const res = await api.post(`/api/teams/${teamAId}/survey/submit`, {
      answers: SURVEY_TEMPLATES.documenter,
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('OBSERVER_FORBIDDEN');
  });

  test('옵저버는 draft 저장도 불가', async () => {
    const api = await createApiClient(U.U05.id, U.U05.email);
    const res = await api.post(`/api/teams/${teamAId}/survey/draft`, {
      answers: SURVEY_TEMPLATES.documenter,
    });
    expect(res.status).toBe(403);
  });

  test('다른 팀의 설문에 접근 불가', async () => {
    // U06은 팀B 소속, 팀A에 접근 시도
    const api = await createApiClient(U.U06.id, U.U06.email);
    const res = await api.get(`/api/teams/${teamAId}/survey/me`);
    expect(res.status).toBe(404); // MEMBERSHIP_NOT_FOUND
  });

  test('한 유저가 다른 팀에서 각각 설문 제출 (U02: 팀A+B)', async () => {
    const api = await createApiClient(U.U02.id, U.U02.email);

    const resA = await api.get(`/api/teams/${TEAMS.A.id}/survey/me`);
    expect(resA.status).toBe(200);
    const dataA = await resA.json();
    expect(dataA.submitted).toBe(true);

    const resB = await api.get(`/api/teams/${TEAMS.B.id}/survey/me`);
    expect(resB.status).toBe(200);
    const dataB = await resB.json();
    expect(dataB.submitted).toBe(true);
  });
});
