import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Package, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getPartySlotPrice, buyPartySlots } from "#/lib/server/parties";
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

export function BuyAgentSlotsDialog({
  open,
  onClose,
  partyId,
  walletBalanceKobo,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  partyId?: number;
  walletBalanceKobo: number;
  onSuccess?: () => void;
}) {
  const [slots, setSlots] = React.useState(100);
  const [isPending, setIsPending] = React.useState(false);

  const { data: priceRes, isLoading: isPriceLoading } = useQuery({
    queryKey: ["partySlotPrice", partyId],
    queryFn: () => getPartySlotPrice({ data: partyId! }),
    enabled: !!partyId && open,
  });

  const pricePerSlot =
    priceRes?.success && priceRes?.data?.unit_price_kobo !== undefined
      ? priceRes.data.unit_price_kobo / 100
      : 1000; // fallback to 1000 NGN if loading/error

  const buySlotsMutation = useMutation({
    mutationFn: (variables: { partyID: number; quantity: number }) =>
      buyPartySlots({ data: variables }),
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

  const walletBalanceNaira = walletBalanceKobo / 100;
  const totalCost = slots * pricePerSlot;
  const deficit = totalCost - walletBalanceNaira;
  const isInsufficient = deficit > 0;

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value.replace(/\D/g, ""));
    if (val <= 5_000_000) setSlots(val || 0);
  };

  const handleBuySlots = () => {
    if (!partyId || slots <= 0) return;
    buySlotsMutation.mutate({ partyID: partyId, quantity: slots });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl  ">
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
              <span
                className={cn(
                  "text-base font-semibold text-c-80",
                  isPriceLoading && "animate-pulse",
                )}
              >
                {!isPriceLoading && <>{formatNaira(pricePerSlot)}</>}
              </span>
            </div>
            <div className="h-12 flex items-center gap-3">
              <FancyBillIcon className="shrink-0 size-5" />
              <p className="text-base text-c-70 w-full">
                Price for {slots.toLocaleString()} slot
                {slots !== 1 ? "s" : ""}
              </p>
              <span
                className={cn(
                  "text-base font-semibold text-green",
                  isPriceLoading && "animate-pulse",
                )}
              >
                {!isPriceLoading && <>{formatNaira(totalCost)}</>}
              </span>
            </div>
          </div>

          {/* Insufficient balance warning */}
          {!isPriceLoading && isInsufficient && (
            <PartyWalletBalance
              icon={<FancySadEmojiIcon className="shrink-0 size-6" />}
              label="Insufficient wallet balance"
              value={formatNaira(deficit)}
              className="bg-red/20"
              valueClassName="text-red"
            />
          )}
          {!isPriceLoading && !isInsufficient && (
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
