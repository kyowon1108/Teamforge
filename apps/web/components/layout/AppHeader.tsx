'use client';

import { useTransition } from 'react';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppHeaderProps {
  userName: string;
}

export default function AppHeader({ userName }: AppHeaderProps) {
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOut({ callbackUrl: '/login' });
    });
  }

  return (
    <header
      className="sticky top-0 z-20 border-b px-4 flex items-center justify-between h-[53px]"
      style={{
        background: 'var(--tf-surface-card)',
        borderColor: 'var(--tf-border-subtle)',
      }}
    >
      <span
        className="text-lg font-bold tracking-tight"
        style={{ color: 'var(--tf-text-primary)' }}
      >
        TeamForge
      </span>
      <div className="flex items-center gap-3">
        <span
          className="text-sm hidden sm:block"
          style={{ color: 'var(--tf-text-muted)' }}
        >
          {userName}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          disabled={isPending}
          aria-label="로그아웃"
          style={{ minHeight: '44px' }}
        >
          <LogOut size={16} />
          <span className="ml-1.5 hidden sm:inline">로그아웃</span>
        </Button>
      </div>
    </header>
  );
}
