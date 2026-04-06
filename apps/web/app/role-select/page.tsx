import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import RoleSelectClient from './role-select-client';

export default async function RoleSelectPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  // 세션에 teamId가 있으면 이미 팀에 소속 → 대시보드로
  const teamId = (session.user as { teamId?: string }).teamId;
  if (teamId) {
    redirect(`/team/${teamId}`);
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--tf-surface-background)' }}
    >
      <RoleSelectClient />
    </main>
  );
}
