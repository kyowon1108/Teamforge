import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import CreateTeamClient from './create-team-client';

export default async function TeamCreatePage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--tf-surface-background)' }}
    >
      <CreateTeamClient />
    </main>
  );
}
