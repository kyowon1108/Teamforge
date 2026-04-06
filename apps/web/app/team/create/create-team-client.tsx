'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createTeamAction } from '@/app/team/join-or-create/actions';

export default function CreateTeamClient() {
  const router = useRouter();
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const nameError =
    teamName.length > 0 && (teamName.length < 2 || teamName.length > 50)
      ? '팀 이름은 2~50자여야 합니다.'
      : null;

  function handleCreate() {
    if (teamName.length < 2 || teamName.length > 50) return;
    setError(null);

    startTransition(async () => {
      try {
        const result = await createTeamAction(teamName);
        if (result.error) {
          setError(result.error);
          return;
        }
        setInviteCode(result.inviteCode);
        setCreatedTeamId(result.teamId);
      } catch {
        setError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
      }
    });
  }

  async function handleCopy() {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleGoToDashboard() {
    router.push(createdTeamId ? `/team/${createdTeamId}/survey` : '/dashboard');
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* 뒤로가기 */}
      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: 'var(--tf-text-muted)', minHeight: '44px' }}
      >
        <ArrowLeft size={16} />
        대시보드로 돌아가기
      </button>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--tf-text-primary)' }}>
          새 팀 만들기
        </h1>
        <p className="text-sm" style={{ color: 'var(--tf-text-muted)' }}>
          팀을 만들고 초대 코드로 팀원을 초대하세요
        </p>
      </div>

      <Card style={{ borderColor: 'var(--tf-border-subtle)' }}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">팀 정보 입력</CardTitle>
          <CardDescription>팀 이름은 나중에 변경할 수 있습니다</CardDescription>
        </CardHeader>
        <CardContent>
          {inviteCode && createdTeamId ? (
            <div className="flex flex-col gap-4">
              <div
                className="rounded-lg p-4 text-center"
                style={{
                  background: 'color-mix(in oklab, var(--tf-accent-primary) 8%, var(--tf-surface-card))',
                  border: '1px solid var(--tf-accent-primary)',
                }}
              >
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--tf-text-muted)' }}>
                  팀이 생성되었습니다! 초대 코드를 팀원에게 공유하세요
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span
                    className="font-mono text-2xl font-bold tracking-widest"
                    style={{ color: 'var(--tf-accent-primary)' }}
                  >
                    {inviteCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="rounded-md p-2 transition-colors"
                    style={{ color: 'var(--tf-text-muted)', minHeight: '44px' }}
                    aria-label="초대 코드 복사"
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
              <Button
                onClick={handleGoToDashboard}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                팀 페이지로 이동
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="team-name"
                  className="text-sm font-medium"
                  style={{ color: 'var(--tf-text-primary)' }}
                >
                  팀 이름
                </label>
                <Input
                  id="team-name"
                  placeholder="우리 팀 이름을 입력하세요 (2~50자)"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  maxLength={50}
                  aria-describedby={nameError ? 'team-name-error' : undefined}
                />
                {nameError && (
                  <p
                    id="team-name-error"
                    className="text-xs"
                    style={{ color: 'var(--tf-status-error)' }}
                    role="alert"
                  >
                    {nameError}
                  </p>
                )}
              </div>

              {error && (
                <p
                  className="text-sm"
                  style={{ color: 'var(--tf-status-error)' }}
                  role="alert"
                >
                  {error}
                </p>
              )}

              <Button
                onClick={handleCreate}
                disabled={teamName.length < 2 || teamName.length > 50 || isPending}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                {isPending ? '생성 중...' : '팀 생성'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
