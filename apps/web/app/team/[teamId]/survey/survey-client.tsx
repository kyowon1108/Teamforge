'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check, Loader2, Save, AlertCircle } from 'lucide-react';
import { saveDraftAction, submitSurveyAction } from './actions';
import Section1BasicInfo from '@/components/survey/sections/Section1BasicInfo';
import Section2TechStack from '@/components/survey/sections/Section2TechStack';
import Section3ProjectExp from '@/components/survey/sections/Section3ProjectExp';
import Section4CollabStyle from '@/components/survey/sections/Section4CollabStyle';
import Section5Availability from '@/components/survey/sections/Section5Availability';
import Section6Portfolio from '@/components/survey/sections/Section6Portfolio';
import Section7Capability from '@/components/survey/sections/Section7Capability';
import Section8Collaboration from '@/components/survey/sections/Section8Collaboration';
import Section9AIProfile from '@/components/survey/sections/Section9AIProfile';

const SECTIONS = [
  { id: 1, title: '기본 정보', est: '~30초' },
  { id: 2, title: '기술 스택', est: '~90초' },
  { id: 3, title: '프로젝트 경험', est: '~60초' },
  { id: 4, title: '협업 스타일', est: '~45초' },
  { id: 5, title: '가용 시간', est: '~30초' },
  { id: 6, title: '포트폴리오', est: '~30초' },
  { id: 7, title: '시스템 블록 역할', est: '~90초' },
  { id: 8, title: '협업 습관', est: '~30초' },
  { id: 9, title: 'AI 활용 계획', est: '~60초' },
];

interface Props {
  teamId: string;
  initialAnswers: Record<string, unknown>;
  submitted: boolean;
  initialSection?: number;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// 서버 에러 메시지 whitelist — 외부에서 오는 data.message가 그대로 렌더링되지 않도록 정규화
const ALLOWED_SUBMIT_ERRORS = new Set([
  '제출에 실패했습니다.',
  '네트워크 오류가 발생했습니다.',
]);
function normalizeSubmitError(err: string): string {
  return ALLOWED_SUBMIT_ERRORS.has(err) ? err : '제출 중 오류가 발생했습니다. 다시 시도해 주세요.';
}

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
    case 7:
      return Object.keys((answers.blockConfidence as Record<string, unknown>) ?? {}).length >= 5;
    case 8:
      return answers.collabChecklist !== undefined;
    case 9: {
      const aiProfile = answers.aiProfile as { preferences?: string[]; verificationLevel?: number } | undefined;
      return (aiProfile?.preferences?.length ?? 0) >= 1 && aiProfile?.verificationLevel != null;
    }
    default:
      return true;
  }
}

export default function SurveyClient({ teamId, initialAnswers, initialSection = 1 }: Props) {
  const [currentSection, setCurrentSection] = useState(initialSection);
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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

  const TOTAL_SECTIONS = 9;

  const goNext = () => {
    if (currentSection < TOTAL_SECTIONS) setCurrentSection((s) => s + 1);
  };

  const goPrev = () => {
    if (currentSection > 1) setCurrentSection((s) => s - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const { error } = await submitSurveyAction(teamId, answers);
    if (error) {
      setSubmitError(normalizeSubmitError(error));
      setSubmitting(false);
      return;
    }
    // Screen 5: 개인 결과 페이지로 이동
    router.push(`/team/${teamId}/result`);
  };

  const currentValid = isSectionValid(currentSection, answers);
  const allSectionsValid = [1, 2, 3, 4, 5, 6, 7, 8, 9].every((s) => isSectionValid(s, answers));
  const progress = (currentSection / TOTAL_SECTIONS) * 100;
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
      case 7: return <Section7Capability {...props} />;
      case 8: return <Section8Collaboration {...props} />;
      case 9: return <Section9AIProfile {...props} />;
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
              {currentSectionMeta.title} ({currentSection}/{TOTAL_SECTIONS})
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
              aria-valuemax={TOTAL_SECTIONS}
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

      {/* Submit error */}
      {submitError && (
        <div
          className="fixed bottom-[65px] left-0 right-0 flex justify-center px-4 pointer-events-none"
          style={{ zIndex: 20 }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium shadow-md pointer-events-auto"
            style={{
              background: 'var(--tf-bg-layer-default)',
              color: 'var(--tf-fg-negative)',
              border: '1px solid var(--tf-stroke-negative)',
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {submitError}
          </div>
        </div>
      )}

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

          {currentSection < TOTAL_SECTIONS ? (
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
