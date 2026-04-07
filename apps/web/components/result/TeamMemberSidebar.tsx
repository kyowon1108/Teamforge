'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Crown } from 'lucide-react';
import Image from 'next/image';

interface TeamMemberWithStatus {
  userId: string;
  name: string;
  image: string | null;
  role: 'leader' | 'member' | 'observer';
  submitted: boolean | null;
  confirmedRole: string | null;
}

interface Props {
  members: TeamMemberWithStatus[];
  currentViewingId: string | null;
  teamId: string;
  myUserId?: string;
}

function MemberRow({
  member,
  isSelected,
  isMine,
  onClick,
}: {
  member: TeamMemberWithStatus;
  isSelected: boolean;
  isMine: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
      style={{
        background: isSelected ? 'var(--tf-bg-brand)' : 'transparent',
        border: isSelected ? '1px solid var(--tf-stroke-brand)' : '1px solid transparent',
      }}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden text-xs font-semibold"
        style={{
          background: 'var(--tf-bg-layer-alt)',
          color: 'var(--tf-fg-muted)',
        }}
      >
        {member.image ? (
          <Image
            src={member.image}
            alt={member.name}
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        ) : (
          member.name.charAt(0)
        )}
      </div>

      {/* Name + role badge */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="text-sm font-medium truncate"
            style={{ color: isSelected ? 'var(--tf-fg-brand)' : 'var(--tf-fg-default)' }}
          >
            {member.name}
          </span>
          {isMine && (
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
              style={{
                background: 'color-mix(in srgb, var(--tf-bg-brand-solid) 12%, transparent)',
                color: 'var(--tf-fg-brand)',
              }}
            >
              나
            </span>
          )}
          {member.role === 'leader' && (
            <Crown
              className="w-3 h-3 shrink-0"
              style={{ color: 'var(--tf-fg-warning)' }}
            />
          )}
        </div>
        {member.confirmedRole && (
          <span
            className="text-xs mt-0.5 inline-block px-1.5 py-0.5 rounded"
            style={{
              background: 'color-mix(in srgb, var(--tf-fg-positive) 10%, transparent)',
              color: 'var(--tf-fg-positive)',
            }}
          >
            {member.confirmedRole}
          </span>
        )}
      </div>

      {/* Submitted status */}
      <div className="shrink-0">
        {member.submitted === true && (
          <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--tf-fg-positive)' }} />
        )}
        {member.submitted === false && (
          <Clock className="w-4 h-4" style={{ color: 'var(--tf-fg-muted)' }} />
        )}
        {member.submitted === null && (
          <span className="text-xs" style={{ color: 'var(--tf-fg-muted)' }}>-</span>
        )}
      </div>
    </button>
  );
}

export default function TeamMemberSidebar({
  members,
  currentViewingId,
  teamId,
  myUserId,
}: Props) {
  const router = useRouter();

  function handleMemberClick(member: TeamMemberWithStatus) {
    if (member.userId === myUserId) {
      router.push(`/team/${teamId}/result`);
    } else {
      router.push(`/team/${teamId}/result?view=member&userId=${member.userId}`);
    }
  }

  // Put the current user first
  const sorted = [...members].sort((a, b) => {
    if (a.userId === myUserId) return -1;
    if (b.userId === myUserId) return 1;
    return 0;
  });

  return (
    <>
      {/* Desktop sidebar — fixed left */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 w-60 top-[var(--tf-app-header-height,56px)] bottom-0 overflow-y-auto py-4 px-2 gap-1 border-r"
        style={{
          background: 'var(--tf-bg-layer-default)',
          borderColor: 'var(--tf-stroke-neutral)',
          zIndex: 10,
        }}
      >
        <p
          className="text-xs font-semibold px-3 mb-2"
          style={{ color: 'var(--tf-fg-muted)' }}
        >
          팀원 결과
        </p>
        {sorted.map((member) => (
          <MemberRow
            key={member.userId}
            member={member}
            isSelected={
              currentViewingId === null
                ? member.userId === myUserId
                : member.userId === currentViewingId
            }
            isMine={member.userId === myUserId}
            onClick={() => handleMemberClick(member)}
          />
        ))}
      </aside>

      {/* Mobile horizontal strip */}
      <div
        className="lg:hidden flex gap-2 overflow-x-auto pb-2 mb-4"
        style={{ scrollbarWidth: 'none' }}
      >
        {sorted.map((member) => {
          const isSelected =
            currentViewingId === null
              ? member.userId === myUserId
              : member.userId === currentViewingId;

          return (
            <button
              key={member.userId}
              onClick={() => handleMemberClick(member)}
              className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl shrink-0 transition-colors"
              style={{
                background: isSelected ? 'var(--tf-bg-brand)' : 'var(--tf-bg-layer-default)',
                border: `1px solid ${isSelected ? 'var(--tf-stroke-brand)' : 'var(--tf-stroke-neutral)'}`,
                minWidth: '68px',
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden"
                style={{
                  background: 'var(--tf-bg-layer-alt)',
                  color: 'var(--tf-fg-muted)',
                }}
              >
                {member.image ? (
                  <Image
                    src={member.image}
                    alt={member.name}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  member.name.charAt(0)
                )}
              </div>
              <span
                className="text-xs font-medium"
                style={{ color: isSelected ? 'var(--tf-fg-brand)' : 'var(--tf-fg-default)' }}
              >
                {member.name}
              </span>
              {member.submitted === true && (
                <CheckCircle2 className="w-3 h-3" style={{ color: 'var(--tf-fg-positive)' }} />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
