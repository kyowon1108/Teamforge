"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { apiClient } from "@/lib/api-client";

function TokenSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Check both locations where the token may live
    const token = session?.teamforgeToken ?? session?.user?.teamforgeToken;
    if (token) {
      apiClient.setToken(token);
    } else {
      apiClient.clearToken();
    }
    if (session?.refreshToken) {
      apiClient.setRefreshToken(session.refreshToken);
    }
  }, [session?.teamforgeToken, session?.user?.teamforgeToken, session?.refreshToken]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TokenSync />
      {children}
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          style: {
            fontFamily: "Pretendard, sans-serif",
          },
        }}
      />
    </SessionProvider>
  );
}
