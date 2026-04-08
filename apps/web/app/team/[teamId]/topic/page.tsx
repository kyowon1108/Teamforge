import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import TopicDecisionClient from './topic-client';
import AppHeader from '@/components/layout/AppHeader';

interface PageProps {
  params: { teamId: string };
}

export default async function TopicPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { teamId } = params;

  try {
    // Check brainstorm session — if active and not at voting/confirmed, redirect
    try {
      const bsRes = await apiFetch(`/api/teams/${teamId}/brainstorm`);
      if (bsRes.ok) {
        const bsData = (await bsRes.json()) as {
          session?: { phase?: string };
        };
        const bsPhase = bsData.session?.phase;
        if (bsPhase && bsPhase !== 'voting' && bsPhase !== 'confirmed') {
          redirect(`/team/${teamId}/topic/brainstorm`);
        }
      }
    } catch {
      // brainstorm endpoint not available or no session — continue to topic
    }

    const res = await apiFetch(`/api/teams/${teamId}/topic`);

    if (res.status === 401) redirect('/login');
    if (res.status === 403) redirect(`/team/${teamId}/dashboard`);
    if (res.status === 404) redirect('/dashboard');

    const data = (await res.json()) as Record<string, unknown>;
    const userName = session.user.name ?? session.user.email ?? '사용자';

    return (
      <div>
        <AppHeader userName={userName} />
        <TopicDecisionClient
          teamId={teamId}
          initialData={data}
          httpStatus={res.status}
          userRole={
            (data.myRole as 'leader' | 'member' | 'observer' | undefined) ?? 'member'
          }
        />
      </div>
    );
  } catch (e) {
    // Re-throw redirect errors (Next.js NEXT_REDIRECT)
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e;
    // Check if it's a redirect response
    if (typeof e === 'object' && e !== null && 'digest' in e) throw e;
    redirect('/dashboard');
  }
}
