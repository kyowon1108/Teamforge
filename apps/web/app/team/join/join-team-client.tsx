'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { joinTeamAction } from '@/app/team/join-or-create/actions';

type JoinRole = 'member' | 'observer';

const JOIN_ROLE_OPTIONS: { value: JoinRole; label: string; desc: string }[] = [
  { value: 'member', label: '팀원', desc: '기여하고 의견 제시' },
  { value: 'observer', label: '옵저버', desc: '읽기 전용으로 참관' },
];

export default function JoinTeamClient() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [joinRole, setJoinRole] = useState<JoinRole>('member');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCode(e.target.value.toUpperCase().slice(0, 6));
  }

  function handleJoin() {
    if (code.length !== 6) return;
    setError(null);

    startTransition(async () => {
      try {
        const result = await joinTeamAction(code, joinRole);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.push(`/team/${result.teamId}`);
      } catch {
        setError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
      }
    });
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
          팀에 참가하기
        </h1>
        <p className="text-sm" style={{ color: 'var(--tf-text-muted)' }}>
          팀장에게 받은 초대 코드로 참가하세요
        </p>
      </div>

      <Card style={{ borderColor: 'var(--tf-border-subtle)' }}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">초대 코드 입력</CardTitle>
          <CardDescription>6자리 코드와 역할을 선택하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5">
            {/* 초대 코드 */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="invite-code"
                className="text-sm font-medium"
                style={{ color: 'var(--tf-text-primary)' }}
              >
                초대 코드
              </label>
              <Input
                id="invite-code"
                placeholder="예: ABC123"
                value={code}
                onChange={handleCodeChange}
                maxLength={6}
                className="font-mono text-lg tracking-widest text-center uppercase"
                aria-describedby="invite-code-hint"
              />
              <p
                id="invite-code-hint"
                className="text-xs"
                style={{ color: 'var(--tf-text-muted)' }}
              >
                팀장에게 받은 6자리 초대 코드를 입력하세요
              </p>
            </div>

            {/* 역할 선택 */}
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium" style={{ color: 'var(--tf-text-primary)' }}>
                역할 선택
              </p>
              <div className="grid grid-cols-2 gap-2">
                {JOIN_ROLE_OPTIONS.map(({ value, label, desc }) => {
                  const colorVar =
                    value === 'member' ? 'var(--tf-role-member)' : 'var(--tf-role-observer)';
                  const isSelected = joinRole === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setJoinRole(value)}
                      className="flex flex-col gap-1 rounded-lg border-2 p-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      style={{
                        minHeight: '44px',
                        borderColor: isSelected ? colorVar : 'var(--tf-border-subtle)',
                        background: isSelected
                          ? `color-mix(in oklab, ${colorVar} 8%, var(--tf-surface-card))`
                          : 'var(--tf-surface-card)',
                      }}
                      aria-pressed={isSelected}
                    >
                      <span
                        className="text-sm font-semibold"
                        style={{ color: isSelected ? colorVar : 'var(--tf-text-primary)' }}
                      >
                        {label}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--tf-text-muted)' }}>
                        {desc}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs" style={{ color: 'var(--tf-text-muted)' }}>
                팀장은 팀 생성을 통해서만 만들 수 있습니다
              </p>
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
              onClick={handleJoin}
              disabled={code.length !== 6 || isPending}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              {isPending ? '참가 중...' : '팀 참가'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
