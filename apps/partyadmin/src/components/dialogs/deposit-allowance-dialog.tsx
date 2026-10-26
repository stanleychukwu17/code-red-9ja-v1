/**
 * @file Agent Payment Deposit Dialog
 * @description Modal allowing party administrators to allocate funds from their primary party wallet
 * into the dedicated agent payment / allowance balance for paying polling agents and supervisors.
 */

import { useState, type ChangeEvent } from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { depositPartyAllowance } from "#/lib/server/parties";
import { toast } from "sonner";
import { DescriptiveText } from "@repo/ui/components/custom/Texts";
import FancySadEmojiIcon from "@repo/ui/icons/fancy-sad-emoji-icon";
import FancyHappyEmojiIcon from "@repo/ui/icons/fancy-happy-emoji-icon";
import { PartyWalletBalance } from "./party-wallet-balance";

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export type DepositAllowanceDialogProps = {
  open: boolean;
  onClose: () => void;
  partyId?: number;
  walletBalanceKobo: number;
  agentPaymentBalanceKobo?: number;
  defaultAmountNaira?: number;
  onSuccess?: () => void;
};

/**
 * DepositAllowanceDialog Component
 * Manages numerical monetary input, checks balance sufficiency against available wallet Kobo,
 * and transfers funds into the agent allowance balance via depositPartyAllowance.
 */
export function DepositAllowanceDialog({
  partyId,
  walletBalanceKobo,
  agentPaymentBalanceKobo = 0,
  defaultAmountNaira = 100000,
  open,
  onClose,
  onSuccess,
}: DepositAllowanceDialogProps) {
  // Target deposit amount in Naira
  const [depositAmountNaira, setDepositAmountNaira] = useState(defaultAmountNaira);

  // Convert balances from kobo to Naira and check treasury sufficiency
  const walletBalanceNaira = walletBalanceKobo / 100;
  const agentPaymentBalanceNaira = agentPaymentBalanceKobo / 100;
  const isInsufficient = depositAmountNaira > walletBalanceNaira;

  // Mutation to transfer treasury balance into agent allowance fund
  const depositMutation = useMutation({
    mutationFn: (variables: { partyID: number; amountKobo: number }) => depositPartyAllowance({ data: variables }),
    onSuccess: (res) => {
      if (res && res.success) {
        toast.success(`Successfully deposited ${formatNaira(depositAmountNaira)} to agent payment balance!`);
        onSuccess?.();
        onClose();
      } else {
        toast.error(res?.message || "Failed to deposit agent payment");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "An unexpected error occurred");
    },
  });

  // Parse numeric amount input and strip non-digits
  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    const parsed = Number(rawVal) || 0;
    setDepositAmountNaira(parsed);
  };

  // Convert Naira to kobo and submit deposit transaction
  const handleDeposit = () => {
    if (!partyId || depositAmountNaira <= 0 || isInsufficient) return;
    depositMutation.mutate({
      partyID: partyId,
      amountKobo: depositAmountNaira * 100, // convert Naira to Kobo
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-145">
        <DialogHeader title="Top up Agent Payment" />

        <DialogPadding>
          <DescriptiveText text="Party agents can only perform their election-day duties once their payment has been deposited here." />

          <div className="space-y-5">
            {/* Amount input */}
            <div className="py-6 flex flex-col items-center gap-2">
              <p className="text-sm text-c-50">Deposit Amount</p>
              <div className="flex items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  value={depositAmountNaira ? formatNaira(depositAmountNaira) : ""}
                  onChange={handleAmountChange}
                  placeholder="₦0"
                  className="text-[52px] font-bold text-c-80 text-center bg-transparent outline-none w-full leading-none pb-1 caret-c-80"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                  disabled={depositMutation.isPending}
                />
              </div>
            </div>

            {/* Current balances */}
            <div className="space-y-2">
              <PartyWalletBalance
                icon={<FancyHappyEmojiIcon className="shrink-0 size-6" />}
                label="Wallet balance"
                value={formatNaira(walletBalanceNaira)}
                className="bg-secondary/20"
              />

              {isInsufficient ? (
                <PartyWalletBalance
                  icon={<FancySadEmojiIcon className="shrink-0 size-6" />}
                  label="Insufficient wallet balance"
                  value={formatNaira(depositAmountNaira)}
                  className="bg-red/20"
                  valueClassName="text-red"
                />
              ) : (
                <PartyWalletBalance
                  icon={<FancySadEmojiIcon className="shrink-0 size-6" />}
                  label="Agent Payment Balance"
                  value={formatNaira(agentPaymentBalanceNaira)}
                  className="bg-background border border-c-90"
                />
              )}
            </div>
          </div>
        </DialogPadding>

        <DialogFooter>
          <Button
            variant="secondary"
            size="3xl"
            onClick={handleDeposit}
            disabled={depositAmountNaira <= 0 || isInsufficient || depositMutation.isPending}
          >
            {depositMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Depositing...
              </span>
            ) : (
              "Deposit"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
