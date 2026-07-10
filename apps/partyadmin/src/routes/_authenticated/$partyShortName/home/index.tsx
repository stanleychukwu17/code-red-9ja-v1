import * as React from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { APP_URL } from "#/lib/config";
import { Avatar, AvatarImage } from "@repo/ui/components/avatar";
import FancyAgentIcon from "@repo/ui/icons/fancy-agent-icon";
import { cn } from "@repo/ui/lib/utils";
import { ChevronDown } from "lucide-react";
import { getPageHeader } from "#/lib/shared/meta";
import { Button } from "@repo/ui/components/button";
import { RECENT_APPLICATIONS } from "./-dummy_data";
import { DashboardLayout } from "@repo/ui/components/custom/AdminLayouts";
import { AccountDetailsDialog } from "#/components/dialogs/account-details-dialog";
import { BuyAgentSlotsDialog } from "#/components/dialogs/buy-agent-slots-dialog";
import { SetAgentPaymentDialog } from "#/components/dialogs/set-agent-payment-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "#/providers/providers";
import { getPartyWallet } from "#/lib/server/parties";
import { HomePageHeader } from "./-header";

export const Route = createFileRoute("/_authenticated/$partyShortName/home/")({
  head: () => getPageHeader({ title: "Home" }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <DashboardLayout>
      <HomePageHeader activeTab="main" />
      <HomeBillboard />

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.9fr] pb-20">
        <TodoSection />
        <RecentApplicationsSection />
      </section>
    </DashboardLayout>
  );
}

function MetricRow({
  label,
  value,
  note,
  valueClassName,
}: {
  label: string;
  value: string;
  note?: string;
  valueClassName?: string;
}) {
  return (
    <div className="h-10 flex items-center justify-between gap-4 border-b border-dashed border-c-20 last:border-0 last:pb-0">
      <div className="flex items-start gap-3">
        <FancyAgentIcon />
        <span className="max-w-[330px] leading-7 text-[#242424]">{label}</span>
      </div>
      <div className="whitespace-nowrap text-right font-semibold text-c-80">
        <span className={cn(valueClassName)}>{value}</span>
        {note ? <span className="text-[#ff2d2d]"> {note}</span> : null}
      </div>
    </div>
  );
}

function PrimaryAction({
  children,
  onClick,
}: {
  children: string;
  onClick?: () => void;
}) {
  return (
    // <button className="h-11 rounded-12 bg-[#232323] px-5 text-[16px] font-semibold text-white transition hover:bg-[#111]">
    //   {children}
    // </button>
    <Button
      variant="black"
      size="lg"
      className="rounded-[12px] font-medium text-sm px-5"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function TodoItem({
  text,
  buttonLabel,
}: {
  text: string;
  buttonLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="size-6 shrink-0 rounded-full bg-c-10" />
        <p className="leading-6 text-c-80">{text}</p>
      </div>
      <Button
        variant="default"
        size="xl"
        className="w-full rounded-[12px] font-medium text-sm px-5"
      >
        {buttonLabel}
      </Button>
    </div>
  );
}

function ActionPill({
  children,
  variant,
}: {
  children: string;
  variant: "accept" | "reject";
}) {
  return (
    <Button
      className={cn(
        "h-9 rounded-[10px] px-5 text-[16px] font-semibold transition",
        variant === "accept"
          ? "bg-[#10dd84] text-c-80 hover:bg-[#08cf79]"
          : "bg-[#ececec] text-c-60 hover:bg-[#e6e6e6]",
      )}
    >
      {children}
    </Button>
  );
}

function HomeBillboard() {
  const { party } = useAppContext();
  const partyId = party?.id;
  const queryClient = useQueryClient();

  const [isWalletDialogOpen, setIsWalletDialogOpen] = React.useState(false);
  const [isSlotsDialogOpen, setIsSlotsDialogOpen] = React.useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = React.useState(false);

  const { data: walletRes, refetch: refetchWallet } = useQuery({
    queryKey: ["partyWallet", partyId],
    queryFn: () => getPartyWallet({ data: partyId! }),
    enabled: !!partyId,
  });

  const wallet = walletRes?.data?.wallet;

  const handleSlotsPurchased = () => {
    refetchWallet();
    if (partyId) {
      queryClient.invalidateQueries({ queryKey: ["party", partyId] });
    }
  };

  // Dynamic budget calculation:
  const allowances = party?.stateAllowances || {};
  const defaultKobo =
    allowances["default"] !== undefined ? allowances["default"] : 2000000;
  const defaultNaira = defaultKobo / 100;

  const stateValues = Object.entries(allowances)
    .filter(([key]) => key !== "default")
    .map(([_, val]) => val / 100);

  let displayBudget = "";
  if (stateValues.length === 0) {
    displayBudget = `₦${defaultNaira.toLocaleString("en-NG")} per agent`;
  } else {
    const hasOverrides = stateValues.some((val) => val !== defaultNaira);
    if (!hasOverrides) {
      displayBudget = `₦${defaultNaira.toLocaleString("en-NG")} per agent`;
    } else {
      const allValues = [defaultNaira, ...stateValues];
      const min = Math.min(...allValues);
      const max = Math.max(...allValues);
      if (min === max) {
        displayBudget = `₦${min.toLocaleString("en-NG")} per agent`;
      } else {
        displayBudget = `₦${min.toLocaleString("en-NG")} - ₦${max.toLocaleString("en-NG")} per agent`;
      }
    }
  }

  return (
    <section className="flex w-full gap-20 justify-between rounded-[20px] bg-hover-3 px-10 py-6">
      <div className="flex-2 flex flex-col gap-5">
        <h2 className="text-xl font-medium text-c-90">Readiness</h2>

        <div className="flex items-center gap-6">
          <div className="relative flex size-32 items-center justify-center rounded-full bg-[conic-gradient(#ffca2b_0_48deg,#ececec_48deg_360deg)]">
            <div className="size-[40px] rounded-full bg-hover-3" />
          </div>
          <div className="text-[100px] font-bold leading-none tracking-[-0.08em] text-c-80">
            13%
          </div>
        </div>
      </div>

      <div className="flex-3 flex flex-col gap-5">
        <h2 className="text-xl font-medium tracking-[-0.03em] text-[#202020]">
          Polling Agents
        </h2>

        <div className="text-[18px] text-[#222]">
          <MetricRow label="Polling units with an agent" value="12,004" />
          <MetricRow
            label="Polling units without an agent"
            value="99,634"
            valueClassName="text-[#ff2d2d]"
            note="(Very risky)"
          />
          <MetricRow
            label="Polling Agent Election Payment"
            value={displayBudget}
            valueClassName="font-semibold"
          />
        </div>

        <div className="mt-1 flex flex-wrap gap-3">
          <PrimaryAction onClick={() => setIsBudgetDialogOpen(true)}>
            Set Agent Payment Budget
          </PrimaryAction>
          <PrimaryAction onClick={() => setIsWalletDialogOpen(true)}>
            Fund Wallet
          </PrimaryAction>
          <PrimaryAction onClick={() => setIsSlotsDialogOpen(true)}>
            Buy Polling Agent Slots
          </PrimaryAction>
        </div>
      </div>

      <AccountDetailsDialog
        open={isWalletDialogOpen}
        setOpen={setIsWalletDialogOpen}
        onClose={() => setIsWalletDialogOpen(false)}
        wallet={wallet}
        onSuccess={refetchWallet}
      />

      <BuyAgentSlotsDialog
        open={isSlotsDialogOpen}
        onClose={() => setIsSlotsDialogOpen(false)}
        partyId={partyId}
        walletBalanceKobo={wallet?.balance_kobo ?? 0}
        onSuccess={handleSlotsPurchased}
      />

      <SetAgentPaymentDialog
        open={isBudgetDialogOpen}
        onClose={() => setIsBudgetDialogOpen(false)}
        onSuccess={() => {
          if (partyId) {
            queryClient.invalidateQueries({ queryKey: ["party", partyId] });
          }
        }}
      />
    </section>
  );
}

function TodoSection() {
  return (
    <div className="rounded-[24px] bg-[#fafafa] p-6">
      <div className="mb-5 flex items-center gap-3 text-[22px] font-medium tracking-[-0.03em] text-[#212121]">
        <span>Todo</span>
        <span className="font-semibold">12</span>
      </div>

      <div className="space-y-8">
        <TodoItem
          text="Candidates are yet to be provided by your party for 982 elections."
          buttonLabel="Field candidates"
        />
        <TodoItem
          text="To automatically accept agent applications - fund wallet."
          buttonLabel="Fund wallet"
        />
      </div>

      <Button variant="outline" size="xl" className="mt-8 w-full">
        See all
      </Button>
    </div>
  );
}

import { PartyApplicationDialog } from "#/components/dialogs/party-application-dialog";

function RecentApplicationsSection() {
  const [selectedApp, setSelectedApp] = React.useState<any>(null);
  const { partyShortName } = Route.useParams();

  return (
    <div className="rounded-[24px] bg-[#fafafa] p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="text-[22px] font-medium tracking-[-0.03em] text-[#212121]">
          Recent Applications
        </div>
        <div className="flex items-center gap-8 text-[16px] text-[#777]">
          <span>35,045 slots left</span>
          <Link
            to={APP_URL.partyRoutes.applications(partyShortName) as any}
            className="text-[#202020] transition hover:opacity-70"
          >
            See all
          </Link>
        </div>
      </div>

      <div>
        {RECENT_APPLICATIONS.map((item) => (
          <div
            key={item.name}
            onClick={() =>
              setSelectedApp({
                name: item.name,
                avatar: item.avatar,
                location: item.location.split(" . ")[0] || item.location,
                election:
                  item.location.split(" . ")[1] || "2027 presidential election",
                voterId: "904284758271",
              })
            }
            className="h-[72px] flex items-center justify-between gap-4 rounded-[18px] cursor-pointer hover:bg-c-5 transition px-3 -mx-3"
          >
            <div className="flex min-w-0 items-center gap-4">
              <Avatar className="size-12 shrink-0">
                <AvatarImage src={item.avatar} alt={item.name} />
              </Avatar>
              <div className="min-w-0 space-y-1">
                <p className="truncate text-[#202020]">{item.name}</p>
                <p className="truncate text-sm text-c-50">{item.location}</p>
              </div>
            </div>

            <div
              className="flex shrink-0 items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <ActionPill variant="accept">Accept</ActionPill>
              <ActionPill variant="reject">Reject</ActionPill>
            </div>
          </div>
        ))}
      </div>

      {selectedApp && (
        <PartyApplicationDialog
          open={!!selectedApp}
          onClose={() => setSelectedApp(null)}
          application={selectedApp}
        />
      )}
    </div>
  );
}
