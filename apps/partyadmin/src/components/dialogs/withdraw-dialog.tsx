import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { ChevronDown, Package, Loader2 } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { SelectResponsiveWrapper } from "@repo/ui/components/selects/select-responsive-wrapper";
import { GeneralCommand } from "@repo/ui/components/command/general-command";
import { useMutation } from "@tanstack/react-query";
import { withdrawFromPartyWallet } from "#/lib/server/parties";

const NIGERIAN_BANKS = [
  { code: "058", name: "Guaranty Trust Bank (GTBank)" },
  { code: "057", name: "Zenith Bank" },
  { code: "044", name: "Access Bank" },
  { code: "094", name: "Wema Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "033", name: "United Bank for Africa (UBA)" },
  { code: "232", name: "Sterling Bank" },
  { code: "050", name: "Ecobank" },
  { code: "070", name: "Fidelity Bank" },
  { code: "030", name: "Heritage Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "035", name: "Providus Bank" },
  { code: "039", name: "Stanbic IBTC Bank" },
  { code: "068", name: "Standard Chartered Bank" },
  { code: "100", name: "SunTrust Bank" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "215", name: "Unity Bank" },
];

export function WithdrawDialog({
  open,
  onClose,
  wallet,
}: {
  open: boolean;
  onClose: () => void;
  wallet?: {
    id: number;
    party_id: number;
    balance_kobo: number;
  };
}) {
  const [amount, setAmount] = React.useState(100000);
  const [selectedBank, setSelectedBank] = React.useState<{ code: string; name: string } | null>(null);
  const [bankOpen, setBankOpen] = React.useState(false);
  const [accountNumber, setAccountNumber] = React.useState("");
  const [narration, setNarration] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");

  const withdrawMutation = useMutation({
    mutationFn: (variables: any) => withdrawFromPartyWallet({ data: variables }),
    onSuccess: (res: any) => {
      if (res && res.success) {
        alert("Withdrawal requested successfully!");
        onClose();
      } else {
        setErrorMsg(res?.message || "Failed to process withdrawal");
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Something went wrong");
    }
  });

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    const parsed = Number(rawVal) || 0;
    setAmount(parsed);
  };

  const handleWithdraw = async () => {
    if (!wallet) return;
    setErrorMsg("");

    const amountKobo = amount * 100;
    if (amountKobo <= 0) {
      setErrorMsg("Amount must be greater than zero");
      return;
    }

    if (amountKobo > (wallet.balance_kobo ?? 0)) {
      setErrorMsg("Insufficient wallet balance");
      return;
    }

    if (!selectedBank) {
      setErrorMsg("Please select a bank");
      return;
    }

    if (accountNumber.length !== 10) {
      setErrorMsg("Bank account number must be 10 digits");
      return;
    }

    withdrawMutation.mutate({
      partyID: wallet.party_id,
      amountKobo,
      transactionReference: "wd-" + Math.random().toString(36).substring(2, 15),
      bankAccountNumber: accountNumber,
      bankCode: selectedBank.code,
      narration: narration || "Wallet withdrawal",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-hidden">
        <DialogHeader title="Withdraw" />

        <DialogPadding className="space-y-6 pb-6 max-h-[75vh] overflow-y-auto">
          {/* Info Banner */}
          <div className="flex items-start gap-3 rounded-xl bg-[#edf3ff] px-4 py-3.5">
            <Package className="size-5 shrink-0 text-[#3182ce] mt-0.5" />
            <p className="leading-[1.6] text-[14px] text-[#2b6cb0] font-medium">
              Enter the amount to withdraw and select a payout method. It may
              take between 1 to 5 working days for the withdrawal to complete.
            </p>
          </div>

          {/* Amount input */}
          <div className="py-2 gap-1.5">
            <p className="text-sm font-medium text-c-70">Amount (NGN)</p>
            <div className="flex items-center w-full text-center mt-2">
              <div className="inline-flex items-center gap-1 border-b border-gray-200 pb-2 w-full">
                <span className="text-[40px] font-bold text-c-80 select-none">
                  ₦
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount.toLocaleString("en-NG")}
                  onChange={handleAmountChange}
                  className="text-[40px] font-bold text-c-80 outline-none bg-transparent p-0 border-none leading-none focus:outline-none focus:ring-0 w-full"
                  style={{
                    fontVariantNumeric: "tabular-nums",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Payout bank select */}
          <div className="space-y-2 relative">
            <label className="text-[15px] font-semibold text-c-60">
              Select Bank
            </label>
            <SelectResponsiveWrapper
              open={bankOpen}
              onOpenChange={setBankOpen}
              placeholder="Search bank..."
              align="start"
              className="w-full font-medium"
              trigger={
                <button
                  type="button"
                  onClick={() => setBankOpen(!bankOpen)}
                  className="w-full flex items-center justify-between h-14 px-4 rounded-xl border border-gray-200 bg-white text-c-80 font-medium text-[15px] focus:outline-none focus:border-c-60 transition cursor-pointer"
                >
                  <span className="truncate">
                    {selectedBank ? selectedBank.name : "Choose payout bank"}
                  </span>
                  <ChevronDown className="size-5 text-c-50 shrink-0 ml-2" />
                </button>
              }
            >
              <GeneralCommand
                data={NIGERIAN_BANKS}
                getId={(item) => item.code}
                getName={(item) => item.name}
                handleSelect={(item) => {
                  setSelectedBank(item);
                  setBankOpen(false);
                }}
                selectedId={selectedBank?.code}
              />
            </SelectResponsiveWrapper>
          </div>

          {/* Bank Account Number */}
          <div className="space-y-2">
            <label className="text-[15px] font-semibold text-c-60">
              Account Number
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              placeholder="Enter 10-digit account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              className="w-full h-14 px-4 rounded-xl border border-gray-200 bg-white text-c-80 font-medium text-[15px] focus:outline-none focus:border-c-60 focus:ring-0 transition"
            />
          </div>

          {/* Narration */}
          <div className="space-y-2">
            <label className="text-[15px] font-semibold text-c-60">
              Narration (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Polling agents budget payout"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className="w-full h-14 px-4 rounded-xl border border-gray-200 bg-white text-c-80 font-medium text-[15px] focus:outline-none focus:border-c-60 focus:ring-0 transition"
            />
          </div>

          {errorMsg && (
            <p className="text-sm font-semibold text-red-500 mt-2">{errorMsg}</p>
          )}
        </DialogPadding>

        <DialogFooter className="flex items-center justify-end gap-3">
          <Button
            onClick={onClose}
            className="bg-[#f1f1f4] hover:bg-[#e4e4e7] text-c-80 rounded-xl px-7 h-11 text-[15px] font-bold border-none shadow-none transition-colors duration-150"
          >
            Cancel
          </Button>
          <Button
            onClick={handleWithdraw}
            disabled={withdrawMutation.isPending}
            className="bg-[#252525] hover:bg-black text-white rounded-xl px-7 h-11 text-[15px] font-bold border-none shadow-none transition-colors duration-150 flex items-center justify-center gap-2"
          >
            {withdrawMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Execute Withdrawal</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
