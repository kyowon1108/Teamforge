'use client';

import { Heart, MessageSquare, GitBranch, Link, Merge, Check } from 'lucide-react';
import { useState } from 'react';

export interface BrainstormIdea {
  id: string;
  sessionId?: string;
  userId?: string;
  title: string;
  description: string;
  type: 'original' | 'build_on' | 'merge';
  createdAt?: string;
  user?: { name: string; image?: string | null };
  reactions?: Array<{ type: 'like' | 'comment'; userId: string; content?: string }>;
  buildOnAsChild?: Array<{ parentIdea: { id: string; title: string } }>;
  mergeParents?: Array<{ id: string; title: string }>;
}

interface IdeaCardProps {
  idea: BrainstormIdea;
  isSharing: boolean;
  userRole: 'leader' | 'member' | 'observer';
  onLike?: (ideaId: string) => void;
  onComment?: (ideaId: string, content: string) => void;
  onBuildOn?: (idea: BrainstormIdea) => void;
  currentUserId?: string;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export default function IdeaCard({
  idea,
  isSharing,
  userRole,
  onLike,
  onComment,
  onBuildOn,
  currentUserId,
  selectable,
  selected,
  onSelect,
}: IdeaCardProps) {
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');

  const likeCount = idea.reactions?.filter((r) => r.type === 'like').length ?? 0;
  const commentCount = idea.reactions?.filter((r) => r.type === 'comment').length ?? 0;
  const hasLiked = idea.reactions?.some(
    (r) => r.type === 'like' && r.userId === currentUserId
  ) ?? false;

  const parentTitle = idea.buildOnAsChild?.[0]?.parentIdea?.title;
  const isInteractive = isSharing && userRole !== 'observer';

  function handleCommentSubmit() {
    if (!commentText.trim()) return;
    onComment?.(idea.id, commentText.trim());
    setCommentText('');
    setCommentOpen(false);
  }

  return (
    <div
      className="rounded-lg p-4 transition-all"
      style={{
        background: 'var(--tf-bg-layer-default)',
        border: selected
          ? '2px solid var(--tf-stroke-brand)'
          : '1px solid var(--tf-stroke-neutral)',
        transform: selected ? 'scale(1.02)' : undefined,
        position: 'relative',
      }}
    >
      {/* Selection checkbox */}
      {selectable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(idea.id);
          }}
          className="absolute top-3 right-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
          style={{
            borderColor: selected ? 'var(--tf-bg-brand-solid)' : 'var(--tf-stroke-neutral)',
            background: selected ? 'var(--tf-bg-brand-solid)' : 'transparent',
          }}
          aria-label={selected ? '선택 해제' : '아이디어 선택'}
          aria-pressed={selected}
        >
          {selected && <Check size={12} style={{ color: 'white' }} />}
        </button>
      )}

      {/* Merge parent chip */}
      {idea.type === 'merge' && idea.mergeParents && idea.mergeParents.length > 0 && (
        <div
          className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-md text-xs w-fit"
          style={{
            background: 'color-mix(in srgb, var(--tf-fg-info) 8%, transparent)',
            color: 'var(--tf-fg-info)',
          }}
        >
          <Merge size={12} />
          <span>{idea.mergeParents.map((p) => p.title).join(' + ')}에서 합침</span>
        </div>
      )}

      {/* Build-on chip */}
      {idea.type === 'build_on' && parentTitle && (
        <div
          className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-md text-xs w-fit"
          style={{
            background: 'color-mix(in srgb, var(--tf-bg-brand-solid) 8%, transparent)',
            color: 'var(--tf-bg-brand-solid)',
          }}
        >
          <Link size={12} />
          <span>{parentTitle}에서 발전</span>
        </div>
      )}

      {/* Author */}
      {idea.user && (
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{
              background: 'var(--tf-bg-brand-solid)',
              color: 'white',
            }}
          >
            {idea.user.name.charAt(0)}
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--tf-fg-muted)' }}>
            {idea.user.name}
          </span>
        </div>
      )}

      {/* Content */}
      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--tf-fg-default)' }}>
        {idea.title}
      </p>
      {idea.description && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--tf-fg-muted)' }}>
          {idea.description}
        </p>
      )}

      {/* Action buttons (sharing stage only, non-observer) */}
      {isInteractive && (
        <>
          <div
            className="h-px my-3"
            style={{ background: 'var(--tf-stroke-neutral)' }}
          />
          <div className="flex items-center gap-3">
            {/* Like */}
            <button
              onClick={() => onLike?.(idea.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{
                background: hasLiked
                  ? 'color-mix(in srgb, var(--tf-fg-negative) 12%, transparent)'
                  : 'color-mix(in srgb, var(--tf-fg-muted) 8%, transparent)',
                color: hasLiked ? 'var(--tf-fg-negative)' : 'var(--tf-fg-muted)',
                minHeight: '32px',
              }}
              aria-label="공감"
              aria-pressed={hasLiked}
            >
              <Heart size={14} fill={hasLiked ? 'currentColor' : 'none'} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            {/* Comment */}
            <button
              onClick={() => setCommentOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{
                background: 'color-mix(in srgb, var(--tf-fg-muted) 8%, transparent)',
                color: 'var(--tf-fg-muted)',
                minHeight: '32px',
              }}
              aria-label="코멘트"
            >
              <MessageSquare size={14} />
              {commentCount > 0 && <span>{commentCount}</span>}
            </button>

            {/* Build on */}
            <button
              onClick={() => onBuildOn?.(idea)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{
                background: 'color-mix(in srgb, var(--tf-fg-muted) 8%, transparent)',
                color: 'var(--tf-fg-muted)',
                minHeight: '32px',
              }}
              aria-label="발전시키기"
            >
              <GitBranch size={14} />
              <span>발전시키기</span>
            </button>
          </div>
        </>
      )}

      {/* Read-only reaction summary for non-interactive */}
      {!isInteractive && isSharing && (likeCount > 0 || commentCount > 0) && (
        <>
          <div
            className="h-px my-3"
            style={{ background: 'var(--tf-stroke-neutral)' }}
          />
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--tf-fg-muted)' }}>
            {likeCount > 0 && (
              <span className="flex items-center gap-1">
                <Heart size={12} />
                {likeCount}
              </span>
            )}
            {commentCount > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare size={12} />
                {commentCount}
              </span>
            )}
          </div>
        </>
      )}

      {/* Inline comment input */}
      {commentOpen && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="코멘트 입력..."
            maxLength={50}
            className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
            style={{
              background: 'var(--tf-bg-layer-alt)',
              border: '1px solid var(--tf-stroke-neutral)',
              color: 'var(--tf-fg-default)',
              minHeight: '36px',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCommentSubmit();
            }}
          />
          <button
            onClick={handleCommentSubmit}
            disabled={!commentText.trim()}
            className="rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            style={{
              background: 'var(--tf-bg-brand-solid)',
              color: 'white',
              minHeight: '36px',
            }}
          >
            전송
          </button>
        </div>
      )}

      {/* Comments list */}
      {isSharing && idea.reactions && idea.reactions.filter((r) => r.type === 'comment').length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {idea.reactions
            .filter((r) => r.type === 'comment')
            .map((r, i) => (
              <p
                key={i}
                className="text-xs pl-3 py-1 rounded"
                style={{
                  background: 'var(--tf-bg-layer-alt)',
                  color: 'var(--tf-fg-muted)',
                  borderLeft: '2px solid var(--tf-stroke-neutral)',
                }}
              >
                {r.content}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
