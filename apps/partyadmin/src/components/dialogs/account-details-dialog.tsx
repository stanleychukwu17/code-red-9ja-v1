import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Package, Loader2, Coins } from "lucide-react";
import * as React from "react";
import { useAppContext } from "#/hooks/useAppContext";
import { fundPartyWalletTest } from "#/lib/server/parties";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

interface AccountNumber {
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
}

export function AccountDetailsDialog({
  open,
  setOpen,
  onClose,
  wallet,
  onSuccess,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onClose: () => void;
  wallet?: {
    account_numbers?: AccountNumber[];
  };
  onSuccess?: () => void;
}) {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const fundMutation = useMutation({
    mutationFn: (variables: { partyID: number; amountKobo: number }) =>
      fundPartyWalletTest({ data: variables }),
    onSuccess: (res) => {
      if (res && res.success) {
        toast.success(
          `Successfully simulated transfer of ₦${fundAmount.toLocaleString()} to your party wallet!`,
        );
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
  const [fundAmount, setFundAmount] = React.useState(50000);
  const { party } = useAppContext();
  const partyId = party?.id;

  const handleCopy = (num: string, index: number) => {
    navigator.clipboard.writeText(num);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleFundAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    const parsed = Number(rawVal) || 0;
    setFundAmount(parsed);
  };

  const handleSimulateFunding = () => {
    if (!partyId || fundAmount <= 0) return;
    fundMutation.mutate({
      partyID: partyId,
      amountKobo: fundAmount * 100, // convert Naira input to Kobo
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-hidden">
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
          <div className="border border-dashed border-emerald-500/30 rounded-xl p-5 space-y-4 bg-emerald-50/5">
            <div className="flex items-center gap-2">
              <Coins className="size-5 text-[#22c55e]" />
              <h4 className="text-sm font-bold text-c-80">
                Simulate Payment Transfer (Sandbox Dev Mode)
              </h4>
            </div>
            <p className="text-xs text-c-60 leading-normal">
              Enter an amount below to directly credit your wallet balance for
              local sandbox testing.
            </p>

            <div className="flex gap-3">
              <div className="flex items-center bg-[#f1f1f4] rounded-lg px-3 py-1.5 flex-1 max-w-[200px]">
                <span className="text-[14px] font-semibold text-c-70 mr-0.5">
                  ₦
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fundAmount.toLocaleString("en-NG")}
                  onChange={handleFundAmountChange}
                  className="bg-transparent border-none outline-none font-semibold text-[14px] text-c-80 w-full text-right p-0"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                  disabled={fundMutation.isPending}
                />
              </div>

              <Button
                onClick={handleSimulateFunding}
                className="bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-lg px-5 h-9 text-[13px] font-bold border-none shadow-none transition-colors duration-150 shrink-0"
                disabled={fundAmount <= 0 || fundMutation.isPending}
              >
                {fundMutation.isPending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="size-3.5 animate-spin" />
                    Simulating...
                  </span>
                ) : (
                  "Simulate Fund"
                )}
              </Button>
            </div>
          </div>
        </DialogPadding>

        <DialogFooter className="border-t border-gray-100 pt-3 pb-4">
          <Button variant="deepGrey" size="lg" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
