import { cn } from "@repo/ui/lib/utils";

export function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col relative w-full h-svh")}>{children}</div>
  );
}

export function DarkBodyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("w-full pt-4 flex flex-col flex-1 bg-black/95")}>
      {children}
    </div>
  );
}

export function RoundedTopWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "mt-6 space-y-1 bg-background px-4 pb-8 h-full rounded-t-3xl space-y-5",
      )}
    >
      {children}
    </div>
  );
}
