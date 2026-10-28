import { useEffect } from "react";
import { getBanks } from "#/lib/server/banks";
import { Input, Label } from "@repo/ui/components/input";
import { SelectBank } from "@repo/ui/components/selects/bank-select";
import { Check } from "lucide-react";
import { useApplyContext } from "../../context/ApplyContext";
import { StepHeader } from "./shared/StepHeader";

/** Step 11: Bank account details for future payouts */
export const Step11 = () => {
  const {
    bankAccountNumber,
    setBankAccountNumber,
    selectedBankCode,
    setSelectedBankCode,
    setIsValidatingAccount,
    setIsAccountValid,
  } = useApplyContext();

  // Valid once user enters 10 digits and selects a bank
  const isValid = bankAccountNumber.length === 10 && !!selectedBankCode;

  // Clear any validating flags
  useEffect(() => {
    if (setIsValidatingAccount) setIsValidatingAccount(false);
  }, [setIsValidatingAccount]);

  // Sync validity status to context so the footer allows proceeding when complete
  useEffect(() => {
    if (setIsAccountValid) setIsAccountValid(isValid);
  }, [isValid, setIsAccountValid]);

  return (
    <div className="flex flex-col gap-4 w-full px-4">
      <StepHeader
        title="Add Bank Account Details"
        subtitle="Provide details for any future payout."
      />
      <div className="space-y-8 mt-2">
        <div className="flex flex-col gap-2">
          <Label title="Account Number" />
          <Input
            type="text"
            maxLength={10}
            placeholder="Enter acct. number"
            value={bankAccountNumber}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setBankAccountNumber(val);
            }}
            className="h-14 rounded-2xl"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label title="Bank" />
          <SelectBank
            initialData={selectedBankCode ?? undefined}
            update={setSelectedBankCode}
            fetchBanks={getBanks}
          />
        </div>

        {isValid && (
          <div className="flex items-center gap-3 p-4 rounded-2xl mt-2 border bg-success/15 border-success/30 text-c-100 transition">
            <div className="size-5 rounded-full flex items-center justify-center shrink-0 bg-success text-white">
              <Check className="size-3 stroke-3" />
            </div>
            <span className="font-medium text-sm text-c-100">
              Account details provided
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
