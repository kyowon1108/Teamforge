'use client';

import { useRef } from 'react';
import { GitBranch, MessageSquare, AlertCircle } from 'lucide-react';

interface Props {
  answers: Record<string, unknown>;
  updateAnswers: (a: Record<string, unknown>) => void;
}

export default function Section6Portfolio({ answers, updateAnswers }: Props) {
  const githubUrl = (answers.githubUrl ?? '') as string;
  const selfIntro = (answers.selfIntro ?? '') as string;
  const githubInputRef = useRef<HTMLInputElement>(null);
  const selfIntroRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="space-y-8">
      <div>
        <h2
          className="text-[18px] font-semibold mb-1"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          있다면 포트폴리오를 남겨주세요
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--tf-fg-muted)' }}>
          선택 항목이에요. 적어주시면 팀이 당신을 더 빨리 이해할 수 있어요
        </p>
      </div>

      {/* Q14: GitHub URL */}
      <div
        className="rounded-xl p-4 space-y-3 cursor-text"
        style={{
          border: '1px solid var(--tf-stroke-neutral)',
          background: 'var(--tf-bg-layer-default)',
        }}
        onClick={() => githubInputRef.current?.focus()}
      >
        <div className="flex items-center gap-2">
          <GitBranch
            className="w-5 h-5 shrink-0"
            style={{ color: 'var(--tf-fg-brand)' }}
          />
          <p
            className="text-[14px] font-medium"
            style={{ color: 'var(--tf-fg-default)' }}
          >
            Q14. GitHub URL{' '}
            <span className="text-[12px]" style={{ color: 'var(--tf-fg-subtle)' }}>
              (선택)
            </span>
          </p>
        </div>
        <input
          ref={githubInputRef}
          type="url"
          value={githubUrl}
          onChange={(e) => updateAnswers({ githubUrl: e.target.value })}
          placeholder="https://github.com/username"
          className="w-full h-10 px-3 rounded-lg border text-[14px] placeholder:text-[var(--tf-fg-subtle)] focus:outline-none transition-shadow"
          style={{
            borderColor: 'var(--tf-stroke-neutral)',
            background: 'var(--tf-bg-layer-alt)',
            color: 'var(--tf-fg-default)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 2px var(--tf-stroke-focus)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <p className="text-[11px]" style={{ color: 'var(--tf-fg-subtle)' }}>
          GitHub 공개 정보(언어 통계, 커밋 빈도)를 수집합니다.
        </p>
      </div>

      {/* Q15: 자유 소개 */}
      <div
        className="rounded-xl p-4 space-y-3 cursor-text"
        style={{
          border: '1px solid var(--tf-stroke-neutral)',
          background: 'var(--tf-bg-layer-default)',
        }}
        onClick={() => selfIntroRef.current?.focus()}
      >
        <div className="flex items-center gap-2">
          <MessageSquare
            className="w-5 h-5 shrink-0"
            style={{ color: 'var(--tf-fg-brand)' }}
          />
          <p
            className="text-[14px] font-medium"
            style={{ color: 'var(--tf-fg-default)' }}
          >
            Q15. 팀에게 한마디{' '}
            <span className="text-[12px]" style={{ color: 'var(--tf-fg-subtle)' }}>
              (선택)
            </span>
          </p>
        </div>
        <textarea
          ref={selfIntroRef}
          value={selfIntro}
          onChange={(e) => updateAnswers({ selfIntro: e.target.value })}
          placeholder="팀원들에게 본인을 소개해주세요. 강점, 관심사, 기대하는 것 등 자유롭게 작성하세요."
          rows={4}
          maxLength={500}
          className="w-full px-3 py-3 rounded-lg border text-[14px] placeholder:text-[var(--tf-fg-subtle)] focus:outline-none resize-none transition-shadow"
          style={{
            borderColor: 'var(--tf-stroke-neutral)',
            background: 'var(--tf-bg-layer-alt)',
            color: 'var(--tf-fg-default)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 2px var(--tf-stroke-focus)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <p
          className="text-[11px] text-right"
          style={{ color: 'var(--tf-fg-subtle)' }}
        >
          {selfIntro.length}/500
        </p>
      </div>

      {/* 안내 메시지 */}
      <div
        className="flex items-start gap-2 p-3 rounded-lg"
        style={{ background: 'var(--tf-bg-layer-alt)' }}
      >
        <AlertCircle
          className="w-4 h-4 shrink-0 mt-0.5"
          style={{ color: 'var(--tf-fg-subtle)' }}
        />
        <p className="text-[11px]" style={{ color: 'var(--tf-fg-subtle)' }}>
          포트폴리오 정보는 AI 역할 분석에만 활용됩니다. 분석 완료 후 30일 뒤 자동
          삭제됩니다.
        </p>
      </div>
    </div>
  );
}
