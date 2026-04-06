import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';
import SurveyClient from './survey-client';
import AppHeader from '@/components/layout/AppHeader';

interface SurveyDraftResponse {
  answers: Record<string, unknown>;
  submitted: boolean;
  role?: string;
}

interface PageProps {
  params: { teamId: string };
}

export default async function SurveyPage({ params }: PageProps) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const { teamId } = params;

  let initialAnswers: Record<string, unknown> = {};
  let submitted = false;

  try {
    const res = await apiFetch(`/api/teams/${teamId}/survey/me`);

    if (res.status === 401) {
      redirect('/login');
    }

    if (res.status === 403) {
      // observer 역할 — 대시보드로 redirect
      redirect('/dashboard');
    }

    if (res.status === 404) {
      // 해당 팀 멤버 아님 — 대시보드로 redirect
      redirect('/dashboard');
    }

    if (res.ok) {
      const data = (await res.json()) as SurveyDraftResponse;
      // observer 역할 확인 (응답에 role 포함된 경우)
      if (data.role === 'observer') {
        redirect('/dashboard');
      }
      initialAnswers = data.answers ?? {};
      submitted = data.submitted ?? false;
    } else {
      // 기타 서버 에러 — 대시보드로 redirect
      redirect('/dashboard');
    }
  } catch {
    // API 미응답 시 대시보드로 fallback
    redirect('/dashboard');
  }

  if (submitted) {
    // 이미 제출 완료 → Screen 5 결과 페이지로
    redirect(`/team/${teamId}/result`);
  }

  const userName = session.user?.name ?? session.user?.email ?? '사용자';

  return (
    <div>
      <AppHeader userName={userName} />
      <SurveyClient
        teamId={teamId}
        initialAnswers={initialAnswers}
        submitted={submitted}
      />
    </div>
  );
}
