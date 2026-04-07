'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle, ArrowRight, Check, Shuffle, ThumbsUp, Trophy, TrendingUp,
  Code2, Server, Database, Shield, Terminal, TestTube2, FileText, Calendar,
  BarChart2, Bot, Wifi, UserCheck, UserX, Sparkles,
} from 'lucide-react';
import TeamMemberSidebar from '@/components/result/TeamMemberSidebar';
import MemberResultViewer from '@/components/result/MemberResultViewer';
import FinalizedRoleBadge from '@/components/result/FinalizedRoleBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BlockProfile {
  strong: string[];
  weak: string[];
}

interface AISupportPlan {
  primaryAreas: string[];
  verificationLevel: number;
  autonomousBlocks: string[];
}

interface ResultData {
  axisScores: {
    기획력: number;
    기술력: number;
    소통력: number;
    추진력: number;
    창의력: number;
    성장력: number;
  };
  strengths: string[];
  growthAreas: string[];
  suggestedRole: string | null;
  submitted: boolean;
  submittedAt: string | null;
  roleReaction: 'ok' | 'burden' | 'prefer_other' | null;
  roleReactionNote: string | null;
  blockProfile?: BlockProfile;
  roleGoodFit?: string[];
  roleAvoid?: string[];
  aiSupportPlan?: AISupportPlan | null;
}

interface TeamMemberWithStatus {
  userId: string;
  name: string;
  image: string | null;
  role: 'leader' | 'member' | 'observer';
  submitted: boolean | null;
  confirmedRole: string | null;
  confirmedAt: string | null;
}

interface Props {
  teamId: string;
  // New unified props
  myResult?: ResultData & { myRole: 'leader' | 'member' };
  teamMembers?: TeamMemberWithStatus[] | null;
  memberResult?: (ResultData & { targetUserName: string }) | null;
  viewingUserId?: string | null;
  myUserId?: string;
  initialFinalRole?: string | null;
  // Legacy prop (dev-preview backward compat)
  data?: ResultData;
}

// ─── Static metadata ───────────────────────────────────────────────────────────

const AXES = ['기획력', '기술력', '소통력', '추진력', '창의력', '성장력'] as const;

const ROLE_MAP: Record<string, { label: string; description: string }> = {
  initiator: { label: '추진자', description: '팀의 방향을 설정하고 적극적으로 일을 이끌어 나가요.' },
  architect: { label: '설계자', description: '구조와 시스템을 체계적으로 설계하는 역량이 뛰어나요.' },
  executor: { label: '실행자', description: '빠르게 구현하고 결과물을 만들어내는 능력이 강점이에요.' },
  coordinator: { label: '조율자', description: '팀원 간 소통을 원활히 하고 협업을 이끄는 역할이에요.' },
  documenter: { label: '기록자', description: '정보를 정리하고 지식을 체계적으로 관리하는 역할이에요.' },
};

const BLOCK_META: Record<string, { label: string; Icon: React.ElementType }> = {
  ui: { label: 'UI 구현', Icon: Code2 },
  api: { label: 'API 설계', Icon: Server },
  db: { label: 'DB 모델링', Icon: Database },
  auth: { label: '인증/권한', Icon: Shield },
  devops: { label: '배포/인프라', Icon: Terminal },
  testing: { label: '테스트/QA', Icon: TestTube2 },
  docs: { label: '문서화', Icon: FileText },
  pm: { label: '일정/조율', Icon: Calendar },
  data: { label: '데이터 처리', Icon: BarChart2 },
  ai_feat: { label: 'AI 기능', Icon: Bot },
  realtime: { label: '실시간 기능', Icon: Wifi },
};

const CENTER = { x: 200, y: 200 };
const RADIUS = 130;
const LABEL_OFFSET = 22;

function angleForIndex(i: number): number {
  return (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
}

function pointForValue(value: number, axisIndex: number): { x: number; y: number } {
  const angle = angleForIndex(axisIndex);
  const r = (value / 100) * RADIUS;
  return { x: CENTER.x + r * Math.cos(angle), y: CENTER.y + r * Math.sin(angle) };
}

function gridPointForLevel(level: number, axisIndex: number): { x: number; y: number } {
  const angle = angleForIndex(axisIndex);
  const r = (level / 100) * RADIUS;
  return { x: CENTER.x + r * Math.cos(angle), y: CENTER.y + r * Math.sin(angle) };
}

function labelPointForAxis(axisIndex: number): { x: number; y: number } {
  const angle = angleForIndex(axisIndex);
  const r = RADIUS + LABEL_OFFSET;
  return { x: CENTER.x + r * Math.cos(angle), y: CENTER.y + r * Math.sin(angle) };
}

function buildPolygonPoints(scores: ResultData['axisScores']): string {
  return AXES.map((axis, i) => {
    const value = scores[axis];
    const pt = pointForValue(value, i);
    return `${pt.x},${pt.y}`;
  }).join(' ');
}

function buildGridPolygonPoints(level: number): string {
  return AXES.map((_, i) => {
    const pt = gridPointForLevel(level, i);
    return `${pt.x},${pt.y}`;
  }).join(' ');
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

// ─── My result inner view ─────────────────────────────────────────────────────

function MyResultView({
  teamId,
  data,
  isLeader,
  initialFinalRole,
}: {
  teamId: string;
  data: ResultData;
  isLeader: boolean;
  initialFinalRole?: string | null;
}) {
  const router = useRouter();
  const { axisScores, strengths, growthAreas, suggestedRole, submittedAt } = data;

  const [roleReaction, setRoleReaction] = useState<'ok' | 'burden' | 'prefer_other' | null>(data.roleReaction);
  const [roleReactionNote, setRoleReactionNote] = useState(data.roleReactionNote ?? '');
  const [showNoteInput, setShowNoteInput] = useState(data.roleReaction === 'prefer_other');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reactionError, setReactionError] = useState<string | null>(null);

  async function handleRoleReact(value: 'ok' | 'burden' | 'prefer_other') {
    setShowNoteInput(value === 'prefer_other');
    setRoleReaction(value);
    setReactionError(null);
    setIsSubmitting(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res = await fetch(`${apiBase}/api/teams/${teamId}/survey/role-reaction`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reaction: value,
          note: value === 'prefer_other' ? roleReactionNote || undefined : undefined,
        }),
      });
      if (!res.ok) throw new Error('API error');
    } catch {
      setReactionError('저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const role = suggestedRole ? (ROLE_MAP[suggestedRole] ?? null) : null;
  const dataPoints = buildPolygonPoints(axisScores);
  const GRID_LEVELS = [20, 40, 60, 80, 100];
  const axisEndPoints = AXES.map((_, i) => gridPointForLevel(100, i));

  return (
    <div className="space-y-5">
      {/* Finalized role badge (member only) */}
      {!isLeader && (
        <FinalizedRoleBadge
          teamId={teamId}
          initialFinalRole={initialFinalRole ?? null}
        />
      )}

      {/* 1. Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--tf-fg-default)' }}>
          내 스킬 분석
        </h1>
        {submittedAt && (
          <p className="text-sm mt-1" style={{ color: 'var(--tf-fg-muted)' }}>
            {formatDate(submittedAt)} 제출
          </p>
        )}
      </div>

      {/* 2. Radar chart */}
      <div
        className="rounded-xl p-4"
        style={{
          background: 'var(--tf-bg-layer-default)',
          border: '1px solid var(--tf-stroke-neutral)',
        }}
      >
        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--tf-fg-default)' }}>
          역량 레이더
        </h2>
        <svg
          viewBox="0 0 400 400"
          aria-label="역량 레이더 차트"
          role="img"
          className="w-full max-w-sm mx-auto block"
        >
          {GRID_LEVELS.map((level) => (
            <polygon
              key={level}
              points={buildGridPolygonPoints(level)}
              fill="none"
              stroke="var(--tf-stroke-neutral)"
              strokeWidth="1"
            />
          ))}
          {axisEndPoints.map((pt, i) => (
            <line
              key={i}
              x1={CENTER.x}
              y1={CENTER.y}
              x2={pt.x}
              y2={pt.y}
              stroke="var(--tf-stroke-neutral)"
              strokeWidth="1"
            />
          ))}
          <polygon
            points={dataPoints}
            fill="var(--tf-bg-brand-solid)"
            fillOpacity="0.2"
            stroke="var(--tf-bg-brand-solid)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {AXES.map((axis, i) => {
            const pt = pointForValue(axisScores[axis], i);
            return <circle key={axis} cx={pt.x} cy={pt.y} r="4" fill="var(--tf-bg-brand-solid)" />;
          })}
          {AXES.map((axis, i) => {
            const lp = labelPointForAxis(i);
            return (
              <text
                key={axis}
                x={lp.x}
                y={lp.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="13"
                fontWeight="500"
                fill="var(--tf-fg-default)"
              >
                {axis}
              </text>
            );
          })}
        </svg>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {AXES.map((axis) => (
            <div key={axis} className="flex flex-col items-center">
              <span className="text-xs" style={{ color: 'var(--tf-fg-muted)' }}>{axis}</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--tf-bg-brand-solid)' }}>
                {axisScores[axis]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Strengths */}
      <div
        className="rounded-xl p-4"
        style={{
          background: 'var(--tf-bg-layer-default)',
          border: '2px solid var(--tf-fg-positive)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5" style={{ color: 'var(--tf-fg-positive)' }} />
          <h2 className="text-base font-semibold" style={{ color: 'var(--tf-fg-default)' }}>
            핵심 강점
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {strengths.map((s) => (
            <span
              key={s}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
              style={{
                background: 'color-mix(in srgb, var(--tf-fg-positive) 12%, transparent)',
                color: 'var(--tf-fg-positive)',
              }}
            >
              {s}
            </span>
          ))}
        </div>
        {strengths.length >= 2 && (
          <p className="text-sm" style={{ color: 'var(--tf-fg-muted)' }}>
            {strengths[0]}와 {strengths[1]} 영역에서 뛰어난 역량을 보이고 있어요.
          </p>
        )}
        {strengths.length === 1 && (
          <p className="text-sm" style={{ color: 'var(--tf-fg-muted)' }}>
            {strengths[0]} 영역에서 뛰어난 역량을 보이고 있어요.
          </p>
        )}
      </div>

      {/* 4. Growth areas */}
      <div
        className="rounded-xl p-4"
        style={{
          background: 'var(--tf-bg-layer-default)',
          border: '2px solid var(--tf-fg-warning)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5" style={{ color: 'var(--tf-fg-warning)' }} />
          <h2 className="text-base font-semibold" style={{ color: 'var(--tf-fg-default)' }}>
            성장 기회
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {growthAreas.map((area) => (
            <span
              key={area}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
              style={{
                background: 'color-mix(in srgb, var(--tf-fg-warning) 12%, transparent)',
                color: 'var(--tf-fg-warning)',
              }}
            >
              {area}
            </span>
          ))}
        </div>
        {growthAreas.length >= 1 && (
          <p className="text-sm" style={{ color: 'var(--tf-fg-muted)' }}>
            {growthAreas[0]}을(를) 보완하면 더 완성도 높은 팀원이 될 수 있어요.
          </p>
        )}
      </div>

      {/* 5. Suggested role + reaction buttons */}
      {role && (
        <div
          className="rounded-xl p-4"
          style={{
            background: 'var(--tf-bg-layer-default)',
            border: '2px solid var(--tf-bg-brand-solid)',
          }}
        >
          <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--tf-fg-default)' }}>
            추천 역할
          </h2>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold"
              style={{
                background: 'color-mix(in srgb, var(--tf-bg-brand-solid) 12%, transparent)',
                color: 'var(--tf-bg-brand-solid)',
              }}
            >
              {role.label}
            </span>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--tf-fg-muted)' }}>
            {role.description}
          </p>
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--tf-fg-default)' }}>
              이 역할이 어떻게 느껴지나요?
            </p>
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  { value: 'ok' as const, label: '괜찮아요', icon: ThumbsUp },
                  { value: 'burden' as const, label: '부담돼요', icon: AlertCircle },
                  { value: 'prefer_other' as const, label: '다른 역할 선호', icon: Shuffle },
                ] as const
              ).map(({ value, label, icon: Icon }) => {
                const isSelected = roleReaction === value;
                return (
                  <button
                    key={value}
                    onClick={() => handleRoleReact(value)}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-3 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      minHeight: '44px',
                      border: `1px solid ${isSelected ? 'var(--tf-bg-brand-solid)' : 'var(--tf-stroke-neutral)'}`,
                      background: isSelected
                        ? 'color-mix(in srgb, var(--tf-bg-brand-solid) 12%, transparent)'
                        : 'var(--tf-bg-layer-default)',
                      color: isSelected ? 'var(--tf-bg-brand-solid)' : 'var(--tf-fg-muted)',
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                );
              })}
            </div>
            {showNoteInput && (
              <div className="mt-3">
                <textarea
                  value={roleReactionNote}
                  onChange={(e) => setRoleReactionNote(e.target.value.slice(0, 100))}
                  placeholder="어떤 역할이 더 맞나요? (선택, 최대 100자)"
                  rows={2}
                  className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                  style={{
                    border: '1px solid var(--tf-stroke-neutral)',
                    background: 'var(--tf-bg-layer-default)',
                    color: 'var(--tf-fg-default)',
                  }}
                />
                <p className="text-xs mt-1 text-right" style={{ color: 'var(--tf-fg-muted)' }}>
                  {roleReactionNote.length}/100
                </p>
              </div>
            )}
            {reactionError && (
              <p className="text-xs mt-2" style={{ color: 'var(--tf-fg-negative)' }}>
                {reactionError}
              </p>
            )}
            {roleReaction && !isSubmitting && !reactionError && (
              <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--tf-fg-positive)' }}>
                <Check size={12} />
                반응이 저장됐습니다
              </p>
            )}
          </div>
        </div>
      )}

      {/* 6. Block profile */}
      {data.blockProfile && (data.blockProfile.strong.length > 0 || data.blockProfile.weak.length > 0) && (
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--tf-bg-layer-default)', border: '1px solid var(--tf-stroke-neutral)' }}
        >
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--tf-fg-default)' }}>
            시스템 블록 역할
          </h2>
          {data.blockProfile.strong.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-2">
                <UserCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--tf-fg-positive)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--tf-fg-default)' }}>
                  리드할 수 있는 영역
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.blockProfile.strong.map((block) => {
                  const meta = BLOCK_META[block];
                  if (!meta) return null;
                  const { label, Icon } = meta;
                  return (
                    <span
                      key={block}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border"
                      style={{
                        background: 'color-mix(in srgb, var(--tf-fg-positive) 10%, transparent)',
                        color: 'var(--tf-fg-positive)',
                        borderColor: 'var(--tf-stroke-positive)',
                      }}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {data.blockProfile.weak.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <UserX className="w-4 h-4 shrink-0" style={{ color: 'var(--tf-fg-subtle)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--tf-fg-default)' }}>
                  보완이 필요한 영역
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.blockProfile.weak.map((block) => {
                  const meta = BLOCK_META[block];
                  if (!meta) return null;
                  const { label, Icon } = meta;
                  return (
                    <span
                      key={block}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border"
                      style={{
                        background: 'var(--tf-bg-layer-alt)',
                        color: 'var(--tf-fg-subtle)',
                        borderColor: 'var(--tf-stroke-neutral)',
                      }}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. Role fit */}
      {(data.roleGoodFit?.length || data.roleAvoid?.length) ? (
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--tf-bg-layer-default)', border: '1px solid var(--tf-stroke-neutral)' }}
        >
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--tf-fg-default)' }}>
            역할 적합도
          </h2>
          {data.roleGoodFit && data.roleGoodFit.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--tf-fg-muted)' }}>
                이번 프로젝트에서 맞는 역할
              </p>
              <div className="flex flex-wrap gap-2">
                {data.roleGoodFit.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      background: 'color-mix(in srgb, var(--tf-bg-brand-solid) 12%, transparent)',
                      color: 'var(--tf-bg-brand-solid)',
                    }}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.roleAvoid && data.roleAvoid.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--tf-fg-muted)' }}>
                피하면 좋은 역할
              </p>
              <div className="flex flex-wrap gap-2">
                {data.roleAvoid.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border"
                    style={{ color: 'var(--tf-fg-muted)', borderColor: 'var(--tf-stroke-neutral)' }}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* 8. AI support plan */}
      {data.aiSupportPlan && (
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--tf-bg-layer-default)', border: '1px solid var(--tf-stroke-neutral)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5" style={{ color: 'var(--tf-fg-brand)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--tf-fg-default)' }}>
              AI 지원 계획
            </h2>
          </div>
          {data.aiSupportPlan.primaryAreas.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--tf-fg-muted)' }}>
                AI가 도울 수 있는 영역
              </p>
              <div className="flex flex-wrap gap-2">
                {data.aiSupportPlan.primaryAreas.map((area) => (
                  <span
                    key={area}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{
                      background: 'color-mix(in srgb, var(--tf-fg-brand) 10%, transparent)',
                      color: 'var(--tf-fg-brand)',
                    }}
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.aiSupportPlan.autonomousBlocks.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--tf-fg-muted)' }}>
                직접 리드 가능한 영역
              </p>
              <div className="flex flex-wrap gap-2">
                {data.aiSupportPlan.autonomousBlocks.map((block) => {
                  const meta = BLOCK_META[block];
                  if (!meta) return null;
                  const { label, Icon } = meta;
                  return (
                    <span
                      key={block}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border"
                      style={{
                        background: 'color-mix(in srgb, var(--tf-fg-positive) 10%, transparent)',
                        color: 'var(--tf-fg-positive)',
                        borderColor: 'var(--tf-stroke-positive)',
                      }}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--tf-fg-muted)' }}>AI 결과 검증 수준:</span>
            <span className="text-xs font-medium" style={{ color: 'var(--tf-fg-default)' }}>
              {data.aiSupportPlan.verificationLevel === 1 && '검증 어려움 — AI 결과를 그대로 활용하는 편'}
              {data.aiSupportPlan.verificationLevel === 2 && '일부 검증 — 주요 부분은 직접 확인'}
              {data.aiSupportPlan.verificationLevel === 3 && '직접 검증 — AI 결과를 반드시 직접 확인'}
            </span>
          </div>
        </div>
      )}

      {/* 9. CTA */}
      <button
        onClick={() => router.push(`/team/${teamId}/dashboard`)}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
        style={{
          background: 'var(--tf-bg-brand-solid)',
          color: 'var(--tf-fg-inverse)',
        }}
      >
        팀 현황 보기
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ResultClient({
  teamId,
  myResult,
  teamMembers,
  memberResult,
  viewingUserId,
  myUserId,
  initialFinalRole,
  data,
}: Props) {
  const router = useRouter();

  // Support legacy `data` prop (dev-preview backward compat)
  const effectiveData: ResultData & { myRole: 'leader' | 'member' } = myResult ?? {
    ...(data as ResultData),
    myRole: 'member' as const,
  };

  const isLeader = effectiveData.myRole === 'leader';

  // Leader viewing a member's result
  if (isLeader && viewingUserId && memberResult) {
    const currentConfirmedRole =
      teamMembers?.find((m) => m.userId === viewingUserId)?.confirmedRole ?? null;

    return (
      <div
        className="min-h-screen"
        style={{ background: 'var(--tf-bg-layer-alt)' }}
      >
        {/* Sidebar */}
        {teamMembers && (
          <TeamMemberSidebar
            members={teamMembers}
            currentViewingId={viewingUserId}
            teamId={teamId}
            myUserId={myUserId}
          />
        )}
        {/* Content offset for desktop sidebar */}
        <div className={isLeader && teamMembers ? 'lg:ml-60' : ''}>
          <MemberResultViewer
            memberResult={memberResult as ResultData & { targetUserName: string }}
            teamId={teamId}
            targetUserId={viewingUserId}
            currentConfirmedRole={currentConfirmedRole}
            onRoleFinalized={() => router.refresh()}
          />
        </div>
      </div>
    );
  }

  // Leader or member viewing own result
  return (
    <div
      className="min-h-screen pb-8"
      style={{ background: 'var(--tf-bg-layer-alt)' }}
    >
      {/* Sidebar (leader only) */}
      {isLeader && teamMembers && (
        <TeamMemberSidebar
          members={teamMembers}
          currentViewingId={null}
          teamId={teamId}
          myUserId={myUserId}
        />
      )}
      <div className={isLeader && teamMembers ? 'lg:ml-60' : ''}>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <MyResultView
            teamId={teamId}
            data={effectiveData}
            isLeader={isLeader}
            initialFinalRole={initialFinalRole}
          />
        </div>
      </div>
    </div>
  );
}
