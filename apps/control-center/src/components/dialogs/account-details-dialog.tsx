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
import { fundPartyWallet } from "#/lib/server/parties";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@repo/ui/lib/utils";
import { QUERY_KEYS } from "#/lib/config";

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
export function AccountDetailsDialog({ open, defaultAmount, setOpen, onClose, onSuccess }: AccountDetailsDialogProps) {
  const [fundAmount, setFundAmount] = useState(defaultAmount && defaultAmount > 0 ? Math.ceil(defaultAmount) : 50000);
  const { party } = useUserParty();
  const partyId = party?.id;
  const user = useUser();
  const queryClient = useQueryClient();

  const roles = user?.roles || [];
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");

  // Synchronize prefilled or deficit amounts when opened
  useEffect(() => {
    if (open && defaultAmount && defaultAmount > 0) {
      setFundAmount(Math.ceil(defaultAmount));
    }
  }, [open, defaultAmount]);

  // Mutation to credit funds to party wallet
  const fundMutation = useMutation({
    mutationFn: (variables: { partyID: number; amountKobo: number }) => fundPartyWallet({ data: variables }),
    onSuccess: (res) => {
      if (res && res.success) {
        toast.success(
          `Successfully credited ₦${fundAmount.toLocaleString()} to ${party?.short_name} wallet!`,
        );
        // Refresh related party balances and transaction queries
        if (partyId) {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partyWallet.byParty(partyId) });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partyWallet.transactions(partyId) });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partyReadiness.byParty(partyId) });
        }
        onSuccess?.();
        handleClose();
      } else {
        toast.error(res?.message || "Failed to credit party wallet");
      }
    },
    onError: (error: any) => {
      // Surface network or unexpected server errors
      toast.error(error.message || "An unexpected error occurred while funding wallet");
    },
  });

  // Strip non-digits and cap at ₦10,000,000,000
  const handleFundAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    const parsed = Number(rawVal) || 0;
    if (parsed <= 10_000_000_000) {
      setFundAmount(parsed);
    }
  };

  // handles depositing into back  
  const handleDeposit = () => {
    // Validate target party and positive funding amount
    if (!partyId || fundAmount <= 0) return;

    // Direct deposit is currently restricted to platform admins
    if (!isAdmin) {
      toast.error("Party administrators cannot directly deposit funds yet. Please contact a platform administrator.",);
      return;
    }

    // Trigger fund mutation with amount converted to kobo
    fundMutation.mutate({
      partyID: partyId,
      amountKobo: fundAmount * 100, // convert Naira input to Kobo
    });
  };

  // Reset dialog state and trigger external close handler
  const handleClose = () => {
    setOpen?.(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-145 p-0 rounded-2xl border border-border shadow-2xl overflow-hidden bg-background">
        <DialogHeader title="Deposit Treasury Funds" />

        <DialogPadding className="space-y-6 mb-2 max-h-[65vh] overflow-y-auto">
          {/* Role-based notice */}
          {isAdmin ? (
            <div className="flex items-start gap-3 rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3">
              <Coins className="size-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
              <p className="leading-6 text-sm font-medium text-blue-800 dark:text-blue-300">
                Record funds transferred or deposited into Free9ja to immediately credit this party's treasury wallet.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                    Party Admin Direct Deposit Pending
                  </h4>
                  <p className="text-xs text-amber-900/80 dark:text-amber-300/80 mt-1 leading-relaxed">
                    Direct automated deposit confirmation for party administrators is currently being finalized.
                    To credit your party wallet, please make a bank transfer to Free9ja's official treasury and contact a platform administrator with your payment receipt.
                  </p>
                </div>
              </div>

              <div className="border-t border-amber-500/20 pt-3 space-y-1.5 text-xs text-amber-950 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="font-semibold">Support Desk:</span>
                  <span className="text-c-70">support@free9ja.com</span>
                </div>
                <div className="pl-6 text-c-60">
                  Reference: <span className="font-mono font-semibold text-c-80">PARTY-{partyId || "0"} ({party?.short_name || "TREASURY"})</span>
                </div>
              </div>
            </div>
          )}

          {/* Deposit Form */}
          <div className="border border-emerald-500/25 rounded-2xl p-5 space-y-4 bg-emerald-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="size-5 text-emerald-500" />
                <h4 className="text-sm font-bold text-c-80">
                  Direct Treasury Credit
                </h4>
              </div>
              <span className={cn(
                "text-[11px] font-semibold px-2.5 py-0.5 rounded-full border",
                isAdmin
                  ? "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 border-emerald-500/20"
                  : "text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/50 border-amber-500/20"
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
                        : "bg-c-5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10",
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
                          : "bg-c-5 text-c-70 border-border hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-hover-5",
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
              <div className="flex items-center bg-input-dialog rounded-xl px-3.5 py-2 flex-1 border border-border focus-within:border-emerald-500 focus-within:bg-input-dialog-active transition-all">
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
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "bg-c-10 text-c-50 cursor-not-allowed hover:bg-c-10"
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

        <DialogFooter className="border-t border-border pt-3 pb-4">
          <Button variant="deepGrey" size="lg" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
