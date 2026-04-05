"use client";

import { createContext, useContext } from "react";

export interface KickoffContextValue {
  viewerRole: "leader" | "member" | "observer";
  teamId: string;
}

export const KickoffCtx = createContext<KickoffContextValue>({
  viewerRole: "member",
  teamId: "",
});

export function useKickoffRole() {
  return useContext(KickoffCtx);
}
