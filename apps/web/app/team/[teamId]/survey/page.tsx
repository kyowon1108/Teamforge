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

    if (res.status === 403) {
      // observer 역할 — 대시보드로 redirect
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
    }
  } catch {
    // API 미응답 시 빈 답변으로 진행
  }

  if (submitted) {
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
