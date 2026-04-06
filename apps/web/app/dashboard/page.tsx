import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listTeamsAction } from './actions';
import DashboardClient from './dashboard-client';
import AppHeader from '@/components/layout/AppHeader';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const { error, teams } = await listTeamsAction();

  const userName = session.user?.name ?? session.user?.email ?? '사용자';

  return (
    <div className="min-h-screen" style={{ background: 'var(--tf-surface-background)' }}>
      <AppHeader userName={userName} />
      <DashboardClient userName={userName} teams={teams} fetchError={error} />
    </div>
  );
}
