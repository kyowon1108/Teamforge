'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Crown,
  Users,
  Eye,
  Lock,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Vote,
  FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTeamSocket } from '@/hooks/useTeamSocket';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SourceIdea {
  id: string;
  title: string;
  userName?: string;
}

export interface TopicItem {
  id: string;
  title: string;
  rationale: string;
  tags: string[];
  aiGenerated: boolean;
  confirmedAt: string | null;
  reactions: Array<{ userId: string; reaction: 'agree' | 'concern' | 'vote' }>;
  sourceIdeaIds?: string[];
  sourceIdeas?: SourceIdea[];
}

interface VoteState {
  voteCount: number;
  myVoted: boolean;
}

export interface TopicDecisionClientProps {
  teamId: string;
  initialData: Record<string, unknown>;
  httpStatus: number;
  userRole: 'leader' | 'member' | 'observer';
}

type ViewStatus = 'loading' | 'completed' | 'failed' | 'timeout';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const MAX_VOTES = 2;

const POLL_LABELS: Record<number, string> = {
  0: '팀 설문을 분석하고 있습니다',
  1: '팀 설문을 분석하고 있습니다',
  2: 'AI가 주제를 생성하고 있습니다',
  3: 'AI가 주제를 생성하고 있습니다',
  4: '거의 완료됐습니다',
};

// ---------------------------------------------------------------------------
// Helper: build vote map from topics
// ---------------------------------------------------------------------------

function buildVoteMap(
  topics: TopicItem[],
  currentUserId?: string
): Record<string, VoteState> {
  const map: Record<string, VoteState> = {};
  for (const topic of topics) {
    let voteCount = 0;
    let myVoted = false;
    for (const r of topic.reactions) {
      if (r.reaction === 'vote') {
        voteCount++;
        if (currentUserId && r.userId === currentUserId) {
          myVoted = true;
        }
      }
    }
    map[topic.id] = { voteCount, myVoted };
  }
  return map;
}

function countMyVotes(votes: Record<string, VoteState>): number {
  return Object.values(votes).filter((v) => v.myVoted).length;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RoleIntentBanner({
  role,
  isLocked,
}: {
  role: 'leader' | 'member' | 'observer';
  isLocked: boolean;
}) {
  if (isLocked) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg p-3 border text-sm font-medium"
        style={{
          background: 'color-mix(in srgb, var(--tf-fg-positive) 10%, transparent)',
          borderColor: 'color-mix(in srgb, var(--tf-fg-positive) 30%, transparent)',
          color: 'var(--tf-fg-positive)',
        }}
      >
        <Lock size={16} className="shrink-0" />
        킥오프 주제가 확정되었습니다.
      </div>
    );
  }

  if (role === 'leader') {
    return (
      <div
        className="flex items-center gap-2 rounded-lg p-3 border text-sm"
        style={{
          background: 'color-mix(in srgb, var(--tf-bg-brand-solid) 10%, transparent)',
          borderColor: 'color-mix(in srgb, var(--tf-bg-brand-solid) 25%, transparent)',
          color: 'var(--tf-bg-brand-solid)',
        }}
      >
        <Crown size={16} className="shrink-0" />
        팀원들의 투표를 확인하고 주제를 확정하세요. 각 팀원은 2표를 행사할 수 있습니다.
      </div>
    );
  }

  if (role === 'member') {
    return (
      <div
        className="flex items-center gap-2 rounded-lg p-3 border text-sm"
        style={{
          background: 'color-mix(in srgb, var(--tf-fg-info) 10%, transparent)',
          borderColor: 'color-mix(in srgb, var(--tf-fg-info) 25%, transparent)',
          color: 'var(--tf-fg-info)',
        }}
      >
        <Users size={16} className="shrink-0" />
        관심 있는 주제에 투표해 주세요 (최대 2표).
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 rounded-lg p-3 border text-sm"
      style={{
        background: 'var(--tf-bg-layer-alt)',
        borderColor: 'var(--tf-stroke-neutral)',
        color: 'var(--tf-fg-muted)',
      }}
    >
      <Eye size={16} className="shrink-0" />
      관찰자 모드입니다. 주제 결정을 볼 수 있지만 참여할 수 없습니다.
    </div>
  );
}

function VoteCounter({ used, max }: { used: number; max: number }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg p-3 mb-4"
      style={{
        background: 'var(--tf-bg-layer-default)',
        border: '1px solid var(--tf-stroke-neutral)',
      }}
    >
      <Vote size={16} style={{ color: 'var(--tf-bg-brand-solid)' }} />
      <span className="text-sm font-medium" style={{ color: 'var(--tf-fg-default)' }}>
        남은 투표: {max - used}/{max}
      </span>
      <div className="flex gap-1 ml-auto">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full"
            style={{
              background: i < used ? 'var(--tf-bg-brand-solid)' : 'var(--tf-stroke-neutral)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function VoteBar({ count, maxCount }: { count: number; maxCount: number }) {
  const width = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-2 mt-2">
      <div
        className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--tf-bg-layer-alt)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${width}%`,
            background: 'var(--tf-bg-brand-solid)',
          }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--tf-fg-default)' }}>
        {count}표
      </span>
    </div>
  );
}

function SourceIdeasAccordion({ sourceIdeas }: { sourceIdeas: SourceIdea[] }) {
  const [open, setOpen] = useState(false);

  if (sourceIdeas.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex items-center gap-1.5 text-xs font-medium transition-colors"
        style={{ color: 'var(--tf-fg-muted)' }}
      >
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        원본 아이디어 {sourceIdeas.length}개
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-1.5 pl-3">
          {sourceIdeas.map((idea) => (
            <div
              key={idea.id}
              className="text-xs py-1.5 px-2.5 rounded"
              style={{
                background: 'var(--tf-bg-layer-alt)',
                color: 'var(--tf-fg-muted)',
                borderLeft: '2px solid var(--tf-stroke-neutral)',
              }}
            >
              {idea.userName && (
                <span className="font-medium" style={{ color: 'var(--tf-fg-default)' }}>
                  {idea.userName}
                </span>
              )}
              {idea.userName && ' — '}
              {idea.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TopicLoadingState({ pollCount }: { pollCount: number }) {
  const label = POLL_LABELS[Math.min(pollCount, 4)] ?? '처리 중입니다';
  return (
    <div className="mt-6">
      <div
        className="flex items-center gap-3 mb-6 rounded-lg p-4"
        style={{
          background: 'color-mix(in srgb, var(--tf-bg-brand-solid) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--tf-bg-brand-solid) 20%, transparent)',
        }}
      >
        <Loader2 size={20} className="animate-spin shrink-0" style={{ color: 'var(--tf-bg-brand-solid)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--tf-bg-brand-solid)' }}>
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl w-full" />
        ))}
      </div>
    </div>
  );
}

function TopicErrorBanner() {
  return (
    <div
      className="flex items-center gap-3 rounded-lg p-4 border mt-6"
      style={{
        background: 'color-mix(in srgb, var(--tf-fg-negative) 10%, transparent)',
        borderColor: 'color-mix(in srgb, var(--tf-fg-negative) 25%, transparent)',
        color: 'var(--tf-fg-negative)',
      }}
    >
      <AlertCircle size={20} className="shrink-0" />
      <div>
        <p className="text-sm font-semibold">주제 생성에 실패했습니다</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--tf-fg-muted)' }}>
          팀 설문 데이터를 다시 확인하거나 잠시 후 시도해 주세요.
        </p>
      </div>
    </div>
  );
}

function TopicTimeoutBanner() {
  return (
    <div
      className="flex items-center gap-3 rounded-lg p-4 border mt-6"
      style={{
        background: 'color-mix(in srgb, var(--tf-fg-warning) 10%, transparent)',
        borderColor: 'color-mix(in srgb, var(--tf-fg-warning) 25%, transparent)',
        color: 'var(--tf-fg-warning)',
      }}
    >
      <Clock size={20} className="shrink-0" />
      <div>
        <p className="text-sm font-semibold">응답 시간이 초과되었습니다</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--tf-fg-muted)' }}>
          페이지를 새로고침하면 생성된 주제를 확인할 수 있습니다.
        </p>
      </div>
    </div>
  );
}

function DecisionCard({
  topic,
  userRole,
  isLocked,
  isConfirmed,
  isSelected,
  vote,
  maxVoteCount,
  canVote,
  onSelect,
  onVote,
}: {
  topic: TopicItem;
  userRole: 'leader' | 'member' | 'observer';
  isLocked: boolean;
  isConfirmed: boolean;
  isSelected: boolean;
  vote: VoteState;
  maxVoteCount: number;
  canVote: boolean;
  onSelect: () => void;
  onVote: () => void;
}) {
  const borderColor = isConfirmed || isSelected
    ? 'var(--tf-bg-brand-solid)'
    : 'var(--tf-stroke-neutral)';

  const voteDisabled = !canVote && !vote.myVoted;

  return (
    <div
      className="rounded-xl p-5 transition-colors"
      style={{
        background: 'var(--tf-bg-layer-default)',
        border: `1.5px solid ${borderColor}`,
      }}
      onClick={userRole === 'leader' && !isLocked ? onSelect : undefined}
      role={userRole === 'leader' && !isLocked ? 'button' : undefined}
      tabIndex={userRole === 'leader' && !isLocked ? 0 : undefined}
      onKeyDown={
        userRole === 'leader' && !isLocked
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelect();
            }
          : undefined
      }
      aria-pressed={userRole === 'leader' ? isSelected : undefined}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {userRole === 'leader' && !isLocked && (
              <div
                className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                style={{
                  borderColor: isSelected ? 'var(--tf-bg-brand-solid)' : 'var(--tf-stroke-neutral)',
                  background: isSelected ? 'var(--tf-bg-brand-solid)' : 'transparent',
                }}
              >
                {isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
            )}
            <p className="font-semibold text-base" style={{ color: 'var(--tf-fg-default)' }}>
              {topic.title}
            </p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--tf-fg-muted)' }}>
            {topic.rationale}
          </p>
        </div>
        {isConfirmed && (
          <Badge
            className="shrink-0"
            style={{
              background: 'color-mix(in srgb, var(--tf-fg-positive) 12%, transparent)',
              color: 'var(--tf-fg-positive)',
              border: 'none',
            }}
          >
            확정된 주제
          </Badge>
        )}
      </div>

      {/* Tags */}
      {topic.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {topic.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Source ideas accordion */}
      {topic.sourceIdeas && topic.sourceIdeas.length > 0 && (
        <SourceIdeasAccordion sourceIdeas={topic.sourceIdeas} />
      )}

      {/* Vote bar */}
      <VoteBar count={vote.voteCount} maxCount={maxVoteCount} />

      {/* Divider */}
      <div
        className="h-px my-3"
        style={{ background: 'var(--tf-stroke-neutral)' }}
      />

      {/* Footer row */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs" style={{ color: 'var(--tf-fg-muted)' }}>
          {vote.voteCount}표 획득
        </span>

        {/* Vote button for members */}
        {(userRole === 'member' || userRole === 'leader') && !isLocked && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVote();
            }}
            disabled={voteDisabled}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
            style={{
              minHeight: '36px',
              background: vote.myVoted
                ? 'var(--tf-bg-brand-solid)'
                : 'color-mix(in srgb, var(--tf-bg-brand-solid) 10%, transparent)',
              color: vote.myVoted ? 'white' : 'var(--tf-bg-brand-solid)',
              border: vote.myVoted
                ? 'none'
                : '1px solid color-mix(in srgb, var(--tf-bg-brand-solid) 30%, transparent)',
            }}
            aria-label={vote.myVoted ? '투표 취소' : '투표하기'}
            aria-pressed={vote.myVoted}
          >
            <Vote size={14} />
            {vote.myVoted ? '투표함' : '투표하기'}
          </button>
        )}
      </div>
    </div>
  );
}

function ManualTopicAccordion({ onSubmit }: { onSubmit: (title: string, rationale: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [rationale, setRationale] = useState('');

  function handleSubmit() {
    if (!title.trim()) return;
    onSubmit(title.trim(), rationale.trim());
    setTitle('');
    setRationale('');
    setOpen(false);
  }

  return (
    <div
      className="mt-4 rounded-xl border overflow-hidden"
      style={{
        background: 'var(--tf-bg-layer-default)',
        borderColor: 'var(--tf-stroke-neutral)',
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium"
        style={{ minHeight: '44px', color: 'var(--tf-fg-default)' }}
        aria-expanded={open}
      >
        직접 주제 입력하기
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="px-5 pb-5 flex flex-col gap-3">
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--tf-fg-muted)' }}
            >
              주제 제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 팀 협업 도구 개선 플랫폼"
              maxLength={100}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
              style={{
                background: 'var(--tf-bg-layer-alt)',
                border: '1px solid var(--tf-stroke-neutral)',
                color: 'var(--tf-fg-default)',
                minHeight: '44px',
              }}
            />
          </div>
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--tf-fg-muted)' }}
            >
              설명 (선택)
            </label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="주제를 선택한 이유나 배경을 입력하세요"
              rows={3}
              maxLength={500}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 resize-none"
              style={{
                background: 'var(--tf-bg-layer-alt)',
                border: '1px solid var(--tf-stroke-neutral)',
                color: 'var(--tf-fg-default)',
              }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="w-full rounded-lg font-semibold text-sm transition-opacity disabled:opacity-40"
            style={{
              minHeight: '44px',
              background: 'var(--tf-bg-brand-solid)',
              color: 'white',
            }}
          >
            주제 추가
          </button>
        </div>
      )}
    </div>
  );
}

function AiDecisionRecordCard({ rationale }: { rationale: string }) {
  const separator = '--- 결정 기록 ---';
  const sepIndex = rationale.indexOf(separator);
  if (sepIndex === -1) return null;

  const record = rationale.slice(sepIndex + separator.length).trim();
  if (!record) return null;

  return (
    <div
      className="rounded-xl p-5 mt-4"
      style={{
        background: 'var(--tf-bg-layer-default)',
        border: '1px solid var(--tf-stroke-neutral)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <FileText size={16} style={{ color: 'var(--tf-fg-info)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--tf-fg-default)' }}>
          AI 결정 기록
        </h3>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--tf-fg-muted)' }}>
        {record}
      </p>
    </div>
  );
}

function StickyActionGate({
  selectedTopicId,
  votes,
  onConfirm,
}: {
  selectedTopicId: string | null;
  votes: Record<string, VoteState>;
  onConfirm: () => void;
}) {
  const selectedVote = selectedTopicId ? votes[selectedTopicId] : null;
  const voteCount = selectedVote?.voteCount ?? 0;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 border-t"
      style={{
        background: 'var(--tf-bg-layer-default)',
        borderColor: 'var(--tf-stroke-neutral)',
        padding: 'calc(1rem) 1rem',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
      }}
    >
      {!selectedTopicId ? (
        <button
          disabled
          className="w-full rounded-lg font-semibold text-sm"
          style={{
            minHeight: '48px',
            background: 'var(--tf-stroke-neutral)',
            color: 'var(--tf-fg-muted)',
            cursor: 'not-allowed',
            opacity: 0.7,
          }}
        >
          주제를 선택해 주세요
        </button>
      ) : (
        <>
          <div className="flex items-center justify-center gap-3 mb-3 text-sm">
            <span className="flex items-center gap-1" style={{ color: 'var(--tf-fg-muted)' }}>
              <Vote size={14} />
              {voteCount}표 획득
            </span>
            {voteCount > 0 && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background: 'color-mix(in srgb, var(--tf-fg-positive) 12%, transparent)',
                  color: 'var(--tf-fg-positive)',
                }}
              >
                <CheckCircle size={12} />
                확정해도 안전해요
              </span>
            )}
          </div>
          <button
            onClick={onConfirm}
            className="w-full rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
            style={{
              minHeight: '48px',
              background: 'var(--tf-bg-brand-solid)',
              color: 'white',
            }}
          >
            확정하기
          </button>
        </>
      )}
    </div>
  );
}

function ConfirmTopicDialog({
  open,
  onClose,
  onConfirm,
  isLoading,
  topic,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  topic: TopicItem | undefined;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>주제를 확정할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            확정 후에는 변경할 수 없습니다.
            {topic && (
              <>
                <br />
                선택 주제: <strong style={{ color: 'var(--tf-fg-default)' }}>{topic.title}</strong>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isLoading}>
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            style={{ background: 'var(--tf-bg-brand-solid)', color: 'white' }}
          >
            {isLoading && <Loader2 size={16} className="animate-spin mr-2" />}
            확정하기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------

export default function TopicDecisionClient({
  teamId,
  initialData,
  httpStatus,
  userRole,
}: TopicDecisionClientProps) {
  const initialTopics = (initialData.topics as TopicItem[] | undefined) ?? [];
  const initialConfirmed = (initialData.confirmedTopic as TopicItem | null | undefined) ?? null;

  const [status, setStatus] = useState<ViewStatus>(() => {
    if (httpStatus === 202) return 'loading';
    if ((initialData.status as string | undefined) === 'failed') return 'failed';
    return 'completed';
  });

  const [topics, setTopics] = useState<TopicItem[]>(initialTopics);
  const [confirmedTopic, setConfirmedTopic] = useState<TopicItem | null>(initialConfirmed);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, VoteState>>(() =>
    buildVoteMap(initialTopics)
  );
  const [pollCount, setPollCount] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const myVoteCount = countMyVotes(votes);
  const maxVoteCount = Math.max(...Object.values(votes).map((v) => v.voteCount), 0);
  const canVoteMore = myVoteCount < MAX_VOTES;

  // -------------------------------------------------------------------------
  // Socket.io integration
  // -------------------------------------------------------------------------

  const handleSocketEvent = useCallback((event: string, data: unknown) => {
    switch (event) {
      case 'topic:vote_cast': {
        const d = data as { topicId: string; voteCount: number };
        setVotes((prev) => ({
          ...prev,
          [d.topicId]: {
            voteCount: d.voteCount,
            myVoted: prev[d.topicId]?.myVoted ?? false,
          },
        }));
        break;
      }
      case 'topic:confirmed': {
        const d = data as { topic: TopicItem };
        setConfirmedTopic(d.topic);
        break;
      }
    }
  }, []);

  const { transport } = useTeamSocket({
    teamId,
    onEvent: handleSocketEvent,
  });

  // -------------------------------------------------------------------------
  // Polling (loading state)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (status !== 'loading') return;
    if (pollCount >= 5) {
      setStatus('timeout');
      return;
    }

    const timer = setInterval(async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/teams/${teamId}/topic`,
          { credentials: 'include' }
        );

        if (res.status === 200) {
          const data = (await res.json()) as Record<string, unknown>;
          if ((data.status as string | undefined) === 'failed') {
            setStatus('failed');
            clearInterval(timer);
            return;
          }
          const newTopics = (data.topics as TopicItem[] | undefined) ?? [];
          const newConfirmed = (data.confirmedTopic as TopicItem | null | undefined) ?? null;
          setTopics(newTopics);
          setConfirmedTopic(newConfirmed);
          setVotes(buildVoteMap(newTopics));
          setStatus('completed');
          clearInterval(timer);
        } else {
          setPollCount((c) => c + 1);
        }
      } catch {
        setPollCount((c) => c + 1);
      }
    }, 5000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pollCount, teamId]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleVote = useCallback(
    async (topicId: string) => {
      const prev = votes[topicId];
      if (!prev) return;

      const isToggleOff = prev.myVoted;

      // Check if can vote more (unless toggling off)
      if (!isToggleOff && !canVoteMore) return;

      // Optimistic update
      setVotes((v) => ({
        ...v,
        [topicId]: {
          voteCount: isToggleOff ? prev.voteCount - 1 : prev.voteCount + 1,
          myVoted: !isToggleOff,
        },
      }));

      try {
        await fetch(`${API_URL}/api/teams/${teamId}/topic/react`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topicId, reaction: 'vote' }),
        });
      } catch {
        // Rollback on failure
        setVotes((v) => ({ ...v, [topicId]: prev }));
      }
    },
    [votes, teamId, canVoteMore]
  );

  const handleManualTopic = useCallback(
    (title: string, rationale: string) => {
      const newTopic: TopicItem = {
        id: `manual-${Date.now()}`,
        title,
        rationale,
        tags: [],
        aiGenerated: false,
        confirmedAt: null,
        reactions: [],
      };
      setTopics((t) => [...t, newTopic]);
      setVotes((v) => ({ ...v, [newTopic.id]: { voteCount: 0, myVoted: false } }));
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    if (!selectedTopicId) return;
    setIsConfirming(true);
    try {
      const res = await fetch(`${API_URL}/api/teams/${teamId}/topic/confirm`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: selectedTopicId }),
      });

      if (res.ok) {
        const confirmed = topics.find((t) => t.id === selectedTopicId);
        if (confirmed) setConfirmedTopic(confirmed);
        setConfirmDialogOpen(false);
      }
    } finally {
      setIsConfirming(false);
    }
  }, [selectedTopicId, teamId, topics]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const isLocked = !!confirmedTopic;

  return (
    <div className="min-h-screen" style={{ background: 'var(--tf-bg-layer-alt)' }}>
      <main className="max-w-2xl mx-auto px-4 py-6 pb-36">
        {/* Page title */}
        <h1
          className="text-2xl font-bold mb-4"
          style={{ color: 'var(--tf-fg-default)' }}
        >
          킥오프 주제 결정
        </h1>

        {/* Role intent banner */}
        <RoleIntentBanner role={userRole} isLocked={isLocked} />

        {/* Vote counter (members & leaders, not locked) */}
        {status === 'completed' && !isLocked && (userRole === 'member' || userRole === 'leader') && (
          <div className="mt-4">
            <VoteCounter used={myVoteCount} max={MAX_VOTES} />
          </div>
        )}

        {/* Status states */}
        {status === 'loading' && <TopicLoadingState pollCount={pollCount} />}
        {status === 'failed' && <TopicErrorBanner />}
        {status === 'timeout' && <TopicTimeoutBanner />}

        {/* Topic cards */}
        {status === 'completed' && topics.length > 0 && (
          <div className="flex flex-col gap-4 mt-4">
            {topics.map((topic) => (
              <DecisionCard
                key={topic.id}
                topic={topic}
                userRole={userRole}
                isLocked={isLocked}
                isConfirmed={confirmedTopic?.id === topic.id}
                isSelected={selectedTopicId === topic.id}
                vote={votes[topic.id] ?? { voteCount: 0, myVoted: false }}
                maxVoteCount={maxVoteCount}
                canVote={canVoteMore}
                onSelect={() => setSelectedTopicId(topic.id)}
                onVote={() => handleVote(topic.id)}
              />
            ))}
          </div>
        )}

        {/* AI Decision Record */}
        {confirmedTopic && <AiDecisionRecordCard rationale={confirmedTopic.rationale} />}

        {/* Leader: manual input accordion */}
        {userRole === 'leader' && status === 'completed' && !isLocked && (
          <ManualTopicAccordion onSubmit={handleManualTopic} />
        )}
      </main>

      {/* Leader: sticky action gate */}
      {userRole === 'leader' && !isLocked && status === 'completed' && (
        <StickyActionGate
          selectedTopicId={selectedTopicId}
          votes={votes}
          onConfirm={() => setConfirmDialogOpen(true)}
        />
      )}

      {/* Confirm dialog */}
      <ConfirmTopicDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirm}
        isLoading={isConfirming}
        topic={topics.find((t) => t.id === selectedTopicId)}
      />
    </div>
  );
}
