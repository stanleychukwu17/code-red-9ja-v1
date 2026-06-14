import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Package } from "lucide-react";

const WALLET_BALANCE = 1450000000;

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatNairaWithDecimals(amount: number) {
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function DepositAllowanceDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [depositAmount, setDepositAmount] = React.useState(100000000);

  const isInsufficient = depositAmount > WALLET_BALANCE;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    const parsed = Number(rawVal) || 0;
    setDepositAmount(parsed);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-hidden">
        <DialogHeader title="Deposit Polling Agent Allowance" />

        <DialogPadding className="space-y-4 pb-6">
          {/* Blue info banner */}
          <div className="flex items-start gap-3 rounded-xl bg-[#edf3ff] px-4 py-3.5">
            <Package className="size-5 shrink-0 text-[#3182ce] mt-0.5" />
            <p className="leading-[1.6] text-sm font-medium text-[#2b6cb0]">
              Pay your party agents easily through Free9ja. Enter the amount you
              want to deposit and click <strong className="font-bold">Deposit</strong>.
            </p>
          </div>

          {/* Green info banner */}
          <div className="flex items-start gap-3 rounded-xl bg-[#edfff6] px-4 py-3.5">
            <Package className="size-5 shrink-0 text-[#22c55e] mt-0.5" />
            <p className="leading-[1.6] text-sm font-medium text-[#166534]">
              Free9ja pays agents directly based on task completion and
              performance. This ensures agents meet their election-day
              responsibilities, including uploading their polling unit's final
              results for real-time aggregation and reporting.{" "}
              <strong className="font-bold">No Glitch.</strong>
            </p>
          </div>

          {/* Central monetary input */}
          <div className="py-4 flex flex-col items-center gap-1.5">
            <p className="text-sm font-medium text-c-50">Deposit Amount</p>
            <div className="flex items-center justify-center w-full text-center">
              <div className="inline-flex items-center gap-1">
                <span className="text-[52px] font-bold text-c-80 select-none">₦</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={depositAmount.toLocaleString("en-NG")}
                  onChange={handleAmountChange}
                  className="text-[52px] font-bold text-c-80 outline-none bg-transparent p-0 border-none leading-none focus:outline-none focus:ring-0"
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    width: `${Math.max(1, depositAmount.toLocaleString("en-NG").length) * 0.62}em`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Insufficient balance warning */}
          {isInsufficient && (
            <div className="rounded-xl bg-[#fff1f1] px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">😩</span>
                <span className="text-[15px] font-medium text-c-70">
                  Insufficient wallet balance
                </span>
              </div>
              <span className="text-[15px] font-semibold text-[#e53e3e] whitespace-nowrap">
                {formatNairaWithDecimals(depositAmount)}
              </span>
            </div>
          )}

          {/* Wallet balance info */}
          <div className="rounded-xl bg-[#edfff6] px-5 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">😩</span>
              <span className="text-[15px] font-medium text-[#166534]">
                Wallet balance
              </span>
            </div>
            <span className="text-[15px] font-semibold text-[#166534] whitespace-nowrap">
              {formatNairaWithDecimals(WALLET_BALANCE)}
            </span>
          </div>
        </DialogPadding>

        <DialogFooter>
          <Button
            className="bg-[#00e575] hover:bg-[#00c866] text-white rounded-xl px-7 h-11 text-[15px] font-bold border-none shadow-none transition-colors duration-150"
            disabled={depositAmount <= 0}
            onClick={onClose}
          >
            Deposit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
