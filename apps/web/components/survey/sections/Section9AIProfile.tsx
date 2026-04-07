'use client';

import {
  Code2, Server, Database, Shield, Terminal, TestTube2,
  FileText, Calendar, BarChart2, Bot, Wifi,
  Lightbulb, Bug, Search, BookOpen,
  CircleHelp, ScanSearch, ShieldCheck,
  Handshake,
} from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

interface Props {
  answers: Record<string, unknown>;
  updateAnswers: (a: Record<string, unknown>) => void;
}

const SYSTEM_BLOCKS = [
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

const AI_PREFERENCES: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'ideation', label: '아이디어 정리', Icon: Lightbulb },
  { key: 'code_draft', label: '코드 초안', Icon: Code2 },
  { key: 'debugging', label: '디버깅', Icon: Bug },
  { key: 'docs', label: '문서 정리', Icon: FileText },
  { key: 'review', label: '코드 리뷰', Icon: Search },
  { key: 'learning', label: '학습 보조', Icon: BookOpen },
];

const VERIFICATION_LEVELS: {
  level: number;
  label: string;
  desc: string;
  Icon: LucideIcon;
}[] = [
  { level: 1, label: '검증 어려움', desc: 'AI 결과 그대로', Icon: CircleHelp },
  { level: 2, label: '일부 검증', desc: '핵심만 확인', Icon: ScanSearch },
  { level: 3, label: '직접 검증', desc: '항상 확인함', Icon: ShieldCheck },
];

const PAIR_OPTIONS: { value: boolean; label: string; Icon: LucideIcon }[] = [
  { value: true, label: '네, 편해요', Icon: Bot },
  { value: false, label: '아직 어색해요', Icon: Handshake },
];

interface AIProfile {
  preferences: string[];
  verificationLevel: number | null;
  pairComfort: boolean;
  selfLeadBlocks: string[];
}

const DEFAULT_PROFILE: AIProfile = {
  preferences: [],
  verificationLevel: null,
  pairComfort: false,
  selfLeadBlocks: [],
};

export default function Section9AIProfile({ answers, updateAnswers }: Props) {
  const aiProfile = (answers.aiProfile ?? DEFAULT_PROFILE) as AIProfile;

  const updateProfile = (partial: Partial<AIProfile>) => {
    updateAnswers({ aiProfile: { ...aiProfile, ...partial } });
  };

  const togglePreference = (key: string) => {
    const current = aiProfile.preferences ?? [];
    const updated = current.includes(key)
      ? current.filter((p) => p !== key)
      : [...current, key];
    updateProfile({ preferences: updated });
  };

  const toggleSelfLeadBlock = (key: string) => {
    const current = aiProfile.selfLeadBlocks ?? [];
    const updated = current.includes(key)
      ? current.filter((b) => b !== key)
      : [...current, key];
    updateProfile({ selfLeadBlocks: updated });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[18px] font-semibold mb-1" style={{ color: 'var(--tf-fg-default)' }}>
          이번 프로젝트에서 AI를 어떻게 쓸지 알려주세요
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--tf-fg-muted)' }}>
          이번 프로젝트에서 AI를 어떻게 활용할지 알려주세요
        </p>
      </div>

      {/* Q1: AI preferences */}
      <div className="space-y-3">
        <p className="text-[14px] font-medium" style={{ color: 'var(--tf-fg-default)' }}>
          Q1. AI에게 주로 도움받고 싶은 영역 (복수 선택)
        </p>
        <div className="grid grid-cols-2 gap-2">
          {AI_PREFERENCES.map(({ key, label, Icon }) => {
            const isSelected = (aiProfile.preferences ?? []).includes(key);
            return (
              <button
                key={key}
                onClick={() => togglePreference(key)}
                className="flex items-center gap-2 h-10 px-3 rounded-lg text-[13px] transition-all duration-150 ease-out border"
                style={{
                  background: isSelected ? 'var(--tf-bg-brand-solid)' : 'transparent',
                  color: isSelected ? 'var(--tf-fg-inverse)' : 'var(--tf-fg-muted)',
                  borderColor: isSelected ? 'var(--tf-bg-brand-solid)' : 'var(--tf-stroke-neutral)',
                }}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Q2: Verification level */}
      <div className="space-y-3">
        <p className="text-[14px] font-medium" style={{ color: 'var(--tf-fg-default)' }}>
          Q2. AI 결과를 어느 수준으로 검증할 수 있나요?
        </p>
        <div className="grid grid-cols-3 gap-3">
          {VERIFICATION_LEVELS.map(({ level, label, desc, Icon }) => {
            const isSelected = aiProfile.verificationLevel === level;
            return (
              <button
                key={level}
                onClick={() => updateProfile({ verificationLevel: level })}
                className="flex flex-col items-center gap-2 px-2 py-4 rounded-xl text-center transition-all duration-150 ease-out"
                style={{
                  border: isSelected
                    ? '2px solid var(--tf-stroke-brand)'
                    : '2px solid transparent',
                  background: isSelected ? 'var(--tf-bg-brand)' : 'var(--tf-bg-layer-default)',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isSelected
                    ? '0 0 0 1px var(--tf-stroke-neutral-muted)'
                    : '0 0 0 1px var(--tf-stroke-neutral)',
                }}
              >
                <Icon
                  className="w-6 h-6"
                  style={{
                    color: isSelected ? 'var(--tf-fg-brand)' : 'var(--tf-fg-muted)',
                  }}
                />
                <span
                  className="text-[12px] font-medium"
                  style={{
                    color: isSelected ? 'var(--tf-fg-brand)' : 'var(--tf-fg-default)',
                  }}
                >
                  {label}
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: 'var(--tf-fg-muted)' }}
                >
                  {desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Q3: Pair comfort */}
      <div className="space-y-3">
        <p className="text-[14px] font-medium" style={{ color: 'var(--tf-fg-default)' }}>
          Q3. AI와 페어처럼 함께 작업하는 게 편한가요?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {PAIR_OPTIONS.map(({ value, label, Icon }) => {
            const isSelected = aiProfile.pairComfort === value;
            return (
              <button
                key={String(value)}
                onClick={() => updateProfile({ pairComfort: value })}
                className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl transition-all duration-150 ease-out"
                style={{
                  border: isSelected
                    ? '2px solid var(--tf-stroke-brand)'
                    : '2px solid transparent',
                  background: isSelected ? 'var(--tf-bg-brand)' : 'var(--tf-bg-layer-default)',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isSelected
                    ? '0 0 0 1px var(--tf-stroke-neutral-muted)'
                    : '0 0 0 1px var(--tf-stroke-neutral)',
                }}
              >
                <Icon
                  className="w-6 h-6"
                  style={{
                    color: isSelected ? 'var(--tf-fg-brand)' : 'var(--tf-fg-muted)',
                  }}
                />
                <span
                  className="text-[14px] font-medium"
                  style={{
                    color: isSelected ? 'var(--tf-fg-brand)' : 'var(--tf-fg-default)',
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Q4: Self-lead blocks */}
      <div className="space-y-3">
        <p className="text-[14px] font-medium" style={{ color: 'var(--tf-fg-default)' }}>
          Q4. AI 없이도 스스로 리드 가능한 영역 (복수 선택)
        </p>
        <p className="text-[12px]" style={{ color: 'var(--tf-fg-subtle)' }}>
          AI 지원 없이 직접 맡을 수 있는 시스템 블록을 선택하세요
        </p>
        <div className="flex flex-wrap gap-2">
          {SYSTEM_BLOCKS.map(({ key, label, Icon }) => {
            const isSelected = (aiProfile.selfLeadBlocks ?? []).includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleSelfLeadBlock(key)}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] transition-all duration-150 ease-out border"
                style={{
                  background: isSelected ? 'var(--tf-bg-positive)' : 'transparent',
                  color: isSelected ? 'var(--tf-fg-positive)' : 'var(--tf-fg-muted)',
                  borderColor: isSelected ? 'var(--tf-stroke-positive)' : 'var(--tf-stroke-neutral)',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
