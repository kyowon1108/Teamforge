'use client';

import {
  Check,
  GitPullRequest, ListTodo, FileText, Code2,
  MessageSquareReply, Handshake,
} from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

interface Props {
  answers: Record<string, unknown>;
  updateAnswers: (a: Record<string, unknown>) => void;
}

interface CollabChecklist {
  prReview: boolean;
  issueTracking: boolean;
  meetingNotes: boolean;
  codeReading: boolean;
  asyncResponse: boolean;
  conflictResolution: boolean;
}

const CHECKLIST_ITEMS: {
  key: keyof CollabChecklist;
  label: string;
  desc: string;
  Icon: LucideIcon;
}[] = [
  {
    key: 'prReview',
    label: 'PR 리뷰를 해본 적이 있다',
    desc: '코드 리뷰를 통해 피드백을 주고받은 경험이 있어요',
    Icon: GitPullRequest,
  },
  {
    key: 'issueTracking',
    label: '이슈를 쪼개고 기록하는 편이다',
    desc: '작업을 작은 단위로 나눠 이슈로 관리해요',
    Icon: ListTodo,
  },
  {
    key: 'meetingNotes',
    label: '회의 후 내용을 정리하는 편이다',
    desc: '회의 결과를 문서나 채널에 남겨요',
    Icon: FileText,
  },
  {
    key: 'codeReading',
    label: '다른 사람 코드 읽기가 불편하지 않다',
    desc: '낯선 코드베이스도 어느 정도 파악할 수 있어요',
    Icon: Code2,
  },
  {
    key: 'asyncResponse',
    label: '비동기 메시지 대응이 빠른 편이다',
    desc: '슬랙, 디스코드 등에서 빠르게 응답해요',
    Icon: MessageSquareReply,
  },
  {
    key: 'conflictResolution',
    label: '의견 충돌 시 합의점을 찾으려 한다',
    desc: '갈등 상황에서 조율하거나 중립을 유지해요',
    Icon: Handshake,
  },
];

const DEFAULT_CHECKLIST: CollabChecklist = {
  prReview: false,
  issueTracking: false,
  meetingNotes: false,
  codeReading: false,
  asyncResponse: false,
  conflictResolution: false,
};

export default function Section8Collaboration({ answers, updateAnswers }: Props) {
  const checklist = (answers.collabChecklist ?? DEFAULT_CHECKLIST) as CollabChecklist;

  const toggle = (key: keyof CollabChecklist) => {
    const updated = { ...checklist, [key]: !checklist[key] };
    updateAnswers({ collabChecklist: updated });
  };

  const answeredCount = Object.values(checklist).filter(Boolean).length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[18px] font-semibold mb-1" style={{ color: 'var(--tf-fg-default)' }}>
          평소 협업 습관을 체크해 주세요
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--tf-fg-muted)' }}>
          해당되는 것만 편하게 고르시면 됩니다
        </p>
      </div>

      <div className="space-y-3">
        {CHECKLIST_ITEMS.map(({ key, label, desc, Icon }) => {
          const checked = checklist[key];
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className="w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-150 ease-out"
              style={{
                border: checked
                  ? '2px solid var(--tf-stroke-brand)'
                  : '2px solid transparent',
                background: checked ? 'var(--tf-bg-brand)' : 'var(--tf-bg-layer-default)',
                boxShadow: checked
                  ? '0 0 0 1px var(--tf-stroke-neutral-muted)'
                  : '0 0 0 1px var(--tf-stroke-neutral)',
                transform: checked ? 'scale(1.01)' : 'scale(1)',
              }}
            >
              <div
                className="w-5 h-5 rounded-md border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all"
                style={{
                  borderColor: checked ? 'var(--tf-stroke-brand)' : 'var(--tf-stroke-neutral)',
                  background: checked ? 'var(--tf-bg-brand-solid)' : 'transparent',
                }}
              >
                {checked && (
                  <Check className="w-3 h-3" style={{ color: 'var(--tf-fg-inverse)' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon
                    className="w-4 h-4 shrink-0"
                    style={{
                      color: checked ? 'var(--tf-fg-brand)' : 'var(--tf-fg-muted)',
                    }}
                  />
                  <p
                    className="text-[14px] font-medium"
                    style={{ color: 'var(--tf-fg-default)' }}
                  >
                    {label}
                  </p>
                </div>
                <p
                  className="text-[12px] mt-0.5 pl-6"
                  style={{ color: 'var(--tf-fg-muted)' }}
                >
                  {desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[12px] text-center" style={{ color: 'var(--tf-fg-subtle)' }}>
        {answeredCount}개 선택됨 — 해당되지 않는 항목은 선택하지 않아도 됩니다
      </p>
    </div>
  );
}
