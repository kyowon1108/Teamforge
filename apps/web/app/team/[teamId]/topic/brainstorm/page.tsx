import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import BrainstormClient from './brainstorm-client';
import AppHeader from '@/components/layout/AppHeader';
import type { BrainstormIdea } from '@/components/brainstorm/IdeaCard';

interface PageProps {
  params: { teamId: string };
}

interface BrainstormSession {
  id: string;
  teamId: string;
  phase: 'ideation' | 'sharing' | 'clustering' | 'voting' | 'confirmed';
  facilitationMode?: string;
  startedAt?: string | null;
  endAt?: string | null;
}

interface TeamCapability {
  topStrengths: string[];
  weakAreas?: string[];
  aiInterestCount?: number;
  memberCount: number;
}

interface BrainstormResponse {
  session: BrainstormSession;
  ideas: BrainstormIdea[];
  teamCapability: TeamCapability | null;
  myRole?: 'leader' | 'member' | 'observer';
  currentUserId?: string;
  submittedCount?: number;
  totalMembers?: number;
}

export default async function BrainstormPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { teamId } = params;

  try {
    const res = await apiFetch(`/api/teams/${teamId}/brainstorm`);

    if (res.status === 401) redirect('/login');
    if (res.status === 403) redirect(`/team/${teamId}/dashboard`);
    if (res.status === 404) redirect(`/team/${teamId}/topic`);

    const data = (await res.json()) as BrainstormResponse;

    // If phase is voting or confirmed, redirect to topic page
    if (data.session.phase === 'voting' || data.session.phase === 'confirmed') {
      redirect(`/team/${teamId}/topic`);
    }

    const userName = session.user.name ?? session.user.email ?? '사용자';
    const userRole = data.myRole ?? 'member';

    return (
      <div>
        <AppHeader userName={userName} />
        <BrainstormClient
          teamId={teamId}
          session={data.session}
          initialIdeas={data.ideas}
          teamCapability={data.teamCapability}
          userRole={userRole}
          currentUserId={data.currentUserId}
          submittedCount={data.submittedCount}
          totalMembers={data.totalMembers}
        />
      </div>
    );
  } catch {
    redirect(`/team/${teamId}/topic`);
  }
}
