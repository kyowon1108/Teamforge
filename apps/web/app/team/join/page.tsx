import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import JoinTeamClient from './join-team-client';
import AppHeader from '@/components/layout/AppHeader';

export default async function TeamJoinPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const userName = session.user?.name ?? session.user?.email ?? '사용자';

  return (
    <div className="min-h-screen font-sans" style={{ background: 'var(--tf-surface-background)' }}>
      <AppHeader userName={userName} />
      <main
        className="flex items-center justify-center p-4"
        style={{ minHeight: 'calc(100vh - var(--tf-app-header-height))' }}
      >
        <JoinTeamClient />
      </main>
    </div>
  );
}
