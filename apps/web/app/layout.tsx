import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TeamForge',
  description: '팀의 방향을 함께 만드는 킥오프 플랫폼',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
</body>
    </html>
  );
}
