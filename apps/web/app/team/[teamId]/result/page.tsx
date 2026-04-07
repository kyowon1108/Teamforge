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
  blockProfile?: { strong: string[]; weak: string[] };
  roleGoodFit?: string[];
  roleAvoid?: string[];
  aiSupportPlan?: {
    primaryAreas: string[];
    verificationLevel: number;
    autonomousBlocks: string[];
  } | null;
  myRole: 'leader' | 'member';
}

interface TeamMemberWithStatus {
  userId: string;
  name: string;
  image: string | null;
  role: 'leader' | 'member' | 'observer';
  submitted: boolean | null;
  confirmedRole: string | null;
  confirmedAt: string | null;
}

interface PageProps {
  params: { teamId: string };
  searchParams: { view?: string; userId?: string };
}

export default async function ResultPage({ params, searchParams }: PageProps) {
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

    const myResult = (await res.json()) as ResultResponse;

    if (!myResult.submitted) {
      redirect(`/team/${teamId}/survey`);
    }

    // Leader: fetch team member list
    let teamMembers: TeamMemberWithStatus[] | null = null;
    if (myResult.myRole === 'leader') {
      const membersRes = await apiFetch(`/api/teams/${teamId}/kickoff/members`);
      if (membersRes.ok) {
        teamMembers = (await membersRes.json()) as TeamMemberWithStatus[];
      }
    }

    // ?view=member&userId=X — leader only, UUID 형식 검증
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const viewUserId =
      searchParams?.view === 'member' &&
      searchParams?.userId &&
      UUID_RE.test(searchParams.userId) &&
      myResult.myRole === 'leader'
        ? searchParams.userId
        : null;

    let memberResult: (ResultResponse & { targetUserName: string }) | null = null;
    if (viewUserId) {
      const memberRes = await apiFetch(`/api/teams/${teamId}/survey/result/${viewUserId}`);
      if (memberRes.ok) {
        memberResult = (await memberRes.json()) as ResultResponse & { targetUserName: string };
      }
    }

    const userName = session.user?.name ?? session.user?.email ?? '사용자';
    const myUserId = (session.user as { apiId?: string } | undefined)?.apiId;

    return (
      <div>
        <AppHeader userName={userName} />
        <ResultClient
          teamId={teamId}
          myResult={myResult}
          teamMembers={teamMembers}
          memberResult={memberResult}
          viewingUserId={viewUserId}
          myUserId={myUserId}
        />
      </div>
    );
  } catch {
    redirect('/dashboard');
  }
}
