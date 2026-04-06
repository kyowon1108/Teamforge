'use server';
import { auth } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';

export async function updateRoleAction(role: 'leader' | 'member' | 'observer') {
  const session = await auth();
  if (!session) return { error: '로그인이 필요합니다.' };

  const res = await apiFetch('/api/users/me/role', {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });

  if (!res.ok) {
    const data = (await res.json()) as { message?: string };
    return { error: data.message ?? '역할 저장에 실패했습니다.' };
  }

  return { error: null };
}
