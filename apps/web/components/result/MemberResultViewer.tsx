'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  ThumbsUp,
  AlertCircle,
  Shuffle,
  Sparkles,
  UserCheck,
  UserX,
  Code2,
  Server,
  Database,
  Shield,
  Terminal,
  TestTube2,
  FileText,
  Calendar,
  BarChart2,
  Bot,
  Wifi,
} from 'lucide-react';
import React from 'react';
import RoleFinalizationPanel from './RoleFinalizationPanel';

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

interface MemberResult extends ResultData {
  targetUserName: string;
}

interface Props {
  memberResult: MemberResult;
  teamId: string;
  targetUserId: string;
  currentConfirmedRole: string | null;
  onRoleFinalized: () => void;
}

// ─── Radar chart helpers ───────────────────────────────────────────────────────

const AXES = ['기획력', '기술력', '소통력', '추진력', '창의력', '성장력'] as const;
const CENTER = { x: 200, y: 200 };
const RADIUS = 130;
const LABEL_OFFSET = 22;
const GRID_LEVELS = [20, 40, 60, 80, 100];

function angleForIndex(i: number) {
  return (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
}

function pointForValue(value: number, axisIndex: number) {
  const angle = angleForIndex(axisIndex);
  const r = (value / 100) * RADIUS;
  return { x: CENTER.x + r * Math.cos(angle), y: CENTER.y + r * Math.sin(angle) };
}

function gridPointForLevel(level: number, axisIndex: number) {
  const angle = angleForIndex(axisIndex);
  const r = (level / 100) * RADIUS;
  return { x: CENTER.x + r * Math.cos(angle), y: CENTER.y + r * Math.sin(angle) };
}

function labelPointForAxis(axisIndex: number) {
  const angle = angleForIndex(axisIndex);
  const r = RADIUS + LABEL_OFFSET;
  return { x: CENTER.x + r * Math.cos(angle), y: CENTER.y + r * Math.sin(angle) };
}

function buildPolygonPoints(scores: ResultData['axisScores']) {
  return AXES.map((axis, i) => {
    const value = scores[axis];
    const pt = pointForValue(value, i);
    return `${pt.x},${pt.y}`;
  }).join(' ');
}

function buildGridPolygonPoints(level: number) {
  return AXES.map((_, i) => {
    const pt = gridPointForLevel(level, i);
    return `${pt.x},${pt.y}`;
  }).join(' ');
}

// ─── Static metadata ───────────────────────────────────────────────────────────

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

const REACTION_META = {
  ok: { label: '괜찮아요', Icon: ThumbsUp, color: 'var(--tf-fg-positive)' },
  burden: { label: '부담돼요', Icon: AlertCircle, color: 'var(--tf-fg-warning)' },
  prefer_other: { label: '다른 역할이 맞을 것 같아요', Icon: Shuffle, color: 'var(--tf-fg-brand)' },
} as const;

// ─── Main component ────────────────────────────────────────────────────────────

export default function MemberResultViewer({
  memberResult,
  teamId,
  targetUserId,
  currentConfirmedRole,
  onRoleFinalized,
}: Props) {
  const router = useRouter();
  const [localConfirmedRole, setLocalConfirmedRole] = useState<string | null>(currentConfirmedRole);

  const { axisScores, strengths, growthAreas, suggestedRole, submittedAt, roleReaction, roleReactionNote } = memberResult;
  const role = suggestedRole ? (ROLE_MAP[suggestedRole] ?? null) : null;
  const dataPoints = buildPolygonPoints(axisScores);
  const axisEndPoints = AXES.map((_, i) => gridPointForLevel(100, i));

  function handleFinalized(role: string) {
    setLocalConfirmedRole(role);
    onRoleFinalized();
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--tf-bg-layer-alt)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
            style={{
              border: '1px solid var(--tf-stroke-neutral)',
              color: 'var(--tf-fg-muted)',
            }}
            aria-label="뒤로가기"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--tf-fg-default)' }}>
              {memberResult.targetUserName}님의 결과
            </h1>
            {submittedAt && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--tf-fg-muted)' }}>
                {new Date(submittedAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}{' '}
                제출
              </p>
            )}
          </div>
        </div>

        {/* Role reaction badge (read-only) */}
        {roleReaction && (
          <div
            className="flex flex-col gap-1 rounded-xl px-4 py-3"
            style={{
              background: 'var(--tf-bg-layer-default)',
              border: '1px solid var(--tf-stroke-neutral)',
            }}
          >
            <p className="text-xs font-medium" style={{ color: 'var(--tf-fg-muted)' }}>
              역할에 대한 반응
            </p>
            <div className="flex items-center gap-2">
              {(() => {
                const meta = REACTION_META[roleReaction];
                const Icon = meta.Icon;
                return (
                  <>
                    <Icon className="w-4 h-4" style={{ color: meta.color }} />
                    <span className="text-sm font-medium" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                  </>
                );
              })()}
            </div>
            {roleReaction === 'prefer_other' && roleReactionNote && (
              <p className="text-sm mt-1" style={{ color: 'var(--tf-fg-muted)' }}>
                {roleReactionNote}
              </p>
            )}
          </div>
        )}

        {/* Radar chart */}
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

        {/* Strengths */}
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
        </div>

        {/* Growth areas */}
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
          <div className="flex flex-wrap gap-2">
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
        </div>

        {/* Suggested role (read-only) */}
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
            <p className="text-sm" style={{ color: 'var(--tf-fg-muted)' }}>
              {role.description}
            </p>
          </div>
        )}

        {/* Block profile */}
        {memberResult.blockProfile &&
          (memberResult.blockProfile.strong.length > 0 || memberResult.blockProfile.weak.length > 0) && (
            <div
              className="rounded-xl p-4"
              style={{
                background: 'var(--tf-bg-layer-default)',
                border: '1px solid var(--tf-stroke-neutral)',
              }}
            >
              <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--tf-fg-default)' }}>
                시스템 블록 역할
              </h2>
              {memberResult.blockProfile.strong.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <UserCheck className="w-4 h-4" style={{ color: 'var(--tf-fg-positive)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--tf-fg-default)' }}>
                      리드할 수 있는 영역
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {memberResult.blockProfile.strong.map((block) => {
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
              {memberResult.blockProfile.weak.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <UserX className="w-4 h-4" style={{ color: 'var(--tf-fg-subtle)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--tf-fg-default)' }}>
                      보완이 필요한 영역
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {memberResult.blockProfile.weak.map((block) => {
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

        {/* Role fit */}
        {(memberResult.roleGoodFit?.length || memberResult.roleAvoid?.length) ? (
          <div
            className="rounded-xl p-4"
            style={{
              background: 'var(--tf-bg-layer-default)',
              border: '1px solid var(--tf-stroke-neutral)',
            }}
          >
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--tf-fg-default)' }}>
              역할 적합도
            </h2>
            {memberResult.roleGoodFit && memberResult.roleGoodFit.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--tf-fg-muted)' }}>
                  이번 프로젝트에서 맞는 역할
                </p>
                <div className="flex flex-wrap gap-2">
                  {memberResult.roleGoodFit.map((r) => (
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
            {memberResult.roleAvoid && memberResult.roleAvoid.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--tf-fg-muted)' }}>
                  피하면 좋은 역할
                </p>
                <div className="flex flex-wrap gap-2">
                  {memberResult.roleAvoid.map((r) => (
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

        {/* AI support plan */}
        {memberResult.aiSupportPlan && (
          <div
            className="rounded-xl p-4"
            style={{
              background: 'var(--tf-bg-layer-default)',
              border: '1px solid var(--tf-stroke-neutral)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5" style={{ color: 'var(--tf-fg-brand)' }} />
              <h2 className="text-base font-semibold" style={{ color: 'var(--tf-fg-default)' }}>
                AI 지원 계획
              </h2>
            </div>
            {memberResult.aiSupportPlan.primaryAreas.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--tf-fg-muted)' }}>
                  AI가 도울 수 있는 영역
                </p>
                <div className="flex flex-wrap gap-2">
                  {memberResult.aiSupportPlan.primaryAreas.map((area) => (
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
            {memberResult.aiSupportPlan.autonomousBlocks.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--tf-fg-muted)' }}>
                  직접 리드 가능한 영역
                </p>
                <div className="flex flex-wrap gap-2">
                  {memberResult.aiSupportPlan.autonomousBlocks.map((block) => {
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
                {memberResult.aiSupportPlan.verificationLevel === 1 && '검증 어려움 — AI 결과를 그대로 활용하는 편'}
                {memberResult.aiSupportPlan.verificationLevel === 2 && '일부 검증 — 주요 부분은 직접 확인'}
                {memberResult.aiSupportPlan.verificationLevel === 3 && '직접 검증 — AI 결과를 반드시 직접 확인'}
              </span>
            </div>
          </div>
        )}

        {/* Role finalization panel */}
        <RoleFinalizationPanel
          targetUserId={targetUserId}
          targetUserName={memberResult.targetUserName}
          currentConfirmedRole={localConfirmedRole}
          teamId={teamId}
          onFinalized={handleFinalized}
        />
      </div>
    </div>
  );
}
