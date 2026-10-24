/**
 * @file Party Wallet Treasury Deposit Dialog
 * @description Allows administrators to credit the party treasury wallet.
 * Platform admins and super admins can directly confirm and credit deposits,
 * while party admins receive guidance to transfer funds to Free9ja.
 */

import { useState, useEffect, type ChangeEvent } from "react";
import { Button } from "@repo/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogPadding } from "@repo/ui/components/dialog";
import { Loader2, Coins, AlertCircle, Building2, ShieldAlert } from "lucide-react";
import { useUserParty } from "#/hooks/useUserParty";
import { useUser } from "#/hooks/useUser";
import { fundPartyWalletTest } from "#/lib/server/parties";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@repo/ui/lib/utils";

export type AccountDetailsDialogProps = {
  open: boolean;
  setOpen?: (v: boolean) => void;
  onClose: () => void;
  wallet?: any;
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
 * Manages party wallet treasury deposits with strict role-based authorization.
 */
export function AccountDetailsDialog({
  open,
  setOpen,
  onClose,
  defaultAmount,
  onSuccess,
}: AccountDetailsDialogProps) {
  const [fundAmount, setFundAmount] = useState(defaultAmount && defaultAmount > 0 ? Math.ceil(defaultAmount) : 50000);
  const { party } = useUserParty();
  const partyId = party?.id;
  const user = useUser();
  const queryClient = useQueryClient();

  const roles = user?.roles || [];
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const isPartyAdmin = roles.includes("party_admin") || roles.includes("super_party_admin");

  // Synchronize prefilled or deficit amounts when opened
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
          `Successfully credited ₦${fundAmount.toLocaleString()} to ${party?.name || "party"} wallet!`,
        );
        if (partyId) {
          queryClient.invalidateQueries({ queryKey: ["partyWallet", partyId] });
          queryClient.invalidateQueries({ queryKey: ["partyWalletTransactions", partyId] });
          queryClient.invalidateQueries({ queryKey: ["party", partyId] });
          queryClient.invalidateQueries({ queryKey: ["partyReadiness", partyId] });
        }
        onSuccess?.();
        handleClose();
      } else {
        toast.error(res?.message || "Failed to credit party wallet");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "An unexpected error occurred while funding wallet");
    },
  });

  // Strip non-digits and cap at ₦1,000,000,000
  const handleFundAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    const parsed = Number(rawVal) || 0;
    if (parsed <= 1_000_000_000) {
      setFundAmount(parsed);
    }
  };

  const handleDeposit = () => {
    if (!partyId || fundAmount <= 0) return;

    if (!isAdmin) {
      toast.error(
        "Party administrators cannot directly deposit funds yet. Please contact a platform administrator.",
      );
      return;
    }

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
        <DialogHeader title="Deposit Treasury Funds" />

        <DialogPadding className="space-y-6 mb-2 max-h-[65vh] overflow-y-auto">
          {/* Role-based notice */}
          {isAdmin ? (
            <div className="flex items-start gap-3 rounded-xl bg-[#edf3ff] px-4 py-3">
              <Coins className="size-5 shrink-0 text-[#3182ce] mt-0.5" />
              <p className="leading-6 text-sm font-medium text-[#2b6cb0]">
                Record funds transferred or deposited into Free9ja to immediately credit this party's treasury wallet.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="size-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">
                    Party Admin Direct Deposit Pending
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Direct automated deposit confirmation for party administrators is currently being finalized.
                    To credit your party wallet, please make a bank transfer to Free9ja's official treasury and contact a platform administrator with your payment receipt.
                  </p>
                </div>
              </div>

              <div className="border-t border-amber-200/60 pt-3 space-y-1.5 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-amber-700 shrink-0" />
                  <span className="font-semibold">Support Desk:</span>
                  <span>support@free9ja.com</span>
                </div>
                <div className="pl-6 text-amber-700">
                  Reference: <span className="font-mono font-semibold">PARTY-{partyId || "0"} ({party?.short_name || "TREASURY"})</span>
                </div>
              </div>
            </div>
          )}

          {/* Deposit Form */}
          <div className="border border-emerald-500/25 rounded-2xl p-5 space-y-4 bg-emerald-50/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="size-5 text-[#22c55e]" />
                <h4 className="text-sm font-bold text-c-80">
                  Direct Treasury Credit
                </h4>
              </div>
              <span className={cn(
                "text-[11px] font-semibold px-2.5 py-0.5 rounded-full",
                isAdmin ? "text-emerald-700 bg-emerald-100" : "text-amber-800 bg-amber-100"
              )}>
                {isAdmin ? "Admin Authorized" : "Admin Only"}
              </span>
            </div>

            <p className="text-xs text-c-60 leading-normal">
              Enter the amount confirmed deposited for <strong>{party?.name || "this party"}</strong>.
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
                  disabled={fundMutation.isPending || !isAdmin}
                />
              </div>

              <Button
                onClick={handleDeposit}
                className={cn(
                  "rounded-xl px-6 h-10 text-[13px] font-bold border-none shadow-sm transition-all duration-150 shrink-0 cursor-pointer disabled:opacity-50",
                  isAdmin
                    ? "bg-[#22c55e] hover:bg-[#16a34a] text-white"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed hover:bg-gray-200"
                )}
                disabled={fundAmount <= 0 || fundMutation.isPending || !isAdmin}
              >
                {fundMutation.isPending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="size-4 animate-spin" />
                    Crediting Wallet...
                  </span>
                ) : !isAdmin ? (
                  "Admin Access Required"
                ) : (
                  `Deposit ₦${fundAmount > 0 ? fundAmount.toLocaleString() : "0"}`
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
