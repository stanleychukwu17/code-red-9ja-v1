import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Package, X } from "lucide-react";

const PRICE_PER_SLOT = 10_000;
const WALLET_BALANCE = 0; // insufficient — replace with real value when wired to API

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function BuyAgentSlotsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [slots, setSlots] = React.useState(100);

  const totalCost = slots * PRICE_PER_SLOT;
  const deficit = totalCost - WALLET_BALANCE;
  const isInsufficient = deficit > 0;

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value.replace(/\D/g, ""));
    if (val <= 5_000_000) setSlots(val || 0);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white">
        {/* Header */}
        <DialogHeader title="Buy party agent slots" />

        <DialogPadding className="space-y-3 pb-6">
          {/* Blue info banner */}
          <div className="flex items-start gap-3 rounded-xl bg-[#edf3ff] px-4 py-3">
            <Package className="size-5 shrink-0 text-[#3182ce] mt-0.5" />
            <p className="leading-[1.6] text-sm font-medium text-[#2b6cb0]">
              Slots let you accept and assign party agents to polling units for
              a specific election. Party agents provide live election-day
              updates to NDC administrators and upload polling unit results.
            </p>
          </div>

          {/* Green info banner */}
          <div className="flex items-start gap-3 rounded-xl bg-[#edfff6] px-4 py-3">
            <Package className="size-5 shrink-0 text-[#22c55e] mt-0.5" />
            <p className="leading-[1.6] text-sm font-medium text-[#166534]">
              Free9ja aggregates results uploaded by party agents on election
              day and displays the result in real time, giving you an accurate
              view of the final outcome as it develops.{" "}
              <strong className="font-bold">No Glitch.</strong>
            </p>
          </div>

          {/* Slots number input */}
          <div className="py-6 flex flex-col items-center gap-2">
            <p className="text-sm text-c-50">Enter number of slots</p>
            <div className="flex items-center">
              <input
                type="text"
                inputMode="numeric"
                value={slots === 0 ? "" : slots}
                onChange={handleInput}
                placeholder="0"
                className="text-[52px] font-bold text-c-80 text-center bg-transparent outline-none w-full leading-none pb-1 caret-c-80"
                style={{ fontVariantNumeric: "tabular-nums" }}
              />
            </div>
          </div>

          {/* Pricing breakdown */}
          <div className="rounded-xl bg-[#f7f7f7] px-5 py-1 space-y-0 divide-y divide-dashed divide-c-10">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="text-base text-c-60">💱</span>
                <span className="text-[15px] text-c-70">
                  Price per slot for a party agent
                </span>
              </div>
              <span className="text-[15px] font-semibold text-c-80">
                {formatNaira(PRICE_PER_SLOT)}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="text-base text-c-60">💱</span>
                <span className="text-[15px] text-c-70">
                  Price for {slots.toLocaleString()} slot
                  {slots !== 1 ? "s" : ""}
                </span>
              </div>
              <span className="text-[15px] font-semibold text-[#22c55e]">
                {formatNaira(totalCost)}
              </span>
            </div>
          </div>

          {/* Insufficient balance warning */}
          {isInsufficient && (
            <div className="rounded-xl bg-[#fff1f1] px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">😢</span>
                <span className="text-[15px] font-medium text-c-70">
                  Insufficient wallet balance
                </span>
              </div>
              <span className="text-[15px] font-semibold text-[#e53e3e] whitespace-nowrap">
                {formatNaira(deficit)}.00
              </span>
            </div>
          )}
        </DialogPadding>

        {/* Footer */}
        <DialogFooter>
          <Button
            className="bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-[14px] px-7 h-11 text-[16px] font-bold border-none shadow-none transition-colors duration-150"
            disabled={slots === 0}
          >
            Buy slots
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
