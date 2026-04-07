import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';
import KickoffDashboardClient from './kickoff-dashboard-client';
import AppHeader from '@/components/layout/AppHeader';

export interface KickoffMember {
  userId: string;
  name: string | null;
  role: 'leader' | 'member' | 'observer';
  submitted: boolean | null;
  image: string | null;
}

export interface TeamInsight {
  avgAxisScores: {
    기획력: number;
    기술력: number;
    소통력: number;
    추진력: number;
    창의력: number;
    성장력: number;
  };
  topAxes: string[];
  bottomAxis: string;
  roleDistribution: Record<string, number>;
  blockCoverage?: Record<string, 'covered' | 'partial' | 'gap'>;
  teamCollabScore?: number;
  aiNeedBlocks?: string[];
  teamRisks?: string[];
}

export interface KickoffStatusResponse {
  phase: 'survey_in_progress' | 'survey_complete';
  surveyStats: {
    total: number;
    submitted: number;
    canProceed: boolean;
  };
  members: KickoffMember[];
  myRole: 'leader' | 'member' | 'observer';
  teamInsight: TeamInsight | null;
}

interface PageProps {
  params: { teamId: string };
}

export default async function KickoffDashboardPage({ params }: PageProps) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const { teamId } = params;

  try {
    const res = await apiFetch(`/api/teams/${teamId}/kickoff/status`);

    if (res.status === 401) {
      redirect('/login');
    }

    if (res.status === 403 || res.status === 404) {
      redirect('/dashboard');
    }

    if (!res.ok) {
      redirect('/dashboard');
    }

    const data = (await res.json()) as KickoffStatusResponse;
    const userName = session.user?.name ?? session.user?.email ?? '사용자';

    return (
      <div>
        <AppHeader userName={userName} />
        <KickoffDashboardClient teamId={teamId} data={data} />
      </div>
    );
  } catch {
    redirect('/dashboard');
  }
}
