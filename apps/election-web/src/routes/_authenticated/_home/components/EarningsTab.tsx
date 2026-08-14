import { useQuery } from "@tanstack/react-query";
import { getMyWallet, getMyWalletTransactions } from "#/lib/server/users";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import ArrowHandleIcon from "@repo/ui/icons/arrow-handle-icon";
import { cn } from "@repo/ui/lib/utils";
import { getLocalDate } from "@repo/ui/lib/date";

export interface UserWalletTransaction {
  id: number;
  wallet_id: number;
  transaction_reference: string;
  type: "credit" | "debit";
  amount_kobo: number;
  balance_after_kobo: number;
  narration?: string;
  created_at: string;
}

export function TransactionCard({
  transaction,
}: {
  transaction: UserWalletTransaction;
}) {
  const isDeposit = transaction.type === "credit";
  const title =
    transaction.narration ||
    (isDeposit ? "Wallet Balance: Funded" : "Wallet Balance: Debited");

  const amountNaira = (transaction.amount_kobo ?? 0) / 100;
  const formattedAmount = `${isDeposit ? "+" : "-"}₦${amountNaira.toLocaleString(
    "en-NG",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;

  const dateStr = transaction.created_at
    ? getLocalDate(transaction.created_at, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <div className="h-16 flex items-center md:px-2 hover:bg-c-5 rounded-2xl transition-colors gap-3">
      <div
        className={cn(
          "size-11 rounded-full flex items-center justify-center shrink-0",
          isDeposit ? "bg-green/20 text-green" : "bg-c-10 text-c-80",
        )}
      >
        {isDeposit ? (
          <ArrowHandleIcon className="size-4 rotate-90" />
        ) : (
          <ArrowHandleIcon className="size-4 -rotate-90" />
        )}
      </div>
      <div className="space-y-1 w-full text-sm md:text-base">
        <div className="flex items-center gap-2 w-full">
          <p className="w-full text-c-90 line-clamp-1 font-medium">{title}</p>
          <p
            className={cn(
              "shrink-0 font-semibold",
              isDeposit ? "text-green" : "text-c-90",
            )}
          >
            {formattedAmount}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full">
          <p className="text-sm text-c-50 w-full">{dateStr}</p>
          <p className="shrink-0 text-sm text-green font-medium">Successful</p>
        </div>
      </div>
    </div>
  );
}

export function EarningsTab() {
  const { data: walletRes } = useQuery({
    queryKey: ["myWallet"],
    queryFn: () => getMyWallet(),
  });

  const { data: txRes, isLoading: isTxLoading } = useQuery({
    queryKey: ["myWalletTransactions"],
    queryFn: () => getMyWalletTransactions({ data: { limit: 50, offset: 0 } }),
  });

  const balanceKobo = walletRes?.success
    ? (walletRes?.data?.wallet?.balance_kobo ?? 0)
    : 0;
  const balanceNaira = balanceKobo / 100;
  const formattedBalance = `₦${balanceNaira.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const transactions: UserWalletTransaction[] =
    txRes?.success && Array.isArray(txRes?.data?.transactions)
      ? txRes.data.transactions
      : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-yellow/20 rounded-[16px] pl-3 pr-5 py-3 flex items-center gap-2">
        <FancyMoneyBagIcon className="shrink-0 size-7" />
        <div className="space-y-1 w-full">
          <div className="flex items-center text-lg">
            <p className="w-full text-c-80">Earnings</p>
            <span className="text-c-80 font-bold text-lg">
              {formattedBalance}
            </span>
          </div>
          <div className="flex items-center text-sm text-c-50">
            <span className="w-full">
              Paid after completion of all election day duties.
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 mt-2">
        <h4 className="font-semibold text-c-80 text-base">Transactions</h4>
        {isTxLoading ? (
          <p className="text-sm text-c-50 py-4 text-center">
            Loading transactions...
          </p>
        ) : transactions.length > 0 ? (
          <div className="flex flex-col gap-1">
            {transactions.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-c-50 py-4 text-center">
            No transactions yet.
          </p>
        )}
      </div>
    </div>
  );
}
