'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Check, Clock, Minus, Users, ChevronRight, TrendingUp, Trophy } from 'lucide-react';
import type { KickoffStatusResponse, KickoffMember, TeamInsight } from './page';

interface Props {
  teamId: string;
  data: KickoffStatusResponse;
}

const ROLE_LABEL: Record<KickoffMember['role'], string> = {
  leader: '리더',
  member: '멤버',
  observer: '옵저버',
};

const PHASE_LABEL: Record<KickoffStatusResponse['phase'], string> = {
  survey_in_progress: '설문 진행 중',
  survey_complete: '설문 완료',
};

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

function MemberAvatar({ member }: { member: KickoffMember }) {
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
      style={{
        background: 'color-mix(in srgb, var(--tf-bg-brand-solid) 15%, transparent)',
        color: 'var(--tf-bg-brand-solid)',
      }}
      aria-label={member.name ?? '팀원'}
    >
      {member.image ? (
        <Image
          src={member.image}
          alt={member.name ?? '팀원'}
          width={36}
          height={36}
          className="rounded-full object-cover"
        />
      ) : (
        getInitials(member.name)
      )}
    </div>
  );
}

function SubmitStatusIcon({ member }: { member: KickoffMember }) {
  if (member.role === 'observer') {
    return (
      <span
        className="flex items-center gap-1 text-xs"
        style={{ color: 'var(--tf-fg-muted)' }}
      >
        <Minus className="w-3.5 h-3.5" />
        해당없음
      </span>
    );
  }

  if (member.submitted) {
    return (
      <span
        className="flex items-center gap-1 text-xs font-medium"
        style={{ color: 'var(--tf-fg-positive)' }}
      >
        <Check className="w-3.5 h-3.5" />
        제출완료
      </span>
    );
  }

  return (
    <span
      className="flex items-center gap-1 text-xs"
      style={{ color: 'var(--tf-fg-warning)' }}
    >
      <Clock className="w-3.5 h-3.5" />
      미제출
    </span>
  );
}

function MemberRow({ member }: { member: KickoffMember }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <MemberAvatar member={member} />
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          {member.name ?? '이름 없음'}
        </p>
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-0.5"
          style={{
            background: 'color-mix(in srgb, var(--tf-fg-muted) 10%, transparent)',
            color: 'var(--tf-fg-muted)',
          }}
        >
          {ROLE_LABEL[member.role]}
        </span>
      </div>
      <SubmitStatusIcon member={member} />
    </div>
  );
}

const AXES = ['기획력', '기술력', '소통력', '추진력', '창의력', '성장력'] as const;
const RADAR_CENTER = { x: 120, y: 120 };
const RADAR_RADIUS = 85;

function radarAngle(i: number) {
  return (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
}

function radarPoint(value: number, axisIndex: number) {
  const angle = radarAngle(axisIndex);
  const r = (value / 100) * RADAR_RADIUS;
  return { x: RADAR_CENTER.x + r * Math.cos(angle), y: RADAR_CENTER.y + r * Math.sin(angle) };
}

function radarGridPoint(level: number, axisIndex: number) {
  const angle = radarAngle(axisIndex);
  const r = (level / 100) * RADAR_RADIUS;
  return { x: RADAR_CENTER.x + r * Math.cos(angle), y: RADAR_CENTER.y + r * Math.sin(angle) };
}

const ROLE_LABEL_MAP: Record<string, string> = {
  initiator: '추진자', architect: '설계자', executor: '실행자',
  coordinator: '조율자', documenter: '기록자',
};

function TeamInsightPanel({ insight }: { insight: TeamInsight }) {
  const polygonPoints = AXES.map((axis, i) => {
    const pt = radarPoint(insight.avgAxisScores[axis], i);
    return `${pt.x},${pt.y}`;
  }).join(' ');

  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--tf-bg-layer-default)', border: '1px solid var(--tf-stroke-neutral)' }}
    >
      <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--tf-fg-default)' }}>
        팀 스킬 분석
      </h2>

      <div className="flex gap-4 items-start">
        {/* 미니 레이더 차트 */}
        <svg viewBox="0 0 240 240" className="w-32 h-32 shrink-0" aria-label="팀 역량 레이더 차트" role="img">
          {gridLevels.map((level) => (
            <polygon
              key={level}
              points={AXES.map((_, i) => { const p = radarGridPoint(level, i); return `${p.x},${p.y}`; }).join(' ')}
              fill="none"
              stroke="var(--tf-stroke-neutral)"
              strokeWidth="1"
            />
          ))}
          {AXES.map((_, i) => {
            const p = radarGridPoint(100, i);
            return <line key={i} x1={RADAR_CENTER.x} y1={RADAR_CENTER.y} x2={p.x} y2={p.y} stroke="var(--tf-stroke-neutral)" strokeWidth="1" />;
          })}
          <polygon
            points={polygonPoints}
            fill="var(--tf-bg-brand-solid)"
            fillOpacity="0.2"
            stroke="var(--tf-bg-brand-solid)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {AXES.map((axis, i) => {
            const lAngle = radarAngle(i);
            const lr = RADAR_RADIUS + 18;
            const lx = RADAR_CENTER.x + lr * Math.cos(lAngle);
            const ly = RADAR_CENTER.y + lr * Math.sin(lAngle);
            return (
              <text key={axis} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="var(--tf-fg-muted)">
                {axis}
              </text>
            );
          })}
        </svg>

        {/* 강점 / 성장 포인트 / 역할 분포 */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* 팀 강점 */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Trophy className="w-3.5 h-3.5" style={{ color: 'var(--tf-fg-positive)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--tf-fg-muted)' }}>팀 강점</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {insight.topAxes.map((axis) => (
                <span
                  key={axis}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: 'color-mix(in srgb, var(--tf-fg-positive) 12%, transparent)', color: 'var(--tf-fg-positive)' }}
                >
                  {axis}
                </span>
              ))}
            </div>
          </div>

          {/* 성장 포인트 */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--tf-fg-warning)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--tf-fg-muted)' }}>성장 포인트</span>
            </div>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'color-mix(in srgb, var(--tf-fg-warning) 12%, transparent)', color: 'var(--tf-fg-warning)' }}
            >
              {insight.bottomAxis}
            </span>
          </div>

          {/* 역할 분포 */}
          {Object.keys(insight.roleDistribution).length > 0 && (
            <div>
              <span className="text-xs font-medium" style={{ color: 'var(--tf-fg-muted)' }}>역할 분포</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(insight.roleDistribution).map(([role, count]) => (
                  <span
                    key={role}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs"
                    style={{ background: 'color-mix(in srgb, var(--tf-bg-brand-solid) 10%, transparent)', color: 'var(--tf-bg-brand-solid)' }}
                  >
                    {ROLE_LABEL_MAP[role] ?? role} {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KickoffDashboardClient({ teamId, data }: Props) {
  const router = useRouter();
  const { phase, surveyStats, members, myRole, teamInsight } = data;
  const { total, submitted, canProceed } = surveyStats;

  const activeMembers = members.filter((m) => m.role !== 'observer');
  const observers = members.filter((m) => m.role === 'observer');

  const progressPercent = total > 0 ? Math.round((submitted / total) * 100) : 0;

  const isPhaseComplete = phase === 'survey_complete';

  function handleTopicClick() {
    router.push(`/team/${teamId}/topic`);
  }

  return (
    <div
      className="min-h-screen pb-8"
      style={{ background: 'var(--tf-bg-layer-alt)' }}
    >
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* 1. 팀 상태 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: 'var(--tf-fg-default)' }}
            >
              킥오프 현황
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Users className="w-4 h-4" style={{ color: 'var(--tf-fg-muted)' }} />
              <span className="text-sm" style={{ color: 'var(--tf-fg-muted)' }}>
                {total}명
              </span>
            </div>
          </div>
          <span
            className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold"
            style={
              isPhaseComplete
                ? {
                    background: 'color-mix(in srgb, var(--tf-fg-positive) 12%, transparent)',
                    color: 'var(--tf-fg-positive)',
                  }
                : {
                    background: 'color-mix(in srgb, var(--tf-fg-warning) 12%, transparent)',
                    color: 'var(--tf-fg-warning)',
                  }
            }
          >
            {PHASE_LABEL[phase]}
          </span>
        </div>

        {/* 2. 설문 현황 카드 */}
        <div
          className="rounded-xl p-4"
          style={{
            background: 'var(--tf-bg-layer-default)',
            border: '1px solid var(--tf-stroke-neutral)',
          }}
        >
          <h2
            className="text-base font-semibold mb-3"
            style={{ color: 'var(--tf-fg-default)' }}
          >
            팀 설문 현황
          </h2>

          {/* Progress bar */}
          <div
            className="w-full h-2.5 rounded-full overflow-hidden mb-2"
            style={{ background: 'var(--tf-stroke-neutral)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                background: canProceed
                  ? 'var(--tf-fg-positive)'
                  : 'var(--tf-bg-brand-solid)',
              }}
              role="progressbar"
              aria-valuenow={submitted}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-label="설문 제출 현황"
            />
          </div>

          <div className="flex items-center justify-between">
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--tf-fg-default)' }}
            >
              {submitted}/{total}명 제출 완료
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--tf-fg-muted)' }}
            >
              {progressPercent}%
            </span>
          </div>

          <p
            className="text-sm mt-2"
            style={{
              color: canProceed ? 'var(--tf-fg-positive)' : 'var(--tf-fg-warning)',
            }}
          >
            {canProceed
              ? '모든 팀원이 설문을 완료했어요!'
              : `${total - submitted}명이 아직 제출하지 않았어요`}
          </p>
        </div>

        {/* 3. 팀원 목록 */}
        <div
          className="rounded-xl p-4"
          style={{
            background: 'var(--tf-bg-layer-default)',
            border: '1px solid var(--tf-stroke-neutral)',
          }}
        >
          <h2
            className="text-base font-semibold mb-1"
            style={{ color: 'var(--tf-fg-default)' }}
          >
            팀원
          </h2>

          <div
            className="divide-y"
            style={{ borderColor: 'var(--tf-stroke-neutral)' }}
          >
            {activeMembers.map((member) => (
              <MemberRow key={member.userId} member={member} />
            ))}
          </div>

          {observers.length > 0 && (
            <>
              <div
                className="flex items-center gap-2 mt-3 mb-1"
              >
                <div
                  className="flex-1 h-px"
                  style={{ background: 'var(--tf-stroke-neutral)' }}
                />
                <span
                  className="text-xs px-2"
                  style={{ color: 'var(--tf-fg-muted)' }}
                >
                  옵저버
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ background: 'var(--tf-stroke-neutral)' }}
                />
              </div>
              <div
                className="divide-y"
                style={{ borderColor: 'var(--tf-stroke-neutral)' }}
              >
                {observers.map((member) => (
                  <MemberRow key={member.userId} member={member} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* 4. 팀 스킬 인사이트 (survey_complete 시에만) */}
        {teamInsight && <TeamInsightPanel insight={teamInsight} />}

        {/* 5. 내 결과 보기 */}
        {myRole !== 'observer' && (
          <button
            onClick={() => router.push(`/team/${teamId}/result`)}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              background: 'var(--tf-bg-layer-default)',
              color: 'var(--tf-bg-brand-solid)',
              border: '1.5px solid var(--tf-bg-brand-solid)',
            }}
          >
            내 스킬 결과 보기
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* 6. 다음 단계 */}
        <div
          className="rounded-xl p-4"
          style={{
            background: 'var(--tf-bg-layer-default)',
            border: '1px solid var(--tf-stroke-neutral)',
          }}
        >
          <h2
            className="text-base font-semibold mb-1"
            style={{ color: 'var(--tf-fg-default)' }}
          >
            다음 단계
          </h2>
          <p
            className="text-sm mb-3"
            style={{ color: 'var(--tf-fg-muted)' }}
          >
            킥오프 주제를 결정하고 팀의 방향을 설정하세요.
          </p>

          {!canProceed && (
            <p
              className="text-xs mb-3"
              style={{ color: 'var(--tf-fg-warning)' }}
            >
              모든 팀원의 설문 제출 후 진행할 수 있어요.
            </p>
          )}

          <button
            onClick={canProceed ? handleTopicClick : undefined}
            disabled={!canProceed}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-semibold transition-opacity"
            style={
              canProceed
                ? {
                    background: 'var(--tf-bg-brand-solid)',
                    color: 'white',
                  }
                : {
                    background: 'var(--tf-stroke-neutral)',
                    color: 'var(--tf-fg-muted)',
                    cursor: 'not-allowed',
                    opacity: 0.6,
                  }
            }
          >
            킥오프 주제 결정
            <ChevronRight className="w-4 h-4" />
          </button>
          {!canProceed && (
            <p className="text-xs text-center mt-2" style={{ color: 'var(--tf-fg-muted)' }}>
              전원 설문 완료 후 활성화됩니다
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
