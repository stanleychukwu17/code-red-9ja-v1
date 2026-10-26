/**
 * @file Buy Agent Slots Dialog
 * @description Modal allowing party administrators to purchase capacity slots for fielding polling agents
 * and supervisors in upcoming elections. Pulls live unit slot pricing, calculates total cost,
 * and validates against available party treasury balance.
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
import { Package, Loader2, Coins } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { buyPartySlots } from "#/lib/server/parties";
import { toast } from "sonner";
import { DescriptiveText } from "@repo/ui/components/custom/Texts";
import FancyBillIcon from "@repo/ui/icons/fancy-bill-icon";
import { cn } from "@repo/ui/lib/utils";
import FancySadEmojiIcon from "@repo/ui/icons/fancy-sad-emoji-icon";
import FancyHappyEmojiIcon from "@repo/ui/icons/fancy-happy-emoji-icon";
import { PartyWalletBalance } from "@repo/ui/components/dialogs/DepositAgentStipendDialog";

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

type BuyAgentSlotsDialogProps = {
  open: boolean;
  onClose: () => void;
  partyId?: number;
  walletBalanceKobo: number;
  unitSlotPriceKobo?: number;
  onSuccess?: () => void;
  onDepositFunds?: (deficitNaira: number) => void;
};

/**
 * BuyAgentSlotsDialog Component
 * Prompts user for quantity of slots, multiplies by server-provided unit slot rate,
 * and submits the purchase transaction.
 */
export function BuyAgentSlotsDialog({ partyId, walletBalanceKobo, unitSlotPriceKobo, open, onClose, onSuccess, onDepositFunds }: BuyAgentSlotsDialogProps) {
  // Number of agent slots to purchase (default: 100)
  const [slots, setSlots] = useState(100);

  // Unit price in Naira (converted from Kobo, fallback to 1,000 NGN)
  const pricePerSlot = typeof unitSlotPriceKobo === 'number' && unitSlotPriceKobo >= 0
    ? unitSlotPriceKobo / 100
    : 1000;

  // Mutation to handle slot purchase request
  const buySlotsMutation = useMutation({
    mutationFn: (variables: { partyID: number; quantity: number }) => buyPartySlots({ data: variables }),
    onSuccess: (res) => {
      if (res && res.success) {
        toast.success(`Successfully purchased ${slots} slots!`);
        onSuccess?.();
        onClose();
      } else {
        toast.error(res?.message || "Failed to purchase slots");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "An unexpected error occurred");
    },
  });

  // Wallet and cost calculations in Naira
  const walletBalanceNaira = walletBalanceKobo / 100;
  const totalCost = slots * pricePerSlot;
  const deficit = totalCost - walletBalanceNaira;
  const isInsufficient = deficit > 0; // Check if party wallet lacks funds

  // Sanitize numeric input and cap maximum slots at 5,000,000
  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value.replace(/\D/g, ""));
    if (val <= 5_000_000) setSlots(val || 0);
  };

  // Submit slot purchase when conditions are met
  const handleBuySlots = () => {
    if (!partyId || slots <= 0) return;
    buySlotsMutation.mutate({ partyID: partyId, quantity: slots });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-145 p-0 rounded-2xl border-none shadow-2xl  ">
        {/* Header */}
        <DialogHeader title="Buy slots" />

        <DialogPadding className="space-y-3 pb-6">
          <DescriptiveText text="Slots allow you accept and assign polling agents to polling units and supervisors to their respective areas for upcoming elections." />

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
                disabled={buySlotsMutation.isPending}
              />
            </div>
          </div>

          {/* Pricing breakdown */}
          <div className="rounded-xl bg-c-5 px-5 py-1 space-y-0 divide-y divide-dashed divide-c-30">
            <div className="h-12 flex items-center gap-3">
              <FancyBillIcon className="shrink-0 size-5" />
              <p className="text-base text-c-70 w-full">
                Price per slot for a polling agent
              </p>
              <span className="text-base font-semibold text-c-80">{formatNaira(pricePerSlot)}</span>
            </div>
            <div className="h-12 flex items-center gap-3">
              <FancyBillIcon className="shrink-0 size-5" />
              <p className="text-base text-c-70 w-full">
                Price for {slots.toLocaleString()} slot
                {slots !== 1 ? "s" : ""}
              </p>
              <span className="text-base font-semibold text-green">{formatNaira(totalCost)}</span>
            </div>
          </div>

          {/* Insufficient balance warning */}
          {!isInsufficient && (
            <div className="space-y-2">
              <PartyWalletBalance
                icon={<FancySadEmojiIcon className="shrink-0 size-6" />}
                label="Insufficient wallet balance"
                value={formatNaira(deficit)}
                className="bg-red/20"
                valueClassName="text-red"
              />
              {onDepositFunds && (
                <button
                  type="button"
                  onClick={() => onDepositFunds(deficit)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors cursor-pointer shadow-xs"
                >
                  <Coins className="size-4 text-emerald-600" />
                  Deposit funds to cover deficit ({formatNaira(deficit)})
                </button>
              )}
            </div>
          )}
          {!!isInsufficient && (
            <PartyWalletBalance
              icon={<FancyHappyEmojiIcon className="shrink-0 size-6" />}
              label="Wallet balance"
              value={formatNaira(walletBalanceNaira)}
              className="bg-secondary/20"
            />
          )}
        </DialogPadding>

        {/* Footer */}
        <DialogFooter>
          <Button
            variant="secondary"
            disabled={
              slots === 0 ||
              isInsufficient ||
              buySlotsMutation.isPending ||
              isPriceLoading
            }
            onClick={handleBuySlots}
          >
            {buySlotsMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Processing...
              </span>
            ) : (
              "Buy slots"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
