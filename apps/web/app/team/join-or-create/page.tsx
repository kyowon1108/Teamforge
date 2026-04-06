import { redirect } from 'next/navigation';

// join-or-create는 team/create 와 team/join 으로 분리되었습니다.
// 기존 링크 호환을 위해 /dashboard로 redirect합니다.
export default function JoinOrCreatePage() {
  redirect('/dashboard');
}
