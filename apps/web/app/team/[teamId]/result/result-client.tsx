'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Trophy, TrendingUp } from 'lucide-react';

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
}

interface Props {
  teamId: string;
  data: ResultData;
}

const AXES = ['기획력', '기술력', '소통력', '추진력', '창의력', '성장력'] as const;

const ROLE_MAP: Record<string, { label: string; description: string }> = {
  initiator: { label: '추진자', description: '팀의 방향을 설정하고 적극적으로 일을 이끌어 나가요.' },
  architect: { label: '설계자', description: '구조와 시스템을 체계적으로 설계하는 역량이 뛰어나요.' },
  executor: { label: '실행자', description: '빠르게 구현하고 결과물을 만들어내는 능력이 강점이에요.' },
  coordinator: { label: '조율자', description: '팀원 간 소통을 원활히 하고 협업을 이끄는 역할이에요.' },
  documenter: { label: '기록자', description: '정보를 정리하고 지식을 체계적으로 관리하는 역할이에요.' },
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

export default function ResultClient({ teamId, data }: Props) {
  const router = useRouter();
  const { axisScores, strengths, growthAreas, suggestedRole, submittedAt } = data;

  const role = suggestedRole ? (ROLE_MAP[suggestedRole] ?? null) : null;
  const dataPoints = buildPolygonPoints(axisScores);
  const GRID_LEVELS = [20, 40, 60, 80, 100];

  const axisEndPoints = AXES.map((_, i) => gridPointForLevel(100, i));

  return (
    <div
      className="min-h-screen pb-8"
      style={{ background: 'var(--tf-bg-layer-alt)' }}
    >
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* 1. 상단 헤더 */}
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--tf-fg-default)' }}
          >
            내 스킬 분석
          </h1>
          {submittedAt && (
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--tf-fg-muted)' }}
            >
              {formatDate(submittedAt)} 제출
            </p>
          )}
        </div>

        {/* 2. 레이더 차트 */}
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
            역량 레이더
          </h2>
          <svg
            viewBox="0 0 400 400"
            aria-label="역량 레이더 차트"
            role="img"
            className="w-full max-w-sm mx-auto block"
          >
            {/* 그리드 다각형 */}
            {GRID_LEVELS.map((level) => (
              <polygon
                key={level}
                points={buildGridPolygonPoints(level)}
                fill="none"
                stroke="var(--tf-stroke-neutral)"
                strokeWidth="1"
              />
            ))}

            {/* 축 선 */}
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

            {/* 데이터 폴리곤 */}
            <polygon
              points={dataPoints}
              fill="var(--tf-bg-brand-solid)"
              fillOpacity="0.2"
              stroke="var(--tf-bg-brand-solid)"
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {/* 데이터 포인트 */}
            {AXES.map((axis, i) => {
              const pt = pointForValue(axisScores[axis], i);
              return (
                <circle
                  key={axis}
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  fill="var(--tf-bg-brand-solid)"
                />
              );
            })}

            {/* 축 라벨 */}
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

          {/* 축 점수 표 */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {AXES.map((axis) => (
              <div key={axis} className="flex flex-col items-center">
                <span
                  className="text-xs"
                  style={{ color: 'var(--tf-fg-muted)' }}
                >
                  {axis}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--tf-bg-brand-solid)' }}
                >
                  {axisScores[axis]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. 강점 카드 */}
        <div
          className="rounded-xl p-4"
          style={{
            background: 'var(--tf-bg-layer-default)',
            border: '2px solid var(--tf-fg-positive)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5" style={{ color: 'var(--tf-fg-positive)' }} />
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--tf-fg-default)' }}
            >
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

        {/* 4. 성장 영역 카드 */}
        <div
          className="rounded-xl p-4"
          style={{
            background: 'var(--tf-bg-layer-default)',
            border: '2px solid var(--tf-fg-warning)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5" style={{ color: 'var(--tf-fg-warning)' }} />
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--tf-fg-default)' }}
            >
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

        {/* 5. 추천 역할 카드 */}
        {role && (
          <div
            className="rounded-xl p-4"
            style={{
              background: 'var(--tf-bg-layer-default)',
              border: '2px solid var(--tf-bg-brand-solid)',
            }}
          >
            <h2
              className="text-base font-semibold mb-1"
              style={{ color: 'var(--tf-fg-default)' }}
            >
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

        {/* 6. 하단 CTA */}
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
    </div>
  );
}
