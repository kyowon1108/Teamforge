import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import JoinTeamClient from './join-team-client';

export default async function TeamJoinPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--tf-surface-background)' }}
    >
      <JoinTeamClient />
    </main>
  );
}
