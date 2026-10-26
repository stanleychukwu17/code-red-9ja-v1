import { useEffect } from "react";
import { getBanks, validateBankAccount } from "#/lib/server/banks";
import { Input, Label } from "@repo/ui/components/input";
import { SelectBank } from "@repo/ui/components/selects/bank-select";
import { cn } from "@repo/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, XCircle } from "lucide-react";
import { StepHeader } from "./shared/StepHeader";

/** Step 11: Bank account details and automated Paystack/NIBSS account name verification */
export const Step11 = ({
  bankAccountNumber,
  setBankAccountNumber,
  selectedBankCode,
  setSelectedBankCode,
  user,
  setIsValidatingAccount,
  setIsAccountValid,
}: any) => {
  const { data: validationResponse, isLoading: isValidating } = useQuery({
    queryKey: ["validateAccount", bankAccountNumber, selectedBankCode],
    queryFn: () =>
      validateBankAccount({
        data: {
          accountNumber: bankAccountNumber,
          bankCode: selectedBankCode,
        },
      }),
    enabled: bankAccountNumber.length === 10 && !!selectedBankCode,
    staleTime: 1000 * 60 * 5, // cache for 5 minutes
  });

  const accountName = validationResponse?.success
    ? validationResponse?.data?.accountName
    : validationResponse?.accountName;

  const isError =
    validationResponse &&
    !validationResponse.success &&
    validationResponse.success !== undefined;
  const isValid = !!accountName && !isError;

  useEffect(() => {
    if (setIsValidatingAccount) setIsValidatingAccount(isValidating);
  }, [isValidating, setIsValidatingAccount]);

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
            initialData={selectedBankCode}
            update={setSelectedBankCode}
            fetchBanks={getBanks}
          />
        </div>

        {bankAccountNumber.length === 10 && selectedBankCode && (
          <div
            className={cn(
              "flex items-center gap-3 p-4.5 rounded-2xl mt-2",
              isError
                ? "bg-red-50 text-red-600"
                : isValidating
                  ? "bg-neutral-50 text-neutral-500"
                  : "bg-secondary/10 text-primary",
            )}
          >
            <div
              className={cn(
                "size-5 rounded-full flex items-center justify-center shrink-0",
                isError
                  ? "bg-red-100 text-red-600"
                  : isValidating
                    ? "bg-transparent text-neutral-500"
                    : "bg-secondary text-white",
              )}
            >
              {isValidating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isError ? (
                <XCircle className="size-4" />
              ) : (
                <Check className="size-3 stroke-[3]" />
              )}
            </div>
            <span
              className={cn(
                "font-medium text-lg",
                isError ? "text-red-600" : "text-primary",
              )}
            >
              {isValidating
                ? "Verifying account..."
                : isError
                  ? "Invalid Account Number"
                  : accountName || "Unknown User"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
