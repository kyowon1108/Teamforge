'use client';

import { useState } from 'react';
import { Merge } from 'lucide-react';
import IdeaCard, { type BrainstormIdea } from './IdeaCard';

interface IdeaCardWallProps {
  ideas: BrainstormIdea[];
  userRole: 'leader' | 'member' | 'observer';
  onLike?: (ideaId: string) => void;
  onComment?: (ideaId: string, content: string) => void;
  onBuildOn?: (idea: BrainstormIdea) => void;
  onMergeRequest?: (ideas: [BrainstormIdea, BrainstormIdea]) => void;
  currentUserId?: string;
}

const MAX_SELECTION = 2;

export default function IdeaCardWall({
  ideas,
  userRole,
  onLike,
  onComment,
  onBuildOn,
  onMergeRequest,
  currentUserId,
}: IdeaCardWallProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sort: like count desc, then newest first
  const sorted = [...ideas].sort((a, b) => {
    const aLikes = a.reactions?.filter((r) => r.type === 'like').length ?? 0;
    const bLikes = b.reactions?.filter((r) => r.type === 'like').length ?? 0;
    if (bLikes !== aLikes) return bLikes - aLikes;
    // Newest first
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  const canSelect = userRole !== 'observer';

  function handleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_SELECTION) {
        next.add(id);
      }
      return next;
    });
  }

  function handleMergeClick() {
    if (selectedIds.size !== 2) return;
    const ids = Array.from(selectedIds);
    const ideaA = ideas.find((i) => i.id === ids[0]);
    const ideaB = ideas.find((i) => i.id === ids[1]);
    if (ideaA && ideaB) {
      onMergeRequest?.([ideaA, ideaB]);
      setSelectedIds(new Set());
    }
  }

  if (sorted.length === 0) {
    return (
      <div
        className="text-center py-12 rounded-lg"
        style={{
          background: 'var(--tf-bg-layer-default)',
          border: '1px solid var(--tf-stroke-neutral)',
          color: 'var(--tf-fg-muted)',
        }}
      >
        <p className="text-sm">아직 공유된 아이디어가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="relative mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sorted.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            isSharing={true}
            userRole={userRole}
            onLike={onLike}
            onComment={onComment}
            onBuildOn={onBuildOn}
            currentUserId={currentUserId}
            selectable={canSelect}
            selected={selectedIds.has(idea.id)}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* Floating merge button when 2 ideas are selected */}
      {selectedIds.size === 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={handleMergeClick}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm shadow-lg transition-all hover:opacity-90"
            style={{
              background: 'var(--tf-bg-brand-solid)',
              color: 'white',
            }}
          >
            <Merge size={16} />
            아이디어 합치기
          </button>
        </div>
      )}
    </div>
  );
}
