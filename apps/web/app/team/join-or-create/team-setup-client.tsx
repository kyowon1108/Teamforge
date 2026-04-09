'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createTeamAction, joinTeamAction } from './actions';

type Tab = 'create' | 'join';

// 서버 에러 메시지 whitelist — 외부 data.message가 그대로 렌더링되지 않도록 정규화
const ALLOWED_TEAM_ERRORS = new Set([
  '팀 이름이 이미 사용 중입니다.',
  '초대 코드가 유효하지 않습니다',
  '이미 해당 팀의 멤버입니다',
  '팀 생성에 실패했습니다.',
  '팀 참가에 실패했습니다.',
  '네트워크 오류가 발생했습니다. 다시 시도해 주세요.',
  '로그인이 필요합니다.',
]);
function normalizeTeamError(err: string): string {
  return ALLOWED_TEAM_ERRORS.has(err) ? err : '오류가 발생했습니다. 다시 시도해 주세요.';
}

// teamId open redirect 방지 — cuid/uuid 형식만 허용
const TEAM_ID_RE = /^[a-z0-9_-]{20,36}$/i;

interface TeamSetupClientProps {
  initialTab: Tab;
}

// ── 팀 만들기 섹션 ──────────────────────────────────────────────────────────

function CreateTeamSection() {
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
        const result = await createTeamAction({ name: teamName });
        if (result.error) {
          setError(normalizeTeamError(result.error));
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

  function handleGoToSurvey() {
    if (!createdTeamId || !TEAM_ID_RE.test(createdTeamId)) {
      router.push('/dashboard');
      return;
    }
    router.push(`/team/${createdTeamId}/survey`);
  }

  if (inviteCode && createdTeamId) {
    return (
      <div className="flex flex-col gap-4">
        <div
          className="rounded-lg p-4 text-center"
          style={{
            background: 'color-mix(in oklab, var(--tf-accent-primary) 8%, var(--tf-surface-card))',
            borderColor: 'var(--tf-accent-primary)',
            border: '1px solid',
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
              style={{ color: 'var(--tf-text-muted)' }}
              aria-label="초대 코드 복사"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>
        <Button onClick={handleGoToSurvey} className="w-full h-12 text-base font-semibold" size="lg">
          설문 시작하기
        </Button>
      </div>
    );
  }

  return (
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
  );
}

// ── 팀 참가 섹션 ──────────────────────────────────────────────────────────

type JoinRole = 'member' | 'observer';

function JoinTeamSection() {
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
          setError(normalizeTeamError(result.error));
          return;
        }
        if (!result.teamId || !TEAM_ID_RE.test(result.teamId)) {
          router.push('/dashboard');
          return;
        }
        router.push(`/team/${result.teamId}/survey`);
      } catch {
        setError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
      }
    });
  }

  const joinRoleOptions: { value: JoinRole; label: string; desc: string }[] = [
    { value: 'member', label: '팀원', desc: '기여하고 의견 제시' },
    { value: 'observer', label: '옵저버', desc: '읽기 전용으로 참관' },
  ];

  return (
    <div className="flex flex-col gap-4">
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
          placeholder="6자리 코드 입력 (예: ABC123)"
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

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium" style={{ color: 'var(--tf-text-primary)' }}>
          역할 선택
        </p>
        <div className="grid grid-cols-2 gap-2">
          {joinRoleOptions.map(({ value, label, desc }) => {
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
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────

export default function TeamSetupClient({ initialTab }: TeamSetupClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const tabs: { value: Tab; label: string }[] = [
    { value: 'create', label: '팀 만들기' },
    { value: 'join', label: '팀 참가하기' },
  ];

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--tf-text-primary)' }}
        >
          팀 설정
        </h1>
        <p className="text-sm" style={{ color: 'var(--tf-text-muted)' }}>
          새 팀을 만들거나 기존 팀에 참가하세요
        </p>
      </div>

      {/* 탭 */}
      <div
        className="flex rounded-lg p-1 mb-6"
        style={{
          background: 'var(--tf-surface-card)',
          border: '1px solid var(--tf-border-subtle)',
        }}
        role="tablist"
        aria-label="팀 설정 옵션"
      >
        {tabs.map(({ value, label }) => {
          const isActive = activeTab === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(value)}
              className="flex-1 rounded-md py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              style={{
                minHeight: '44px',
                background: isActive ? 'var(--tf-accent-primary)' : 'transparent',
                color: isActive ? 'white' : 'var(--tf-text-muted)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <Card style={{ borderColor: 'var(--tf-border-subtle)' }}>
        {activeTab === 'create' ? (
          <>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">새 팀 만들기</CardTitle>
              <CardDescription>팀을 만들고 초대 코드로 팀원을 초대하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <CreateTeamSection />
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">팀에 참가하기</CardTitle>
              <CardDescription>팀장에게 받은 초대 코드로 참가하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <JoinTeamSection />
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
