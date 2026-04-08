'use client';

import IdeaCard, { type BrainstormIdea } from './IdeaCard';

interface IdeaCardWallProps {
  ideas: BrainstormIdea[];
  userRole: 'leader' | 'member' | 'observer';
  onLike?: (ideaId: string) => void;
  onComment?: (ideaId: string, content: string) => void;
  onBuildOn?: (idea: BrainstormIdea) => void;
  currentUserId?: string;
}

export default function IdeaCardWall({
  ideas,
  userRole,
  onLike,
  onComment,
  onBuildOn,
  currentUserId,
}: IdeaCardWallProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
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
        />
      ))}
    </div>
  );
}
