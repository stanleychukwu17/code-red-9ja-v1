import React, { createContext, useContext } from "react";
import { useApplyForm, type ApplyFormReturn } from "../hooks/useApplyForm";
import type { ApplySearch } from "../apply";

const ApplyContext = createContext<ApplyFormReturn | null>(null);

export type ApplyProviderProps = {
  children: React.ReactNode;
  search: ApplySearch;
  navigate: (opts: { to: string }) => void;
};

export function ApplyProvider({ children, search, navigate }: ApplyProviderProps) {
  const form = useApplyForm({ search, navigate });

  return (
    <ApplyContext.Provider value={form}>
      {children}
    </ApplyContext.Provider>
  );
}

export function useApplyContext() {
  const context = useContext(ApplyContext);
  if (!context) {
    throw new Error("useApplyContext must be used within an ApplyProvider");
  }
  return context;
}
