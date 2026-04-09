'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import type {
  TeamType,
  ProjectDuration,
  CompletionTarget,
  DomainHint,
} from '@teamforge/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createTeamAction } from '@/app/team/join-or-create/actions';
import {
  TEAM_TYPE_OPTIONS,
  PROJECT_DURATION_OPTIONS,
  COMPLETION_TARGET_OPTIONS,
  DOMAIN_HINT_OPTIONS,
  type OptionMeta,
} from '@/lib/team-context-labels';

const MAX_DOMAIN_HINTS = 2;

// ── 공용 선택 카드 ─────────────────────────────────────────────────────────

interface OptionCardProps<T extends string> {
  option: OptionMeta<T>;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function OptionCard<T extends string>({ option, selected, disabled, onClick }: OptionCardProps<T>) {
  const { Icon, label, description } = option;
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={selected}
      className="flex items-start gap-3 rounded-lg p-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed"
      style={{
        minHeight: '44px',
        border: selected
          ? '2px solid var(--tf-bg-brand-solid)'
          : '1px solid var(--tf-border-subtle)',
        background: selected
          ? 'color-mix(in srgb, var(--tf-bg-brand-solid) 8%, var(--tf-surface-card))'
          : 'var(--tf-surface-card)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
        style={{
          background: selected
            ? 'color-mix(in srgb, var(--tf-bg-brand-solid) 14%, transparent)'
            : 'color-mix(in srgb, var(--tf-fg-muted) 8%, transparent)',
          color: selected ? 'var(--tf-bg-brand-solid)' : 'var(--tf-fg-muted)',
        }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          className="text-sm font-semibold leading-tight"
          style={{ color: selected ? 'var(--tf-bg-brand-solid)' : 'var(--tf-text-primary)' }}
        >
          {label}
        </span>
        {description && (
          <span
            className="text-xs leading-snug"
            style={{ color: 'var(--tf-text-muted)' }}
          >
            {description}
          </span>
        )}
      </span>
    </button>
  );
}

// ── 섹션 헬퍼 ─────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  hint?: string;
  children: React.ReactNode;
}

function Section({ title, hint, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-base font-semibold" style={{ color: 'var(--tf-text-primary)' }}>
          {title}
        </h3>
        {hint && (
          <p className="text-xs" style={{ color: 'var(--tf-text-muted)' }}>
            {hint}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

// ── 체크박스 카드 ─────────────────────────────────────────────────────────

interface CheckboxCardProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  description?: string;
}

function CheckboxCard({ checked, onToggle, label, description }: CheckboxCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="checkbox"
      aria-checked={checked}
      className="flex items-start gap-3 rounded-lg p-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      style={{
        minHeight: '44px',
        border: checked
          ? '2px solid var(--tf-bg-brand-solid)'
          : '1px solid var(--tf-border-subtle)',
        background: checked
          ? 'color-mix(in srgb, var(--tf-bg-brand-solid) 8%, var(--tf-surface-card))'
          : 'var(--tf-surface-card)',
      }}
    >
      <span
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded"
        style={{
          border: checked
            ? '2px solid var(--tf-bg-brand-solid)'
            : '2px solid var(--tf-border-subtle)',
          background: checked ? 'var(--tf-bg-brand-solid)' : 'transparent',
        }}
      >
        {checked && <Check className="h-3 w-3" style={{ color: 'white' }} />}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          className="text-sm font-semibold leading-tight"
          style={{ color: checked ? 'var(--tf-bg-brand-solid)' : 'var(--tf-text-primary)' }}
        >
          {label}
        </span>
        {description && (
          <span className="text-xs leading-snug" style={{ color: 'var(--tf-text-muted)' }}>
            {description}
          </span>
        )}
      </span>
    </button>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────

export default function CreateTeamClient() {
  const router = useRouter();

  // 기본 필드
  const [teamName, setTeamName] = useState('');
  const [teamType, setTeamType] = useState<TeamType | null>(null);
  const [projectDuration, setProjectDuration] = useState<ProjectDuration | null>(null);
  const [completionTarget, setCompletionTarget] = useState<CompletionTarget | null>(null);
  const [hasNonDeveloper, setHasNonDeveloper] = useState(false);
  const [usesVibeCoding, setUsesVibeCoding] = useState(false);
  const [hasSkillGap, setHasSkillGap] = useState(false);
  const [domainHints, setDomainHints] = useState<DomainHint[]>([]);

  // 결과/상태
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const nameError =
    teamName.length > 0 && (teamName.length < 2 || teamName.length > 50)
      ? '팀 이름은 2~50자여야 합니다.'
      : null;

  const canSubmit =
    teamName.length >= 2 &&
    teamName.length <= 50 &&
    teamType !== null &&
    projectDuration !== null &&
    completionTarget !== null &&
    !isPending;

  function toggleDomainHint(value: DomainHint) {
    setDomainHints((prev) => {
      if (prev.includes(value)) {
        return prev.filter((v) => v !== value);
      }
      if (prev.length >= MAX_DOMAIN_HINTS) {
        return prev;
      }
      return [...prev, value];
    });
  }

  function handleCreate() {
    if (!canSubmit) return;
    setError(null);

    startTransition(async () => {
      try {
        const result = await createTeamAction({
          name: teamName,
          teamType,
          projectDuration,
          completionTarget,
          hasNonDeveloper,
          usesVibeCoding,
          hasSkillGap,
          domainHints,
        });
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
    // createdTeamId가 예상 형식(cuid/uuid)이 아니면 open redirect 방지를 위해 dashboard로 fallback
    const TEAM_ID_RE = /^[a-z0-9_-]{20,36}$/i;
    if (createdTeamId && TEAM_ID_RE.test(createdTeamId)) {
      router.push(`/team/${createdTeamId}/survey`);
    } else {
      router.push('/dashboard');
    }
  }

  // ── 성공 상태 (기존 UI 유지, max-w-md 카드) ─────────────────────────────
  if (inviteCode && createdTeamId) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--tf-text-primary)' }}>
            새 팀 만들기
          </h1>
          <p className="text-sm" style={{ color: 'var(--tf-text-muted)' }}>
            팀이 생성되었습니다
          </p>
        </div>

        <Card style={{ borderColor: 'var(--tf-border-subtle)' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">생성 완료</CardTitle>
            <CardDescription>초대 코드를 팀원에게 공유하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div
                className="rounded-lg p-4 text-center"
                style={{
                  background:
                    'color-mix(in oklab, var(--tf-accent-primary) 8%, var(--tf-surface-card))',
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
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── 폼 상태 (6섹션 확장) ─────────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto">
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
          팀의 운영 방식을 알려주시면 맞춤형 킥오프를 도와드려요
        </p>
      </div>

      <Card style={{ borderColor: 'var(--tf-border-subtle)' }}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">팀 정보 입력</CardTitle>
          <CardDescription>
            필수 4개를 모두 선택하면 팀을 만들 수 있어요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            {/* 1. 팀 이름 */}
            <Section title="팀 이름" hint="2~50자, 나중에 변경할 수 있어요">
              <Input
                id="team-name"
                placeholder="우리 팀 이름을 입력하세요"
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
            </Section>

            {/* 2. 운영 형태 */}
            <Section title="운영 형태" hint="팀이 어떤 맥락에서 진행되나요?">
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="운영 형태"
              >
                {TEAM_TYPE_OPTIONS.map((opt) => (
                  <OptionCard
                    key={opt.value}
                    option={opt}
                    selected={teamType === opt.value}
                    onClick={() => setTeamType(opt.value)}
                  />
                ))}
              </div>
            </Section>

            {/* 3. 기간 */}
            <Section title="예상 기간" hint="전체 프로젝트 기간을 선택해 주세요">
              <div
                className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                role="radiogroup"
                aria-label="예상 기간"
              >
                {PROJECT_DURATION_OPTIONS.map((opt) => (
                  <OptionCard
                    key={opt.value}
                    option={opt}
                    selected={projectDuration === opt.value}
                    onClick={() => setProjectDuration(opt.value)}
                  />
                ))}
              </div>
            </Section>

            {/* 4. 완성도 목표 */}
            <Section title="완성도 목표" hint="어느 수준까지 완성할 계획이에요?">
              <div
                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                role="radiogroup"
                aria-label="완성도 목표"
              >
                {COMPLETION_TARGET_OPTIONS.map((opt) => (
                  <OptionCard
                    key={opt.value}
                    option={opt}
                    selected={completionTarget === opt.value}
                    onClick={() => setCompletionTarget(opt.value)}
                  />
                ))}
              </div>
            </Section>

            {/* 5. 팀 구성 특성 (선택) */}
            <Section
              title="팀 구성 특성 (선택)"
              hint="해당되는 항목만 체크해 주세요"
            >
              <div className="flex flex-col gap-2">
                <CheckboxCard
                  checked={hasNonDeveloper}
                  onToggle={() => setHasNonDeveloper((v) => !v)}
                  label="비개발 직군이 함께해요"
                  description="기획, 디자인, PM 등"
                />
                <CheckboxCard
                  checked={usesVibeCoding}
                  onToggle={() => setUsesVibeCoding((v) => !v)}
                  label="바이브 코딩 / AI 페어 활용"
                  description="Cursor, Copilot, Claude Code 등을 적극 활용"
                />
                <CheckboxCard
                  checked={hasSkillGap}
                  onToggle={() => setHasSkillGap((v) => !v)}
                  label="팀원 간 기술 격차가 커요"
                  description="경험 편차를 고려한 역할 분배가 필요"
                />
              </div>
            </Section>

            {/* 6. 도메인 힌트 (선택, 최대 2개) */}
            <Section
              title="도메인 힌트 (선택)"
              hint={`관심 도메인을 최대 ${MAX_DOMAIN_HINTS}개까지 선택할 수 있어요 (${domainHints.length}/${MAX_DOMAIN_HINTS})`}
            >
              <div
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2"
                role="group"
                aria-label="도메인 힌트"
              >
                {DOMAIN_HINT_OPTIONS.map((opt) => {
                  const isSelected = domainHints.includes(opt.value);
                  const isFull = domainHints.length >= MAX_DOMAIN_HINTS && !isSelected;
                  return (
                    <OptionCard
                      key={opt.value}
                      option={opt}
                      selected={isSelected}
                      disabled={isFull}
                      onClick={() => toggleDomainHint(opt.value)}
                    />
                  );
                })}
              </div>
            </Section>

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
              disabled={!canSubmit}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              {isPending ? '생성 중...' : '팀 생성'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
