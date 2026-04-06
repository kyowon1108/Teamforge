import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import TeamSetupClient from './team-setup-client';

interface JoinOrCreatePageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function JoinOrCreatePage({ searchParams }: JoinOrCreatePageProps) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const { tab } = await searchParams;
  const initialTab = tab === 'join' ? 'join' : 'create';

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--tf-surface-background)' }}
    >
      <TeamSetupClient initialTab={initialTab as 'create' | 'join'} />
    </main>
  );
}
