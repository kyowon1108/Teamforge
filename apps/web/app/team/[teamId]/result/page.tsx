import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';
import ResultClient from './result-client';
import AppHeader from '@/components/layout/AppHeader';

interface ResultResponse {
  axisScores: {
    기획력: number;
    기술력: number;
    소통력: number;
    추진력: number;
    창의력: number;
    성장력: number;
  };
  strengths: string[];
  growthAreas: string[];
  suggestedRole: string | null;
  submitted: boolean;
  submittedAt: string | null;
  roleReaction: 'ok' | 'burden' | 'prefer_other' | null;
  roleReactionNote: string | null;
}

interface PageProps {
  params: { teamId: string };
}

export default async function ResultPage({ params }: PageProps) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const { teamId } = params;

  try {
    const res = await apiFetch(`/api/teams/${teamId}/survey/result/me`);

    if (res.status === 401) {
      redirect('/login');
    }

    if (res.status === 403) {
      redirect('/dashboard');
    }

    if (res.status === 404) {
      redirect('/dashboard');
    }

    if (!res.ok) {
      redirect('/dashboard');
    }

    const data = (await res.json()) as ResultResponse;

    if (!data.submitted) {
      redirect(`/team/${teamId}/survey`);
    }

    const userName = session.user?.name ?? session.user?.email ?? '사용자';

    return (
      <div>
        <AppHeader userName={userName} />
        <ResultClient teamId={teamId} data={data} />
      </div>
    );
  } catch {
    redirect('/dashboard');
  }
}
