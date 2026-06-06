import { cn } from "@repo/ui/lib/utils";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Coins,
  Landmark,
  Wallet,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import type { ReactNode } from "react";

type WalletLayoutProps = {
  children: ReactNode;
};

export function WalletLayout({ children }: WalletLayoutProps) {
  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-col gap-8 px-8 py-6">
      <h1 className="flex items-center gap-4 text-[44px] font-semibold tracking-[-0.05em] text-[#2d2d2d]">
        <Wallet className="size-10 text-[#9b7b49]" />
        NDC Wallet
      </h1>

      {children}
    </main>
  );
}
