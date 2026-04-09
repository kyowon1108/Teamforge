'use server';
import { auth } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';
import type { TeamContext } from '@teamforge/contracts';

export interface CreateTeamPayload extends TeamContext {
  name: string;
}

export async function createTeamAction(payload: CreateTeamPayload) {
  const session = await auth();
  if (!session) return { error: '로그인이 필요합니다.', teamId: null, inviteCode: null };

  const res = await apiFetch('/api/teams', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = (await res.json()) as { code?: string; message?: string };
    const errorMap: Record<string, string> = {
      TEAM_LIMIT_REACHED: '팀 생성 한도에 도달했습니다. 기존 팀을 정리한 후 다시 시도하세요.',
    };
    const msg = (data.code && errorMap[data.code]) ?? data.message ?? '팀 생성에 실패했습니다.';
    return { error: msg, teamId: null, inviteCode: null };
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
    const data = (await res.json()) as { code?: string; message?: string };
    const errorMap: Record<string, string> = {
      TEAM_NOT_FOUND: '초대 코드가 유효하지 않습니다. 코드를 다시 확인해 주세요.',
      ALREADY_MEMBER: '이미 해당 팀에 참가되어 있습니다.',
      TEAM_FULL: '팀 인원이 가득 찼습니다. 팀장에게 문의하세요.',
    };
    const msg = (data.code && errorMap[data.code]) ?? data.message ?? '팀 참가에 실패했습니다.';
    return { error: msg, teamId: null };
  }

  const data = (await res.json()) as { teamId: string };
  return { error: null, teamId: data.teamId };
}
