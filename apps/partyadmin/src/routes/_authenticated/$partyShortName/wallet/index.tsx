import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { DashboardLayout } from "@repo/ui/components/custom/AdminLayouts";
import type { ReactNode } from "react";
import { cn } from "@repo/ui/lib/utils";
import FancyBillIcon from "@repo/ui/icons/fancy-bill-icon";
import FancyWalletIcon from "@repo/ui/icons/fancy-wallet-icon";
import TransactionSendIcon from "@repo/ui/icons/transaction-send-icon";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Coins,
  Landmark,
  Wallet,
  Loader2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "#/hooks/useAppContext";
import {
  getPartyWallet,
  getPartyWalletTransactions,
} from "#/lib/server/parties";

export const Route = createFileRoute("/_authenticated/$partyShortName/wallet/")(
  {
    head: () => getPageHeader({ title: "Wallet" }),
    component: RouteComponent,
  },
);

function RouteComponent() {
  const { party } = useAppContext();
  const partyId = party?.id;
  const queryClient = useQueryClient();

  const { data: walletRes, isLoading: isWalletLoading } = useQuery({
    queryKey: ["partyWallet", partyId],
    queryFn: () => getPartyWallet({ data: partyId! }),
    enabled: !!partyId,
  });

  const { data: txRes, isLoading: isTxLoading } = useQuery({
    queryKey: ["partyWalletTransactions", partyId],
    queryFn: () =>
      getPartyWalletTransactions({
        data: { partyID: partyId!, limit: 50, offset: 0 },
      }),
    enabled: !!partyId,
  });

	// Safely extract the wallet, handling the case where it might be returned unwrapped from the cache
  const wallet = walletRes?.data?.wallet || ((walletRes as any)?.id ? (walletRes as any) : undefined);
  const transactions = txRes?.data?.transactions ?? [];

  const handleRefresh = () => {
    if (partyId) {
      queryClient.invalidateQueries({ queryKey: ["partyWallet", partyId] });
      queryClient.invalidateQueries({
        queryKey: ["partyWalletTransactions", partyId],
      });
      queryClient.invalidateQueries({ queryKey: ["party", partyId] });
    }
  };

  return (
    <DashboardLayout>
      <WalletHeader />
      <WalletBillboard
        wallet={wallet}
        isLoading={isWalletLoading}
        onWithdrawalClose={handleRefresh}
      />
      <WalletSlotsAllowanceSection wallet={wallet} onSuccess={handleRefresh} />
      <WalletTransactions transactions={transactions} isLoading={isTxLoading} />
    </DashboardLayout>
  );
}

function WalletHeader() {
  const { party } = useAppContext();
  return (
    <section className="h-16 flex items-center justify-between gap-4 pt-5">
      <h1 className="flex items-center gap-4">
        <FancyWalletIcon className="size-10 text-[#9b7b49]" />
        <p className="text-[26px] font-semibold text-c-90">
          {party?.shortName || party?.name || "Party"} Wallet
        </p>
      </h1>
    </section>
  );
}

import * as React from "react";
import { AccountDetailsDialog } from "#/components/dialogs/account-details-dialog";
import { WithdrawDialog } from "#/components/dialogs/withdraw-dialog";
import { BuyAgentSlotsDialog } from "#/components/dialogs/buy-agent-slots-dialog";
import { DepositAllowanceDialog } from "#/components/dialogs/deposit-allowance-dialog";
import FancyAgentIcon from "@repo/ui/icons/fancy-agent-icon";
import { getLocalDate } from "@repo/ui/lib/date";

/** Matches the Go PartyWalletTransaction struct serialised to JSON */
interface WalletTransaction {
  id: number;
  wallet_id: number;
  transaction_reference: string;
  type: "credit" | "debit";
  transaction_category:
    | "wallet_funding"
    | "wallet_withdrawal"
    | "slot_purchase"
    | "allowance_deposit";
  amount_kobo: number;
  balance_after_kobo: number;
  payer_name: string | null;
  payer_account_number: string | null;
  payer_bank_code: string | null;
  narration: string | null;
  raw_payload: unknown;
  created_at: string;
}

/** Matches the Go PartyWallet struct serialised to JSON */
interface PartyWallet {
  id: number;
  party_id: number;
  account_reference: string;
  account_numbers: {
    accountNumber: string;
    accountName: string;
    bankName: string;
    bankCode: string;
  }[];
  balance_kobo: number;
  currency_code: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function WalletBillboard({
  wallet,
  isLoading,
  onWithdrawalClose,
}: {
  wallet: PartyWallet | undefined;
  isLoading: boolean;
  onWithdrawalClose: () => void;
}) {
  const [isWalletDialogOpen, setIsWalletDialogOpen] = React.useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = React.useState(false);
  const { party } = useAppContext();

  const balanceKobo = wallet?.balance_kobo ?? 0;
  const balanceNaira = balanceKobo / 100;
  const formattedBalance = balanceNaira.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const balanceInBillion = balanceNaira >= 1_000_000_000;
  const scaleLabel = balanceInBillion
    ? "billion"
    : balanceNaira >= 1_000_000
      ? "million"
      : "";

  const CardTitle = ({ title }: { title: string }) => (
    <h2 className="text-[22px] text-c-90">{title}</h2>
  );

  return (
    <section className="bg-hover-3 rounded-[28px] p-6 space-y-5">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_1.35fr]">
        <div className="flex flex-col gap-8">
          <div>
            <CardTitle title="Balance" />
            {isLoading ? (
              <div className="mt-8 flex items-center gap-2">
                <Loader2 className="size-6 animate-spin text-[#9b7b49]" />
                <span className="text-sm text-c-50">Loading balance...</span>
              </div>
            ) : (
              <div className="mt-8 flex items-end gap-3">
                <span className="text-[40px] leading-none tracking-[-0.06em] text-c-90">
                  ₦{formattedBalance}
                </span>
                {scaleLabel && (
                  <span className="pb-0.5 text-[18px] text-[#8a8a8a]">
                    {scaleLabel}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <CardTitle title="Bills" />

          <div className="space-y-5">
            <BillRow
              title="Amount left to field agents in 112,093 polling units currently without polling agents."
              amount="₦1,550,020,000.00"
              status="Insufficient funds"
              statusClassName="text-[#ff2323]"
            />
            <BillRow
              title="Polling agent allowance after election is done"
              amount="₦550,020,000.00"
              status="Sufficient funds"
              statusClassName="text-[#2d7f55]"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <WalletAction
          variant="success"
          icon={<Wallet className="size-4" />}
          onClick={() => setIsWalletDialogOpen(true)}
        >
          {`Fund ${party?.shortName || "Party"} Wallet`}
        </WalletAction>
        <WalletAction
          variant="dark"
          icon={<ArrowUpFromLine className="size-4" />}
          onClick={() => setIsWithdrawDialogOpen(true)}
        >
          Withdraw
        </WalletAction>
      </div>

      <AccountDetailsDialog
        open={isWalletDialogOpen}
        setOpen={setIsWalletDialogOpen}
        onClose={() => setIsWalletDialogOpen(false)}
        wallet={wallet}
        onSuccess={onWithdrawalClose}
      />

      <WithdrawDialog
        open={isWithdrawDialogOpen}
        onClose={() => {
          setIsWithdrawDialogOpen(false);
          onWithdrawalClose();
        }}
        wallet={wallet}
      />
    </section>
  );
}

interface WalletQuickStatCardProps {
  title: string;
  value: string | number;
  description: string;
  buttonLabel: string;
  onClick: () => void;
  bgColorClass: string;
}

function WalletQuickStatCard({
  title,
  value,
  description,
  buttonLabel,
  onClick,
  bgColorClass,
}: WalletQuickStatCardProps) {
  return (
    <div
      className={cn(
        "rounded-[12px] px-5 py-4 flex flex-col justify-between flex-1",
        bgColorClass,
      )}
    >
      <div className="flex items-start gap-4">
        <FancyAgentIcon className="size-6" />
        <div className="space-y-2 w-full">
          <div className="flex items-center justify-between gap-5">
            <h3 className="text-xl text-c-80 tracking-tight leading-tight">
              {title}
            </h3>
            <p
              className="text-xl font-bold text-c-80 leading-none select-none pt-0.5"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {value}
            </p>
          </div>
          <div className="flex items-center justify-between gap-5">
            <p className="text-sm text-c-60 leading-normal max-w-[340px] pt-1">
              {description}
            </p>

            <button
              onClick={onClick}
              className="h-10 px-5 rounded-[12px] bg-[#1f1f1f] hover:bg-black text-white text-[14px] font-semibold transition cursor-pointer shrink-0"
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WalletSlotsAllowanceSection({
  wallet,
  onSuccess,
}: {
  wallet: PartyWallet | undefined;
  onSuccess: () => void;
}) {
  const { party } = useAppContext();
  const [isSlotsDialogOpen, setIsSlotsDialogOpen] = React.useState(false);
  const [isAllowanceDialogOpen, setIsAllowanceDialogOpen] =
    React.useState(false);

  const allowanceVal = (
    (party?.agentPaymentBalanceKobo ?? 0) / 100
  ).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <section className="flex gap-6">
      <WalletQuickStatCard
        title="Polling Agent Slots"
        value={party?.slots?.toLocaleString() || "0"}
        description="Slots allow you accept polling agent requests for upcoming elections."
        buttonLabel="Buy Slots"
        onClick={() => setIsSlotsDialogOpen(true)}
        bgColorClass="bg-[#fff0df]"
      />
      <WalletQuickStatCard
        title="Agent Allowance"
        value={`₦${allowanceVal}`}
        description="Funds set aside exclusively for paying polling agent allowances on election day."
        buttonLabel="Deposit"
        onClick={() => setIsAllowanceDialogOpen(true)}
        bgColorClass="bg-[#edf0ff]"
      />

      <BuyAgentSlotsDialog
        open={isSlotsDialogOpen}
        onClose={() => setIsSlotsDialogOpen(false)}
        partyId={party?.id}
        walletBalanceKobo={wallet?.balance_kobo ?? 0}
        onSuccess={onSuccess}
      />

      <DepositAllowanceDialog
        open={isAllowanceDialogOpen}
        onClose={() => setIsAllowanceDialogOpen(false)}
        partyId={party?.id}
        walletBalanceKobo={wallet?.balance_kobo ?? 0}
        onSuccess={onSuccess}
      />
    </section>
  );
}

export function WalletTransactions({
  transactions,
  isLoading,
}: {
  transactions: WalletTransaction[];
  isLoading: boolean;
}) {
  return (
    <section className="">
      <h2 className="mb-8 text-[22px] font-medium tracking-[-0.03em] text-[#202020]">
        Transactions
      </h2>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-8 animate-spin text-[#9b7b49]" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-10 text-c-50">
          No transactions found.
        </div>
      ) : (
        <div className="space-y-6">
          {transactions.map((tx) => {
            const isCredit = tx.type === "credit";
            const amountNaira = (tx.amount_kobo ?? 0) / 100;
            const formattedAmount = `${isCredit ? "+" : "-"} ₦${amountNaira.toLocaleString(
              "en-NG",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              },
            )}`;

            // Derive label, icon and colour from the semantic transaction_category field
            type TxMeta = { label: string; icon: React.ReactNode };
            const categoryMeta: Record<
              WalletTransaction["transaction_category"],
              TxMeta
            > = {
              wallet_funding: {
                label: "Wallet Funded",
                icon: <CheckCircle2 className="size-6 text-[#10dd84]" />,
              },
              wallet_withdrawal: {
                label: "Wallet Withdrawal",
                icon: <ArrowUpFromLine className="size-6 text-[#a0a0a0]" />,
              },
              slot_purchase: {
                label: "Polling Agent Slots",
                icon: <Coins className="size-6 text-[#9b7b49]" />,
              },
              allowance_deposit: {
                label: "Agent Allowance Deposit",
                icon: <Landmark className="size-6 text-[#6366f1]" />,
              },
            };
            const meta = categoryMeta[tx.transaction_category] ?? {
              label: isCredit ? "Wallet Funded" : "Wallet Debit",
              icon: <ArrowUpFromLine className="size-6 text-[#a0a0a0]" />,
            };

            // Use the narration from the backend when present, otherwise fall back to the category label
            const narration = tx.narration ? tx.narration : meta.label;

            // created_at is a string representing the timestamp
            const dateStr = tx.created_at
              ? getLocalDate(tx.created_at, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—";

            return (
              <TransactionRow
                key={tx.id}
                title={narration}
                date={dateStr}
                amount={formattedAmount}
                status="Successful"
                icon={meta.icon}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function WalletAction({
  children,
  icon,
  variant,
  onClick,
}: {
  children: string;
  icon: ReactNode;
  variant: "success" | "dark";
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-10 items-center gap-2 rounded-[12px] px-4 font-medium transition cursor-pointer",
        variant === "success"
          ? "bg-[#10dd84] text-[#093920] hover:bg-[#09d57c]"
          : "bg-[#252525] text-white hover:bg-[#111]",
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function BillRow({
  title,
  amount,
  status,
  statusClassName,
}: {
  title: string;
  amount: string;
  status: string;
  statusClassName: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <FancyBillIcon className="size-6 shrink-0" />

      <div className="w-full text-md leading-7 text-c-80 mr-10">{title}</div>
      <div className="text-right">
        <div className="text-md font-semibold leading-7 text-[#242424]">
          {amount}
        </div>
        <div className={cn("text-sm", statusClassName)}>{status}</div>
      </div>
    </div>
  );
}

function TransactionRow({
  title,
  date,
  amount,
  status,
  icon,
}: {
  title: ReactNode;
  date: string;
  amount: string;
  status: string;
  icon: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-6">
      <div className="flex size-10 items-center justify-center rounded-full bg-white">
        {icon || <TransactionSendIcon />}
      </div>
      <div className="space-y-1">
        <div className="text-c-80">{title}</div>
        <div className="text-sm text-c-50">{date}</div>
      </div>
      <div className="space-y-1 text-right">
        <div className="text-c-80">{amount}</div>
        <div className="text-sm text-purple">{status}</div>
      </div>
    </div>
  );
}
