'use server';
import { auth } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';

export async function createTeamAction(name: string) {
  const session = await auth();
  if (!session) return { error: '로그인이 필요합니다.', teamId: null, inviteCode: null };

  const res = await apiFetch('/api/teams', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const data = (await res.json()) as { message?: string };
    return { error: data.message ?? '팀 생성에 실패했습니다.', teamId: null, inviteCode: null };
  }

  const data = (await res.json()) as { teamId: string; inviteCode: string };
  return { error: null, teamId: data.teamId, inviteCode: data.inviteCode };
}

export async function joinTeamAction(inviteCode: string, role: 'member' | 'observer') {
  const session = await auth();
  if (!session) return { error: '로그인이 필요합니다.', teamId: null };

  const res = await apiFetch('/api/teams/join', {
    method: 'POST',
    body: JSON.stringify({ inviteCode, role }),
  });

  if (!res.ok) {
    const data = (await res.json()) as { message?: string };
    return { error: data.message ?? '팀 참가에 실패했습니다.', teamId: null };
  }

  const data = (await res.json()) as { teamId: string };
  return { error: null, teamId: data.teamId };
}
