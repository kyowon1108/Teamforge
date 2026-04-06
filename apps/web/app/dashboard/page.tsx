import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listTeamsAction } from './actions';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const { error, teams } = await listTeamsAction();

  const userName = session.user?.name ?? session.user?.email ?? '사용자';

  return (
    <DashboardClient
      userName={userName}
      teams={teams}
      fetchError={error}
    />
  );
}
