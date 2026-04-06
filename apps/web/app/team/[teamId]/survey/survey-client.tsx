'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check, Loader2, Save, AlertCircle } from 'lucide-react';
import { saveDraftAction, submitSurveyAction } from './actions';
import Section1BasicInfo from '@/components/survey/sections/Section1BasicInfo';
import Section2TechStack from '@/components/survey/sections/Section2TechStack';
import Section3ProjectExp from '@/components/survey/sections/Section3ProjectExp';
import Section4CollabStyle from '@/components/survey/sections/Section4CollabStyle';
import Section5Availability from '@/components/survey/sections/Section5Availability';
import Section6Portfolio from '@/components/survey/sections/Section6Portfolio';

const SECTIONS = [
  { id: 1, title: '기본 정보', est: '~30초' },
  { id: 2, title: '기술 스택', est: '~90초' },
  { id: 3, title: '프로젝트 경험', est: '~60초' },
  { id: 4, title: '협업 스타일', est: '~45초' },
  { id: 5, title: '가용 시간', est: '~30초' },
  { id: 6, title: '포트폴리오', est: '~30초' },
];

interface Props {
  teamId: string;
  initialAnswers: Record<string, unknown>;
  submitted: boolean;
  initialSection?: number;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function isSectionValid(section: number, answers: Record<string, unknown>): boolean {
  switch (section) {
    case 1:
      return answers.experienceTier != null && answers.backgroundType != null;
    case 2:
      return (
        Array.isArray(answers.techStackList) &&
        (answers.techStackList as string[]).length >= 1 &&
        Array.isArray(answers.topStrengths) &&
        (answers.topStrengths as string[]).length >= 1
      );
    case 3:
      return answers.projectCount != null && answers.gitCollabLevel != null;
    case 4:
      return (
        answers.workArchetype != null &&
        Array.isArray(answers.desiredRoles) &&
        (answers.desiredRoles as string[]).length >= 1
      );
    case 5:
      return answers.weeklyHours != null;
    case 6:
      return true;
    default:
      return true;
  }
}

export default function SurveyClient({ teamId, initialAnswers, initialSection = 1 }: Props) {
  const [currentSection, setCurrentSection] = useState(initialSection);
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const updateAnswers = useCallback(
    (sectionAnswers: Record<string, unknown>) => {
      const merged = { ...answers, ...sectionAnswers };
      setAnswers(merged);

      // 500ms debounce → 자동 임시저장
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaveStatus('saving');
        const { error } = await saveDraftAction(teamId, merged);
        if (error) {
          setSaveStatus('error');
        } else {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 3000);
        }
      }, 500);
    },
    [answers, teamId],
  );

  const goNext = () => {
    if (currentSection < 6) setCurrentSection((s) => s + 1);
  };

  const goPrev = () => {
    if (currentSection > 1) setCurrentSection((s) => s - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const { error } = await submitSurveyAction(teamId, answers);
    if (error) {
      console.error('[SurveyClient] 제출 실패:', error);
      setSubmitting(false);
      return;
    }
    // result 페이지로 이동 (없으면 dashboard fallback)
    router.push(`/team/${teamId}/result`);
  };

  const currentValid = isSectionValid(currentSection, answers);
  const allSectionsValid = [1, 2, 3, 4, 5, 6].every((s) => isSectionValid(s, answers));
  const progress = (currentSection / 6) * 100;
  const currentSectionMeta = SECTIONS[currentSection - 1]!;

  const renderSection = () => {
    const props = { answers, updateAnswers };
    switch (currentSection) {
      case 1: return <Section1BasicInfo {...props} />;
      case 2: return <Section2TechStack {...props} />;
      case 3: return <Section3ProjectExp {...props} />;
      case 4: return <Section4CollabStyle {...props} />;
      case 5: return <Section5Availability {...props} />;
      case 6: return <Section6Portfolio {...props} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--tf-bg-layer-alt)' }}>
      {/* Sticky header — progress bar */}
      <div
        className="sticky top-[var(--tf-app-header-height)] z-10 border-b"
        style={{
          background: 'var(--tf-bg-layer-default)',
          borderColor: 'var(--tf-stroke-neutral)',
        }}
      >
        <div className="max-w-[640px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[13px]"
              style={{ color: 'var(--tf-fg-muted)' }}
            >
              {currentSectionMeta.title} ({currentSection}/6)
            </span>
            <span
              className="text-[12px] flex items-center gap-1"
              style={{
                color:
                  saveStatus === 'error'
                    ? 'var(--tf-fg-negative)'
                    : saveStatus === 'saved'
                    ? 'var(--tf-fg-positive)'
                    : 'var(--tf-fg-subtle)',
              }}
            >
              {saveStatus === 'saving' && (
                <>
                  <Save className="w-3 h-3 animate-pulse" /> 저장 중...
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check className="w-3 h-3" /> 저장됨
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="w-3 h-3" /> 저장 실패
                </>
              )}
              {saveStatus === 'idle' && currentSectionMeta.est}
            </span>
          </div>
          {/* Progress bar */}
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--tf-stroke-neutral-muted)' }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: 'var(--tf-bg-brand-solid)',
              }}
              role="progressbar"
              aria-valuenow={currentSection}
              aria-valuemin={1}
              aria-valuemax={6}
              aria-label="설문 진행률"
            />
          </div>
          {/* Section step dots */}
          <div className="flex items-center justify-between mt-2 px-0.5">
            {SECTIONS.map((s) => (
              <div
                key={s.id}
                className="flex flex-col items-center gap-0.5"
              >
                <div
                  className="w-2 h-2 rounded-full transition-all duration-200"
                  style={{
                    background:
                      s.id < currentSection
                        ? 'var(--tf-bg-brand-solid)'
                        : s.id === currentSection
                        ? 'var(--tf-bg-brand-solid)'
                        : 'var(--tf-stroke-neutral)',
                    opacity: s.id === currentSection ? 1 : s.id < currentSection ? 0.7 : 0.4,
                    transform: s.id === currentSection ? 'scale(1.3)' : 'scale(1)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section content */}
      <div className="max-w-[640px] mx-auto px-4 py-8 pb-28">
        {renderSection()}
      </div>

      {/* Bottom navigation */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t"
        style={{
          background: 'var(--tf-bg-layer-default)',
          borderColor: 'var(--tf-stroke-neutral)',
        }}
      >
        <div
          className="max-w-[640px] mx-auto px-4 py-3 flex items-center justify-between"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            onClick={goPrev}
            disabled={currentSection === 1}
            className="flex items-center gap-1 h-10 px-4 rounded-lg text-[14px] font-medium transition-colors"
            style={{
              color: currentSection > 1 ? 'var(--tf-fg-default)' : 'var(--tf-fg-disabled)',
              cursor: currentSection === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft className="w-4 h-4" /> 이전
          </button>

          {currentSection < 6 ? (
            <button
              onClick={goNext}
              disabled={!currentValid}
              className="flex items-center gap-1 h-10 px-6 rounded-lg text-[14px] font-medium transition-all"
              style={{
                background: currentValid
                  ? 'var(--tf-bg-brand-solid)'
                  : 'var(--tf-stroke-neutral)',
                color: currentValid
                  ? 'var(--tf-fg-inverse)'
                  : 'var(--tf-fg-disabled)',
                cursor: !currentValid ? 'not-allowed' : 'pointer',
              }}
            >
              다음 <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !allSectionsValid}
              className="flex items-center gap-2 h-10 px-6 rounded-lg text-[14px] font-medium transition-all"
              style={{
                background:
                  !submitting && allSectionsValid
                    ? 'var(--tf-bg-brand-solid)'
                    : 'var(--tf-stroke-neutral)',
                color:
                  !submitting && allSectionsValid
                    ? 'var(--tf-fg-inverse)'
                    : 'var(--tf-fg-disabled)',
                opacity: submitting || !allSectionsValid ? 0.6 : 1,
                cursor: submitting || !allSectionsValid ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> 분석 중...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> 제출하기
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
