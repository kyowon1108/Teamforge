'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PhaseProgressBar from '@/components/brainstorm/PhaseProgressBar';
import TeamCapabilityBanner from '@/components/brainstorm/TeamCapabilityBanner';
import BrainstormTimer from '@/components/brainstorm/BrainstormTimer';
import IdeaSubmitForm from '@/components/brainstorm/IdeaSubmitForm';
import IdeaSubmissionCounter from '@/components/brainstorm/IdeaSubmissionCounter';
import IdeaCard, { type BrainstormIdea } from '@/components/brainstorm/IdeaCard';
import IdeaCardWall from '@/components/brainstorm/IdeaCardWall';
import BuildOnModal from '@/components/brainstorm/BuildOnModal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BrainstormPhase = 'ideation' | 'sharing' | 'clustering' | 'voting' | 'confirmed';

interface BrainstormSession {
  id: string;
  teamId: string;
  phase: BrainstormPhase;
  facilitationMode?: string;
  startedAt?: string | null;
  endAt?: string | null;
}

interface TeamCapability {
  topStrengths: string[];
  weakAreas?: string[];
  aiInterestCount?: number;
  memberCount: number;
}

export interface BrainstormClientProps {
  teamId: string;
  session: BrainstormSession;
  initialIdeas: BrainstormIdea[];
  teamCapability: TeamCapability | null;
  userRole: 'leader' | 'member' | 'observer';
  currentUserId?: string;
  submittedCount?: number;
  totalMembers?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const POLL_INTERVAL = 5000;

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------

export default function BrainstormClient({
  teamId,
  session: initialSession,
  initialIdeas,
  teamCapability,
  userRole,
  currentUserId,
  submittedCount: initSubmittedCount,
  totalMembers: initTotalMembers,
}: BrainstormClientProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<BrainstormPhase>(initialSession.phase);
  const [ideas, setIdeas] = useState<BrainstormIdea[]>(initialIdeas);
  const [submittedCount, setSubmittedCount] = useState(initSubmittedCount ?? 0);
  const [totalMembers, setTotalMembers] = useState(initTotalMembers ?? 0);
  const [advancing, setAdvancing] = useState(false);
  const [buildOnTarget, setBuildOnTarget] = useState<BrainstormIdea | null>(null);

  const myIdeas = ideas.filter((i) => i.userId === currentUserId);
  const sessionId = initialSession.id;

  // -------------------------------------------------------------------------
  // Redirect if phase is voting/confirmed
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (phase === 'voting' || phase === 'confirmed') {
      router.push(`/team/${teamId}/topic`);
    }
  }, [phase, teamId, router]);

  // -------------------------------------------------------------------------
  // Polling
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (phase === 'voting' || phase === 'confirmed') return;

    const timer = setInterval(async () => {
      try {
        if (phase === 'clustering') {
          // Poll topic endpoint for completion
          const res = await fetch(`${API_URL}/api/teams/${teamId}/topic`, {
            credentials: 'include',
          });
          if (res.status === 200) {
            router.push(`/team/${teamId}/topic`);
          }
          return;
        }

        // Poll brainstorm ideas
        const res = await fetch(`${API_URL}/api/teams/${teamId}/brainstorm/ideas`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = (await res.json()) as {
            ideas?: BrainstormIdea[];
            submittedCount?: number;
            totalMembers?: number;
            phase?: BrainstormPhase;
          };
          if (data.ideas) setIdeas(data.ideas);
          if (data.submittedCount != null) setSubmittedCount(data.submittedCount);
          if (data.totalMembers != null) setTotalMembers(data.totalMembers);
          if (data.phase && data.phase !== phase) setPhase(data.phase);
        }
      } catch {
        // Silently ignore poll errors
      }
    }, POLL_INTERVAL);

    return () => clearInterval(timer);
  }, [phase, teamId, router]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleIdeaSubmitted = useCallback(
    (idea: { id: string; title: string; description: string; type: 'original' }) => {
      const newIdea: BrainstormIdea = {
        ...idea,
        sessionId,
        userId: currentUserId,
        createdAt: new Date().toISOString(),
        user: { name: '' },
        reactions: [],
        buildOnAsChild: [],
      };
      setIdeas((prev) => [...prev, newIdea]);
    },
    [sessionId, currentUserId]
  );

  const handleBuildOnSubmitted = useCallback(
    (result: {
      id: string;
      title: string;
      description: string;
      type: 'build_on';
      parentIdeaId: string;
    }) => {
      const parentIdea = ideas.find((i) => i.id === result.parentIdeaId);
      const newIdea: BrainstormIdea = {
        id: result.id,
        title: result.title,
        description: result.description,
        type: 'build_on',
        sessionId,
        userId: currentUserId,
        createdAt: new Date().toISOString(),
        user: { name: '' },
        reactions: [],
        buildOnAsChild: parentIdea
          ? [{ parentIdea: { id: parentIdea.id, title: parentIdea.title } }]
          : [],
      };
      setIdeas((prev) => [...prev, newIdea]);
    },
    [sessionId, currentUserId, ideas]
  );

  const handleLike = useCallback(
    async (ideaId: string) => {
      // Optimistic toggle
      setIdeas((prev) =>
        prev.map((idea) => {
          if (idea.id !== ideaId) return idea;
          const reactions = idea.reactions ?? [];
          const existing = reactions.find(
            (r) => r.type === 'like' && r.userId === currentUserId
          );
          return {
            ...idea,
            reactions: existing
              ? reactions.filter((r) => !(r.type === 'like' && r.userId === currentUserId))
              : [...reactions, { type: 'like' as const, userId: currentUserId ?? '' }],
          };
        })
      );

      try {
        await fetch(`${API_URL}/api/teams/${teamId}/brainstorm/ideas/${ideaId}/react`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'like' }),
        });
      } catch {
        // Rollback on error would be complex; next poll will sync
      }
    },
    [teamId, currentUserId]
  );

  const handleComment = useCallback(
    async (ideaId: string, content: string) => {
      // Optimistic add
      setIdeas((prev) =>
        prev.map((idea) => {
          if (idea.id !== ideaId) return idea;
          const reactions = idea.reactions ?? [];
          return {
            ...idea,
            reactions: [
              ...reactions,
              { type: 'comment' as const, userId: currentUserId ?? '', content },
            ],
          };
        })
      );

      try {
        await fetch(`${API_URL}/api/teams/${teamId}/brainstorm/ideas/${ideaId}/react`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'comment', content }),
        });
      } catch {
        // next poll will sync
      }
    },
    [teamId, currentUserId]
  );

  const handleAdvance = useCallback(async () => {
    setAdvancing(true);
    try {
      const res = await fetch(`${API_URL}/api/teams/${teamId}/brainstorm/advance`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = (await res.json()) as { phase: BrainstormPhase };
        setPhase(data.phase);
      }
    } finally {
      setAdvancing(false);
    }
  }, [teamId]);

  // -------------------------------------------------------------------------
  // Render: Ideation Stage
  // -------------------------------------------------------------------------
  if (phase === 'ideation') {
    return (
      <div className="min-h-screen" style={{ background: 'var(--tf-bg-layer-alt)' }}>
        <main className="max-w-2xl mx-auto px-4 py-6">
          <h1
            className="text-2xl font-bold mb-4"
            style={{ color: 'var(--tf-fg-default)' }}
          >
            브레인스토밍
          </h1>

          <PhaseProgressBar current="ideation" />

          {teamCapability && <TeamCapabilityBanner capability={teamCapability} />}

          <BrainstormTimer duration={420} />

          <IdeaSubmitForm
            teamId={teamId}
            ideaCount={myIdeas.length}
            onSubmitted={handleIdeaSubmitted}
          />

          {/* My ideas list */}
          {myIdeas.length > 0 && (
            <>
              <h2
                className="text-sm font-semibold mb-2"
                style={{ color: 'var(--tf-fg-default)' }}
              >
                내가 작성한 아이디어
              </h2>
              <div className="flex flex-col gap-3 mb-4">
                {myIdeas.map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    isSharing={false}
                    userRole={userRole}
                  />
                ))}
              </div>
            </>
          )}

          <IdeaSubmissionCounter submitted={submittedCount} total={totalMembers} />

          {/* Leader advance button */}
          {userRole === 'leader' && (
            <button
              onClick={handleAdvance}
              disabled={advancing}
              className="w-full mt-4 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{
                minHeight: '48px',
                background: 'var(--tf-bg-brand-solid)',
                color: 'white',
              }}
            >
              {advancing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowRight size={16} />
              )}
              다음 단계: 아이디어 공유
            </button>
          )}
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Sharing Stage
  // -------------------------------------------------------------------------
  if (phase === 'sharing') {
    return (
      <div className="min-h-screen" style={{ background: 'var(--tf-bg-layer-alt)' }}>
        <main className="max-w-2xl mx-auto px-4 py-6">
          <h1
            className="text-2xl font-bold mb-4"
            style={{ color: 'var(--tf-fg-default)' }}
          >
            브레인스토밍
          </h1>

          <PhaseProgressBar current="sharing" />

          <p className="text-sm mb-4" style={{ color: 'var(--tf-fg-muted)' }}>
            팀원들의 아이디어를 살펴보고 공감, 코멘트, 발전시키기를 해보세요.
          </p>

          <IdeaCardWall
            ideas={ideas}
            userRole={userRole}
            onLike={handleLike}
            onComment={handleComment}
            onBuildOn={(idea) => setBuildOnTarget(idea)}
            currentUserId={currentUserId}
          />

          {/* Additional idea submission in sharing */}
          {userRole !== 'observer' && (
            <IdeaSubmitForm
              teamId={teamId}
              ideaCount={myIdeas.length}
              onSubmitted={handleIdeaSubmitted}
            />
          )}

          {/* Leader advance button */}
          {userRole === 'leader' && (
            <button
              onClick={handleAdvance}
              disabled={advancing}
              className="w-full mt-4 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{
                minHeight: '48px',
                background: 'var(--tf-bg-brand-solid)',
                color: 'white',
              }}
            >
              {advancing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowRight size={16} />
              )}
              아이디어 수집 마감 &rarr; AI 정리 시작
            </button>
          )}

          {/* Build-on modal */}
          {buildOnTarget && (
            <BuildOnModal
              parentIdea={buildOnTarget}
              teamId={teamId}
              onSubmitted={handleBuildOnSubmitted}
              onClose={() => setBuildOnTarget(null)}
            />
          )}
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Clustering Stage (loading)
  // -------------------------------------------------------------------------
  if (phase === 'clustering') {
    return (
      <div className="min-h-screen" style={{ background: 'var(--tf-bg-layer-alt)' }}>
        <main className="max-w-2xl mx-auto px-4 py-6">
          <h1
            className="text-2xl font-bold mb-4"
            style={{ color: 'var(--tf-fg-default)' }}
          >
            브레인스토밍
          </h1>

          <PhaseProgressBar current="clustering" />

          <div
            className="flex items-center gap-3 mb-6 rounded-lg p-4"
            style={{
              background: 'color-mix(in srgb, var(--tf-bg-brand-solid) 8%, transparent)',
              border:
                '1px solid color-mix(in srgb, var(--tf-bg-brand-solid) 20%, transparent)',
            }}
          >
            <Loader2
              size={20}
              className="animate-spin shrink-0"
              style={{ color: 'var(--tf-bg-brand-solid)' }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--tf-bg-brand-solid)' }}
            >
              AI가 아이디어를 정리하고 있습니다...
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl w-full" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Fallback (voting/confirmed redirect handled by useEffect above)
  // -------------------------------------------------------------------------
  return null;
}
