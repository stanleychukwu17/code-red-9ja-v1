/**
 * @file Party Wallet Account Details & Funding Dialog
 * @description Displays assigned virtual bank accounts (account number, bank name, beneficiary name)
 * for receiving bank transfers that automatically fund the party treasury.
 * Also includes sandbox development mode testing tools for direct balance credit simulation.
 */

import { useState, useEffect, type ChangeEvent } from "react";
import { Button } from "@repo/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogPadding } from "@repo/ui/components/dialog";
import { Package, Loader2, Coins } from "lucide-react";
import { useUserParty } from "#/hooks/useUserParty";
import { fundPartyWalletTest } from "#/lib/server/parties";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@repo/ui/lib/utils";

type AccountNumber = {
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
}

export type AccountDetailsDialogProps = {
  open: boolean;
  setOpen?: (v: boolean) => void;
  onClose: () => void;
  wallet?: {
    account_numbers?: AccountNumber[];
  };
  defaultAmount?: number;
  onSuccess?: () => void;
};

const PRESET_AMOUNTS = [
  { label: "₦50,000", value: 50_000 },
  { label: "₦200,000", value: 200_000 },
  { label: "₦500,000", value: 500_000 },
  { label: "₦1,000,000", value: 1_000_000 },
];

/**
 * AccountDetailsDialog Component
 * Renders dedicated virtual account cards with clipboard copying,
 * and sandbox funding simulation for local development.
 */
export function AccountDetailsDialog({
  open,
  setOpen,
  onClose,
  wallet,
  defaultAmount,
  onSuccess,
}: AccountDetailsDialogProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [fundAmount, setFundAmount] = useState(defaultAmount && defaultAmount > 0 ? Math.ceil(defaultAmount) : 50000);
  const { party } = useUserParty();
  const partyId = party?.id;
  const queryClient = useQueryClient();

  // If a deficit or default amount is provided, synchronize the input when opened
  useEffect(() => {
    if (open && defaultAmount && defaultAmount > 0) {
      setFundAmount(Math.ceil(defaultAmount));
    }
  }, [open, defaultAmount]);

  const fundMutation = useMutation({
    mutationFn: (variables: { partyID: number; amountKobo: number }) => fundPartyWalletTest({ data: variables }),
    onSuccess: (res) => {
      if (res && res.success) {
        toast.success(
          `Successfully funded ₦${fundAmount.toLocaleString()} to your party wallet!`,
        );
        // Invalidate relevant wallet and readiness queries across the app
        if (partyId) {
          queryClient.invalidateQueries({ queryKey: ["partyWallet", partyId] });
          queryClient.invalidateQueries({ queryKey: ["partyWalletTransactions", partyId] });
          queryClient.invalidateQueries({ queryKey: ["party", partyId] });
          queryClient.invalidateQueries({ queryKey: ["partyReadiness", partyId] });
        }
        onSuccess?.();
        onClose();
      } else {
        toast.error(res?.message || "Failed to simulate wallet funding");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "An unexpected error occurred");
    },
  });

  // Copy virtual account number to clipboard with a 2-second feedback indicator
  const handleCopy = (num: string, index: number) => {
    navigator.clipboard.writeText(num);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Strip non-digits and cap at ₦1,000,000,000
  const handleFundAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    const parsed = Number(rawVal) || 0;
    if (parsed <= 1_000_000_000) {
      setFundAmount(parsed);
    }
  };

  // Trigger test endpoint to credit wallet balance in sandbox mode
  const handleSimulateFunding = () => {
    if (!partyId || fundAmount <= 0) return;
    fundMutation.mutate({
      partyID: partyId,
      amountKobo: fundAmount * 100, // convert Naira input to Kobo
    });
  };

  const handleClose = () => {
    setOpen?.(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-145 p-0 rounded-2xl border-none shadow-2xl overflow-hidden">
        <DialogHeader title="Account details" />

        <DialogPadding className="space-y-6 mb-2 max-h-[60vh] overflow-y-auto">
          <div className="flex items-start gap-3 rounded-xl bg-[#edf3ff] px-4 py-3">
            <Package className="size-5 shrink-0 text-[#3182ce] mt-0.5" />
            <p className="leading-6 text-sm font-medium text-[#2b6cb0]">
              Transfer money to any of the accounts below to automatically fund
              your party wallet.
            </p>
          </div>

          <div className="space-y-4">
            {wallet?.account_numbers && wallet.account_numbers.length > 0 ? (
              wallet.account_numbers.map((acc, index) => (
                <div
                  key={index}
                  className="border border-gray-100 rounded-xl p-5 space-y-4 bg-hover-1"
                >
                  <div className="space-y-1">
                    <p className="text-[13px] font-medium text-c-50">
                      Account Number
                    </p>
                    <div className="text-[32px] font-semibold text-c-80 leading-none flex items-center justify-between">
                      <span>{acc.accountNumber}</span>
                      <button
                        onClick={() => handleCopy(acc.accountNumber, index)}
                        className="text-xs font-semibold text-[#3182ce] hover:underline cursor-pointer border border-[#3182ce]/20 px-2 py-1 rounded bg-[#3182ce]/5 hover:bg-[#3182ce]/10"
                      >
                        {copiedIndex === index ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1">
                      <p className="text-xs text-c-50">Bank</p>
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-[#7a1b7a] flex items-center justify-center text-white text-[10px] font-extrabold tracking-tighter">
                          {acc.bankName.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-c-80">
                          {acc.bankName}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-c-50">Account Name</p>
                      <div className="text-sm font-medium text-c-80 leading-snug">
                        {acc.accountName}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-c-50 border border-dashed border-gray-200 rounded-xl">
                No virtual account generated yet. Please contact support.
              </div>
            )}
          </div>

          {/* Direct Sandbox Simulation Funding */}
          <div className="border border-emerald-500/20 rounded-2xl p-5 space-y-4 bg-emerald-50/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="size-5 text-[#22c55e]" />
                <h4 className="text-sm font-bold text-c-80">
                  Simulate Payment Transfer (Sandbox Dev Mode)
                </h4>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                Instant Credit
              </span>
            </div>

            <p className="text-xs text-c-60 leading-normal">
              Directly credit your party treasury balance to test slot purchases, agent allowances, and campaign activations in development.
            </p>

            {/* Quick-select preset chips */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-c-50">
                Quick Amounts
              </p>
              <div className="flex flex-wrap gap-2">
                {defaultAmount && defaultAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFundAmount(Math.ceil(defaultAmount))}
                    className={cn(
                      "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer",
                      fundAmount === Math.ceil(defaultAmount)
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-emerald-700 border-emerald-300 hover:border-emerald-500",
                    )}
                  >
                    Required Deficit: ₦{Math.ceil(defaultAmount).toLocaleString()}
                  </button>
                )}
                {PRESET_AMOUNTS.map((preset) => {
                  const isSelected = fundAmount === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setFundAmount(preset.value)}
                      className={cn(
                        "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer",
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-white text-c-70 border-gray-200 hover:border-emerald-400 hover:text-emerald-700",
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount input & Submit button */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <div className="flex items-center bg-[#f1f1f4] rounded-xl px-3.5 py-2 flex-1 border border-transparent focus-within:border-emerald-500 focus-within:bg-white transition-all">
                <span className="text-sm font-bold text-c-60 mr-1.5 select-none">₦</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fundAmount === 0 ? "" : fundAmount.toLocaleString("en-NG")}
                  onChange={handleFundAmountChange}
                  placeholder="0"
                  className="bg-transparent border-none outline-none font-bold text-base text-c-80 w-full p-0"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                  disabled={fundMutation.isPending}
                />
              </div>

              <Button
                onClick={handleSimulateFunding}
                className="bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl px-6 h-10 text-[13px] font-bold border-none shadow-sm transition-all duration-150 shrink-0 cursor-pointer disabled:opacity-50"
                disabled={fundAmount <= 0 || fundMutation.isPending}
              >
                {fundMutation.isPending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="size-4 animate-spin" />
                    Crediting Wallet...
                  </span>
                ) : (
                  `Fund ₦${fundAmount > 0 ? fundAmount.toLocaleString() : "0"}`
                )}
              </Button>
            </div>
          </div>
        </DialogPadding>

        <DialogFooter className="border-t border-gray-100 pt-3 pb-4">
          <Button variant="deepGrey" size="lg" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
