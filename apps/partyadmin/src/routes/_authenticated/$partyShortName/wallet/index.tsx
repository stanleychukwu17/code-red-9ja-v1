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
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/wallet/" as never)({
  head: () => getPageHeader({ title: "Wallet" }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <DashboardLayout>
      <WalletHeader />
      <WalletBillboard />
      <WalletSlotsAllowanceSection />
      <WalletTransactions />
    </DashboardLayout>
  );
}

function WalletHeader() {
  return (
    <section className="h-16 flex items-center justify-between gap-4 pt-5">
      <h1 className="flex items-center gap-4">
        <FancyWalletIcon className="size-10 text-[#9b7b49]" />
        <p className="text-[26px] font-semibold text-c-90">NDC Wallet</p>
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

function WalletBillboard() {
  const [isWalletDialogOpen, setIsWalletDialogOpen] = React.useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = React.useState(false);

  const CardTitle = ({ title }: { title: string }) => (
    <h2 className="text-[22px] text-c-90">{title}</h2>
  );

  return (
    <section className="bg-hover-3 rounded-[28px] p-6 space-y-5">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_1.35fr]">
        <div className="flex flex-col gap-8">
          <div>
            <CardTitle title="Balance" />
            <div className="mt-8 flex items-end gap-3">
              <span className="text-[40px] leading-none tracking-[-0.06em] text-c-90">
                ₦1,450,020,000.00
              </span>
              <span className="pb-0.5 text-[18px] text-[#8a8a8a]">billion</span>
            </div>
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
          Fund NDC Wallet
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
      />

      <WithdrawDialog
        open={isWithdrawDialogOpen}
        onClose={() => setIsWithdrawDialogOpen(false)}
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

function WalletSlotsAllowanceSection() {
  const [isSlotsDialogOpen, setIsSlotsDialogOpen] = React.useState(false);
  const [isAllowanceDialogOpen, setIsAllowanceDialogOpen] =
    React.useState(false);

  return (
    <section className="flex gap-6">
      <WalletQuickStatCard
        title="Polling Agent Slots"
        value="219"
        description="Slots allow you accept polling agent requests for upcoming elections."
        buttonLabel="Buy Slots"
        onClick={() => setIsSlotsDialogOpen(true)}
        bgColorClass="bg-[#fff0df]"
      />
      <WalletQuickStatCard
        title="Agent Allowance"
        value="₦1,450,020"
        description="Slots allow you accept polling agent requests for upcoming elections."
        buttonLabel="Deposit"
        onClick={() => setIsAllowanceDialogOpen(true)}
        bgColorClass="bg-[#edf0ff]"
      />

      <BuyAgentSlotsDialog
        open={isSlotsDialogOpen}
        onClose={() => setIsSlotsDialogOpen(false)}
      />

      <DepositAllowanceDialog
        open={isAllowanceDialogOpen}
        onClose={() => setIsAllowanceDialogOpen(false)}
      />
    </section>
  );
}

export function WalletTransactions() {
  return (
    <section className="rounded-[28px] bg-[#fafafa] p-6">
      <h2 className="mb-8 text-[22px] font-medium tracking-[-0.03em] text-[#202020]">
        Transactions
      </h2>

      <div className="space-y-6">
        <TransactionRow
          title="Withdrew funds"
          date="Jul 6, 2027"
          amount="₦50,000,000.00"
          status="Successful"
          icon={<ArrowDownToLine className="size-6 text-[#a0a0a0]" />}
        />
        <TransactionRow
          title={
            <>
              Deposited polling agent allowance for{" "}
              <strong>100,000 agents</strong>
            </>
          }
          date="Jul 6, 2027"
          amount="₦1,000,000,000.00"
          status="Successful"
          icon={<ArrowDownToLine className="size-6 text-[#a0a0a0]" />}
        />
        <TransactionRow
          title="Bought 100,000 party agent slots"
          date="Jul 6, 2027"
          amount="₦500,000,000.00"
          status="Successful"
          icon={<ArrowDownToLine className="size-6 text-[#a0a0a0]" />}
        />
        <TransactionRow
          title="Funded Wallet"
          date="Jul 6, 2027"
          amount="₦3,000,000,000.00"
          status="Successful"
          icon={<CheckCircle2 className="size-6 text-[#8fe8c8]" />}
        />
      </div>
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
        <TransactionSendIcon />
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
