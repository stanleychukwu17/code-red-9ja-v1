import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { ChevronDown, Loader2, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { DescriptiveText } from "../custom/Texts";
import FancySadEmojiIcon from "../../icons/fancy-sad-emoji-icon";
import FancyHappyEmojiIcon from "../../icons/fancy-happy-emoji-icon";
import FancyBillIcon from "../../icons/fancy-bill-icon";
import { Label } from "../input";
import { SelectElectionGroup } from "../selects/election-group-select";

export type DepositAgentPaymentDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (amountKobo: number) => void | Promise<void>;
  isPending?: boolean;
  walletBalanceNaira?: number;
  agentPaymentBalanceNaira?: number;
  partyId?: number;
  electionGroupId?: number;
  onElectionGroupChange?: (id: number) => void;
  fetchElectionGroups: (args: {
    data: { partyId?: number; limit?: number; cursor?: string };
  }) => Promise<any>;
  breakdown?: Array<{ label: string; value: number }>;
  defaultDepositAmount?: number;
};

function formatNaira(value: number) {
  return `NGN ${value.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatNairaSymbol(value: number) {
  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function BalanceRow({
  icon,
  label,
  value,
  className,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-14 items-center justify-between gap-3 rounded-[14px] px-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-[18px] leading-none">{icon}</span>
        <p className="text-[15px] font-medium text-c-70">{label}</p>
      </div>
      <span
        className={cn(
          "shrink-0 text-[15px] font-semibold text-c-90",
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function PartyWalletBalance({
  icon,
  label,
  value,
  className,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "h-14 rounded-xl bg-c-5 px-5 flex items-center justify-between gap-3",
        className,
      )}
    >
      {icon}
      <p className="text-[15px] font-medium text-c-70 w-full">{label}</p>
      <span
        className={cn(
          "shrink-0 text-[15px] font-semibold text-c-90 whitespace-nowrap",
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function PricingRow({
  icon,
  label,
  value,
  isLoading,
  valueClassName = "text-c-80",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  isLoading?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="h-12 flex items-center gap-3">
      {icon ?? <FancyBillIcon className="shrink-0 size-5" />}
      <p className="text-base text-c-70 w-full">{label}</p>
      <span
        className={cn(
          "text-base font-semibold",
          valueClassName,
          isLoading && "animate-pulse",
        )}
      >
        {!isLoading && <>{value}</>}
      </span>
    </div>
  );
}

export function DepositAgentPaymentDialog({
  open,
  onClose,
  onSubmit,
  isPending,
  walletBalanceNaira = 1450000000,
  agentPaymentBalanceNaira = 500000,
  partyId,
  electionGroupId,
  onElectionGroupChange,
  fetchElectionGroups,
  breakdown = [
    { label: "Polling Agent: Deposit Left", value: 221130000 },
    { label: "Ward Supervisor: Deposit Left", value: 25580000 },
    { label: "LGA Supervisor: Deposit Left", value: 3800000 },
    { label: "State Supervisor: Deposit Left", value: 2000000 },
  ],
  defaultDepositAmount = 100000000,
}: DepositAgentPaymentDialogProps) {
  const [depositAmount, setDepositAmount] = React.useState(
    defaultDepositAmount.toLocaleString("en-NG"),
  );

  React.useEffect(() => {
    if (!open) return;
    setDepositAmount(defaultDepositAmount.toLocaleString("en-NG"));
  }, [open, defaultDepositAmount]);

  const total = breakdown.reduce((sum, item) => sum + item.value, 0);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[580px]">
        <DialogHeader title="Top up Agent Payment" />

        <DialogPadding>
          <DescriptiveText text="Party agents can only perform their election-day duties once their payment have been deposited here." />

          <div className="space-y-5">
            <div className="py-6 flex flex-col items-center gap-2">
              <p className="text-sm text-c-50">Deposit Amount</p>
              <div className="flex items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  value={depositAmount ? `₦${depositAmount}` : ""}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^\d]/g, "");
                    setDepositAmount(
                      digits ? Number(digits).toLocaleString("en-NG") : "",
                    );
                  }}
                  placeholder="₦0"
                  className="text-[52px] font-bold text-c-80 text-center bg-transparent outline-none w-full leading-none pb-1 caret-c-80"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                  disabled={!!isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <PartyWalletBalance
                icon={<FancyHappyEmojiIcon className="shrink-0 size-6" />}
                label="Wallet balance"
                value={formatNairaSymbol(walletBalanceNaira)}
                className="bg-secondary/20"
              />

              <PartyWalletBalance
                icon={<FancySadEmojiIcon className="shrink-0 size-6" />}
                label="Agent Payment Balance"
                value={formatNairaSymbol(agentPaymentBalanceNaira)}
                className="bg-background border border-c-90"
              />
            </div>

            <div className="rounded-xl bg-c-5 pb-2 px-5">
              <div className="space-y-4 pt-5">
                <div className="space-y-2">
                  <Label title="Election Group" />
                  <SelectElectionGroup
                    partyId={partyId}
                    selectedId={electionGroupId}
                    fetchElectionGroups={fetchElectionGroups}
                    update={(item) => onElectionGroupChange?.(item.id)}
                    className="h-[44px] w-full"
                  />
                </div>

                <div className="pt-1">
                  {breakdown.map((item, index) => (
                    <PricingRow
                      key={index}
                      label={item.label}
                      value={formatNairaSymbol(item.value)}
                    />
                  ))}
                  <div className="border-t border-dashed border-c-30">
                    <PricingRow
                      label="Total"
                      value={formatNairaSymbol(total)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogPadding>

        <DialogFooter>
          <Button
            variant="secondary"
            size="3xl"
            onClick={() => {
              const digits = depositAmount.replace(/[^\d]/g, "");
              const amountNaira = digits ? Number(digits) : 0;
              if (amountNaira > 0) onSubmit(amountNaira * 100);
            }}
            disabled={!!isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Deposit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
