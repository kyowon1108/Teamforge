'use client';

import { Link, AlertCircle } from 'lucide-react';

interface Props {
  answers: Record<string, unknown>;
  updateAnswers: (a: Record<string, unknown>) => void;
}

export default function Section6Portfolio({ answers, updateAnswers }: Props) {
  const githubUrl = (answers.githubUrl ?? '') as string;

  return (
    <div className="space-y-8">
      <div>
        <h2
          className="text-[18px] font-semibold mb-1"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          포트폴리오
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--tf-fg-muted)' }}>
          선택 항목이에요. 입력하면 더 정확한 분석을 받을 수 있어요.
        </p>
      </div>

      {/* Q14: GitHub URL */}
      <div className="space-y-3">
        <p
          className="text-[14px] font-medium"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          Q14. GitHub URL{' '}
          <span className="text-[12px]" style={{ color: 'var(--tf-fg-subtle)' }}>
            (선택)
          </span>
        </p>
        <div className="flex items-center gap-2">
          <Link
            className="w-5 h-5 shrink-0"
            style={{ color: 'var(--tf-fg-muted)' }}
          />
          <input
            type="url"
            value={githubUrl}
            onChange={(e) => updateAnswers({ githubUrl: e.target.value })}
            placeholder="https://github.com/username"
            className="w-full h-11 px-3 rounded-lg border text-[14px] placeholder:text-[var(--tf-fg-subtle)] focus:outline-none transition-shadow"
            style={{
              borderColor: 'var(--tf-stroke-neutral)',
              background: 'var(--tf-bg-layer-default)',
              color: 'var(--tf-fg-default)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 2px var(--tf-stroke-focus)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
        <p className="text-[11px]" style={{ color: 'var(--tf-fg-subtle)' }}>
          GitHub 공개 정보(언어 통계, 커밋 빈도)를 수집합니다.
        </p>
      </div>

      {/* Q15: 자유 소개 */}
      <div className="space-y-3">
        <p
          className="text-[14px] font-medium"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          Q15. 팀에게 한마디{' '}
          <span className="text-[12px]" style={{ color: 'var(--tf-fg-subtle)' }}>
            (선택)
          </span>
        </p>
        <textarea
          value={(answers.selfIntro ?? '') as string}
          onChange={(e) => updateAnswers({ selfIntro: e.target.value })}
          placeholder="팀원들에게 본인을 소개해주세요. 강점, 관심사, 기대하는 것 등 자유롭게 작성하세요."
          rows={4}
          maxLength={500}
          className="w-full px-3 py-3 rounded-lg border text-[14px] placeholder:text-[var(--tf-fg-subtle)] focus:outline-none resize-none transition-shadow"
          style={{
            borderColor: 'var(--tf-stroke-neutral)',
            background: 'var(--tf-bg-layer-default)',
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
          {((answers.selfIntro ?? '') as string).length}/500
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
