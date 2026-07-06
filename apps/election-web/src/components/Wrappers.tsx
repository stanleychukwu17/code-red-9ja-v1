import { cn } from "@repo/ui/lib/utils";

export function PageWrapper({ children }: { children: React.ReactNode }) {
  return <div className={cn("flex flex-col relative w-full")}>{children}</div>;
}
