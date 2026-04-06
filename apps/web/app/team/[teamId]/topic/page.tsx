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
  } catch {
    redirect('/dashboard');
  }
}
