import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { ChevronDown, Package } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

const PAYOUT_METHODS = [
  { id: "gtb", label: "Nigeria Democratic Congress - GTB", bank: "GTBank" },
  {
    id: "wema",
    label: "Nigeria Democratic Congress - Wema Bank",
    bank: "Wema Bank",
  },
];

export function WithdrawDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = React.useState(20000000);
  const [selectedMethod, setSelectedMethod] = React.useState(
    PAYOUT_METHODS[0]!,
  );
  const [isMethodOpen, setIsMethodOpen] = React.useState(false);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    const parsed = Number(rawVal) || 0;
    setAmount(parsed);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-hidden">
        <DialogHeader title="Withdraw" />

        <DialogPadding className="space-y-6 pb-6">
          {/* Blue Info Banner */}
          <div className="flex items-start gap-3 rounded-xl bg-[#edf3ff] px-4 py-3.5">
            <Package className="size-5 shrink-0 text-[#3182ce] mt-0.5" />
            <p className="leading-[1.6] text-[14px] font-medium text-[#2b6cb0]">
              Enter the amount to withdraw and select a payout method. It may
              take between 1 to 5 working days for the withdrawal to complete.
            </p>
          </div>

          {/* Amount input */}
          <div className="py-4 flex flex-col items-center gap-1.5">
            <p className="text-sm font-medium text-c-50">Amount</p>
            <div className="flex items-center justify-center w-full text-center">
              <div className="inline-flex items-center gap-1">
                <span className="text-[52px] font-bold text-c-80 select-none">
                  ₦
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount.toLocaleString("en-NG")}
                  onChange={handleAmountChange}
                  className="text-[52px] font-bold text-c-80 outline-none bg-transparent p-0 border-none leading-none focus:outline-none focus:ring-0"
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    width: `${Math.max(1, amount.toLocaleString("en-NG").length) * 0.62}em`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Payout method */}
          <div className="space-y-2 relative">
            <label className="text-[15px] font-semibold text-c-60">
              Payout method
            </label>
            <button
              type="button"
              onClick={() => setIsMethodOpen(!isMethodOpen)}
              className="w-full flex items-center justify-between h-14 px-4 rounded-xl border border-gray-200 bg-white text-c-80 font-medium text-[15px] focus:outline-none focus:border-c-60 transition"
            >
              <div className="flex items-center gap-3">
                {selectedMethod.id === "gtb" ? (
                  <div className="size-6 rounded-full bg-[#f05a28] flex items-center justify-center text-white text-[7px] font-black select-none">
                    GTCO
                  </div>
                ) : (
                  <div className="size-6 rounded-full bg-[#7a1b7a] flex items-center justify-center text-white text-[8px] font-extrabold tracking-tighter select-none">
                    W
                  </div>
                )}
                <span>{selectedMethod.label}</span>
              </div>
              <ChevronDown className="size-5 text-c-50" />
            </button>

            {isMethodOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsMethodOpen(false)}
                />
                <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-20">
                  {PAYOUT_METHODS.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => {
                        setSelectedMethod(method);
                        isMethodOpen && setIsMethodOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors duration-150 hover:bg-c-5",
                        method.id === selectedMethod.id
                          ? "text-[#10b981] font-semibold bg-emerald-50/40"
                          : "text-c-70",
                      )}
                    >
                      {method.id === "gtb" ? (
                        <div className="size-6 rounded-full bg-[#f05a28] flex items-center justify-center text-white text-[7px] font-black select-none">
                          GTCO
                        </div>
                      ) : (
                        <div className="size-6 rounded-full bg-[#7a1b7a] flex items-center justify-center text-white text-[8px] font-extrabold tracking-tighter select-none">
                          W
                        </div>
                      )}
                      <span>{method.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogPadding>

        <DialogFooter>
          <Button
            onClick={handleClose}
            className="bg-[#f1f1f4] hover:bg-[#e4e4e7] text-c-80 rounded-xl px-7 h-11 text-[15px] font-bold border-none shadow-none transition-colors duration-150"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
