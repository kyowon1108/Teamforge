'use client';

import {
  Code2, Server, Database, Shield, Terminal, TestTube2,
  FileText, Calendar, BarChart2, Bot, Wifi,
} from 'lucide-react';

interface Props {
  answers: Record<string, unknown>;
  updateAnswers: (a: Record<string, unknown>) => void;
}

const CONFIDENCE_LEVELS = [
  { value: 'lead', label: '리드 가능', desc: '이 영역을 주도적으로 맡을 수 있어요' },
  { value: 'contribute', label: '기여 가능', desc: '팀원과 함께 할 수 있어요' },
  { value: 'learn', label: '배우면 가능', desc: '현재 학습 중이에요' },
  { value: 'cant', label: '맡기 어려움', desc: '이번 프로젝트에서는 어려워요' },
] as const;

type ConfidenceValue = 'lead' | 'contribute' | 'learn' | 'cant';

const BLOCKS = [
  { key: 'ui', label: 'UI 구현', Icon: Code2 },
  { key: 'api', label: 'API 설계', Icon: Server },
  { key: 'db', label: 'DB 모델링', Icon: Database },
  { key: 'auth', label: '인증/권한', Icon: Shield },
  { key: 'devops', label: '배포/인프라', Icon: Terminal },
  { key: 'testing', label: '테스트/QA', Icon: TestTube2 },
  { key: 'docs', label: '문서화', Icon: FileText },
  { key: 'pm', label: '일정/조율', Icon: Calendar },
  { key: 'data', label: '데이터 처리', Icon: BarChart2 },
  { key: 'ai_feat', label: 'AI 기능', Icon: Bot },
  { key: 'realtime', label: '실시간 기능', Icon: Wifi },
] as const;

const CONFIDENCE_COLORS: Record<ConfidenceValue, { border: string; bg: string; text: string }> = {
  lead: { border: 'var(--tf-stroke-brand)', bg: 'var(--tf-bg-brand)', text: 'var(--tf-fg-brand)' },
  contribute: { border: 'var(--tf-stroke-positive)', bg: 'var(--tf-bg-positive)', text: 'var(--tf-fg-positive)' },
  learn: { border: 'var(--tf-stroke-caution)', bg: 'var(--tf-bg-caution)', text: 'var(--tf-fg-caution)' },
  cant: { border: 'var(--tf-stroke-neutral)', bg: 'var(--tf-bg-layer-alt)', text: 'var(--tf-fg-subtle)' },
};

export default function Section7Capability({ answers, updateAnswers }: Props) {
  const blockConfidence = (answers.blockConfidence ?? {}) as Record<string, ConfidenceValue>;

  const setConfidence = (blockKey: string, level: ConfidenceValue) => {
    const updated = { ...blockConfidence, [blockKey]: level };
    updateAnswers({ blockConfidence: updated });
  };

  const answeredCount = Object.keys(blockConfidence).length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[18px] font-semibold mb-1" style={{ color: 'var(--tf-fg-default)' }}>
          시스템 블록 역할
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--tf-fg-muted)' }}>
          각 영역에서 이번 프로젝트에 얼마나 기여할 수 있는지 알려주세요
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {CONFIDENCE_LEVELS.map((level) => {
          const colors = CONFIDENCE_COLORS[level.value];
          return (
            <span
              key={level.value}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border"
              style={{ borderColor: colors.border, background: colors.bg, color: colors.text }}
            >
              {level.label}
            </span>
          );
        })}
      </div>

      {/* Block grid */}
      <div className="space-y-3">
        {BLOCKS.map(({ key, label, Icon }) => {
          const current = blockConfidence[key];
          return (
            <div
              key={key}
              className="rounded-xl border p-4"
              style={{ borderColor: 'var(--tf-stroke-neutral)', background: 'var(--tf-bg-layer-default)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--tf-fg-brand)' }} />
                <span className="text-[14px] font-medium" style={{ color: 'var(--tf-fg-default)' }}>
                  {label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CONFIDENCE_LEVELS.map((level) => {
                  const isSelected = current === level.value;
                  const colors = CONFIDENCE_COLORS[level.value];
                  return (
                    <button
                      key={level.value}
                      onClick={() => setConfidence(key, level.value)}
                      className="flex flex-col items-center px-2 py-2 rounded-lg border text-center transition-all"
                      style={{
                        borderColor: isSelected ? colors.border : 'var(--tf-stroke-neutral)',
                        background: isSelected ? colors.bg : 'transparent',
                        color: isSelected ? colors.text : 'var(--tf-fg-muted)',
                      }}
                    >
                      <span className="text-[12px] font-medium leading-tight">{level.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p
        className="text-[12px] text-center"
        style={{ color: answeredCount >= 5 ? 'var(--tf-fg-positive)' : 'var(--tf-fg-subtle)' }}
      >
        {answeredCount}/11 블록 응답 완료
        {answeredCount < 5 && ` (최소 5개 응답 필요)`}
      </p>
    </div>
  );
}
