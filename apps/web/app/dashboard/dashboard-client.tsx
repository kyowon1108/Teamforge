'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Users, LogOut, Plus, KeyRound, ArrowRight, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TeamSummary } from './actions';

interface DashboardClientProps {
  userName: string;
  teams: TeamSummary[];
  fetchError: string | null;
}

const ROLE_LABEL: Record<TeamSummary['role'], string> = {
  leader: '팀장',
  member: '팀원',
  observer: '옵저버',
};

const ROLE_COLOR_VAR: Record<TeamSummary['role'], string> = {
  leader: 'var(--tf-role-leader)',
  member: 'var(--tf-role-member)',
  observer: 'var(--tf-role-observer)',
};

export default function DashboardClient({ userName, teams, fetchError }: DashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOut({ callbackUrl: '/login' });
    });
  }

  return (
    <div
      className="min-h-screen font-sans"
      style={{ background: 'var(--tf-surface-background)' }}
    >
      {/* 헤더 */}
      <header
        className="sticky top-0 z-10 border-b px-4 py-3 flex items-center justify-between"
        style={{
          background: 'var(--tf-surface-card)',
          borderColor: 'var(--tf-border-subtle)',
        }}
      >
        <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--tf-text-primary)' }}>
          TeamForge
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm hidden sm:block" style={{ color: 'var(--tf-text-muted)' }}>
            {userName}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            disabled={isPending}
            aria-label="로그아웃"
            style={{ minHeight: '44px' }}
          >
            <LogOut size={16} />
            <span className="ml-1.5 hidden sm:inline">로그아웃</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 flex flex-col gap-8">
        {/* 인사 */}
        <section>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--tf-text-primary)' }}>
            안녕하세요, {userName.split(' ')[0]}님
          </h1>
          <p className="text-sm" style={{ color: 'var(--tf-text-muted)' }}>
            소속된 팀을 확인하거나 새 팀을 만드세요.
          </p>
        </section>

        {/* 팀 목록 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--tf-text-primary)' }}>
            내 팀
          </h2>

          {fetchError && (
            <p className="text-sm" style={{ color: 'var(--tf-status-error)' }} role="alert">
              {fetchError}
            </p>
          )}

          {!fetchError && teams.length === 0 && (
            <div
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-12 text-center"
              style={{ borderColor: 'var(--tf-border-subtle)' }}
            >
              <Building2 size={36} style={{ color: 'var(--tf-text-muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--tf-text-muted)' }}>
                아직 소속된 팀이 없어요
              </p>
              <p className="text-xs" style={{ color: 'var(--tf-text-muted)' }}>
                아래 버튼으로 팀을 만들거나 초대 코드로 참가하세요
              </p>
            </div>
          )}

          {teams.map((team) => {
            const colorVar = ROLE_COLOR_VAR[team.role];
            return (
              <Card
                key={team.teamId}
                style={{ borderColor: 'var(--tf-border-subtle)' }}
              >
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span
                      className="font-semibold truncate"
                      style={{ color: 'var(--tf-text-primary)' }}
                    >
                      {team.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        style={{ borderColor: colorVar, color: colorVar, fontSize: '0.7rem' }}
                      >
                        {ROLE_LABEL[team.role]}
                      </Badge>
                      <span
                        className="text-xs flex items-center gap-1"
                        style={{ color: 'var(--tf-text-muted)' }}
                      >
                        <Users size={12} />
                        {team.memberCount}명
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/team/${team.teamId}`)}
                    style={{ minHeight: '44px' }}
                  >
                    계속하기
                    <ArrowRight size={14} className="ml-1" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* CTA — 항상 표시 */}
        <section className="flex flex-col sm:flex-row gap-3">
          <Button
            className="flex-1 h-12 text-base font-semibold"
            size="lg"
            onClick={() => router.push('/team/create')}
            style={{ minHeight: '44px' }}
          >
            <Plus size={18} className="mr-2" />
            새 팀 만들기
          </Button>
          <Button
            className="flex-1 h-12 text-base font-semibold"
            size="lg"
            variant="outline"
            onClick={() => router.push('/team/join')}
            style={{ minHeight: '44px' }}
          >
            <KeyRound size={18} className="mr-2" />
            초대코드로 참가하기
          </Button>
        </section>
      </main>
    </div>
  );
}
