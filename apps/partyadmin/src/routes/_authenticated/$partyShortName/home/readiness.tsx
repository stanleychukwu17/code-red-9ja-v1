import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import {
  DashboardLayout,
  HeaderTabs,
  ReadinessStatSection,
} from "@repo/ui/components/custom/AdminLayouts";
import { HomePageHeader } from "./-header";
import { ElectionScopeSelector } from "./components/-election-scope-selector";
import { useAppContext } from "#/hooks/useAppContext";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getPartyWallet } from "#/lib/server/parties";
import { AccountDetailsDialog } from "#/components/dialogs/account-details-dialog";
import { BuyAgentSlotsDialog } from "#/components/dialogs/buy-agent-slots-dialog";
import { SetAgentPaymentDialog } from "@repo/ui/components/dialogs/set-agent-payment-dialog";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { getStates } from "#/lib/server/countries";
import { updatePartyStateAllowances } from "#/lib/server/parties";
import { TargetFormDialog } from "@repo/ui/components/dialogs/TargetFormDialog";
import {
  LeaderboardCardWrapper,
  ObjectiveTile,
} from "@repo/ui/components/cards/leaderboard-card";
import { toast } from "sonner";
import FancyAgentIcon from "@repo/ui/icons/fancy-agent-icon";
import { SelectDateRange } from "@repo/ui/components/selects/date-range-select";
import ArrowHandleIcon from "@repo/ui/icons/arrow-handle-icon";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/home/readiness",
)({
  head: () => getPageHeader({ title: "Readiness Dashboard" }),
  component: ReadinessComponent,
});

function ReadinessComponent() {
  const { party } = useAppContext();
  const partyId = party?.id;
  const queryClient = useQueryClient();

  const [isWalletDialogOpen, setIsWalletDialogOpen] = React.useState(false);
  const [isSlotsDialogOpen, setIsSlotsDialogOpen] = React.useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = React.useState(false);
  const [isTargetDialogOpen, setIsTargetDialogOpen] = React.useState(false);

  const { data: walletRes, refetch: refetchWallet } = useQuery({
    queryKey: ["partyWallet", partyId],
    queryFn: () => getPartyWallet({ data: partyId! }),
    enabled: !!partyId,
  });

  const wallet = walletRes?.data?.wallet;

  const { data: statesRes } = useQuery({
    queryKey: ["nigerianStates"],
    queryFn: () => getStates({ data: { countryId: 161, limit: 50 } }),
    enabled: isBudgetDialogOpen,
  });

  const statesList = statesRes?.data?.states?.length
    ? statesRes.data.states
        .map((s: any) => s.name)
        .sort((a: string, b: string) => a.localeCompare(b))
    : [
        "Abia",
        "Abuja FCT",
        "Adamawa",
        "Akwa Ibom",
        "Anambra",
        "Bauchi",
        "Bayelsa",
        "Benue",
        "Borno",
        "Cross River",
        "Delta",
        "Ebonyi",
        "Edo",
        "Ekiti",
        "Enugu",
        "Gombe",
        "Imo",
        "Jigawa",
        "Kaduna",
        "Kano",
        "Katsina",
        "Kebbi",
        "Kogi",
        "Kwara",
        "Lagos",
        "Nasarawa",
        "Niger",
        "Ogun",
        "Ondo",
        "Osun",
        "Oyo",
        "Plateau",
        "Rivers",
        "Sokoto",
        "Taraba",
        "Yobe",
        "Zamfara",
      ];

  const paymentMutation = useMutation({
    mutationFn: async (allowances: Record<string, Record<string, number>>) => {
      const res = await updatePartyStateAllowances({
        data: { partyID: partyId!, allowances },
      });
      if (!res.success) {
        throw new Error(res.message || "Failed to update allowances");
      }
      return res.data;
    },
    onSuccess: () => {
      if (partyId) {
        queryClient.invalidateQueries({ queryKey: ["party", partyId] });
      }
      toast.success("Agent payment budget saved successfully!");
      setIsBudgetDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "An unexpected error occurred");
    },
  });

  const handleSlotsPurchased = () => {
    refetchWallet();
    if (partyId) {
      queryClient.invalidateQueries({ queryKey: ["party", partyId] });
    }
  };

  return (
    <DashboardLayout>
      <HomePageHeader activeTab="readiness" />
      <ElectionScopeSelector />

      <div className="grid gap-6 lg:grid-cols-[2fr_1.2fr] items-start pb-20">
        {/* Left Hand Column */}
        <div className="space-y-6">
          <ReadinessProgressCard />
          <RequiredActionsSection
            onBuySlots={() => setIsSlotsDialogOpen(true)}
            onDepositStipend={() => setIsBudgetDialogOpen(true)}
            onDepositMarketing={() => setIsWalletDialogOpen(true)}
          />
          <SubTabsSection />
        </div>

        {/* Right Hand Column */}
        <div className="space-y-6">
          <FinancialOverallCard
            walletBalance={wallet?.balance_kobo || 0}
            slots={party?.slots || 0}
          />
          <TargetCard />
          <AgentStipendCard
            onEdit={() => setIsBudgetDialogOpen(true)}
            party={party}
          />
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
        defaultValues={party?.agentPaymentAllocation as any}
        onSubmit={(values) => paymentMutation.mutate(values as any)}
        isPending={paymentMutation.isPending}
        statesList={[]}
      />

      <TargetFormDialog
        open={isTargetDialogOpen}
        onClose={() => setIsTargetDialogOpen(false)}
        onSubmit={(values) => {
          // TODO: hook up to mutation when endpoint is ready
          console.log("Targets submitted", values);
          setIsTargetDialogOpen(false);
        }}
      />
    </DashboardLayout>
  );
}

function ReadinessProgressCard() {
  const ReadinessText = ({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) => {
    return (
      <p className="text-white font-medium">
        {label}
        <span className="text-white/50"> {value}</span>
      </p>
    );
  };

  return (
    <LeaderboardCardWrapper>
      <ObjectiveTile
        isCompleted={false}
        title="Polling Agent"
        rightText={<ReadinessText label="22,982" value="/ 174,402" />}
        rightText2={<ReadinessText label="32%" value="ready" />}
      />
      <ObjectiveTile
        isCompleted={false}
        title="Ward Election Supervisor"
        rightText={<ReadinessText label="3,984" value="/ 8,713" />}
        rightText2={<ReadinessText label="46%" value="ready" />}
      />
      <ObjectiveTile
        isCompleted={false}
        title="LGA Election Supervisor"
        rightText={<ReadinessText label="241" value="/ 774" />}
        rightText2={<ReadinessText label="31%" value="ready" />}
      />
      <ObjectiveTile
        isCompleted={true}
        title="State Election Supervisor"
        rightText={<ReadinessText label="37" value="/ 37" />}
        rightText2={<ReadinessText label="100%" value="ready" />}
      />
    </LeaderboardCardWrapper>
  );
}

function RoleProgressRow({
  role,
  count,
  max,
  percent,
  isComplete,
}: {
  role: string;
  count: string;
  max: string;
  percent: number;
  isComplete?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4 flex-1">
        <div
          className={cn(
            "size-5 rounded-full flex items-center justify-center shrink-0",
            isComplete ? "bg-[#06c270]" : "bg-white/20",
          )}
        >
          {isComplete && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 3L4.5 8.5L2 6"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <span className="text-white/90 font-medium text-[15px]">{role}</span>
      </div>

      <div className="flex items-center gap-8 justify-between sm:justify-end text-[14px]">
        <div>
          <span className="font-semibold">{count}</span>
          <span className="text-white/40"> / {max}</span>
        </div>
        <div className="w-[110px] text-right font-medium">
          {percent}%{" "}
          <span className="text-white/40 font-normal">test ready</span>
        </div>
      </div>
    </div>
  );
}

function RequiredActionsSection({
  onBuySlots,
  onDepositStipend,
  onDepositMarketing,
}: {
  onBuySlots: () => void;
  onDepositStipend: () => void;
  onDepositMarketing: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-c-90">Required Actions</h2>
      <div className="space-y-4">
        <ActionBanner
          title="Buy Slots for Election Agents"
          description="Slots allow you accept agent requests for upcoming elections."
          buttonLabel="Buy Slots"
          bgClass="bg-[#FFDAAA]/50"
          onClick={onBuySlots}
        />
        <ActionBanner
          title="Deposit Agent Stipend"
          description="Deposit party agent election day stipend."
          buttonLabel="Deposit Agent Stipend"
          bgClass="bg-purple/20"
          onClick={onDepositStipend}
        />
        <ActionBanner
          title="Deposit Marketing Funds"
          description="Acquire agents for the upcoming election by depositing funds for Free9ja marketing."
          buttonLabel="Deposit Marketing Funds"
          bgClass="bg-[#0984E3]/20"
          onClick={onDepositMarketing}
        />
      </div>
    </div>
  );
}

function ActionBanner({
  title,
  description,
  buttonLabel,
  bgClass,
  onClick,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  bgClass: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-start justify-between p-5 rounded-[20px] gap-4",
        bgClass,
      )}
    >
      <FancyAgentIcon className="size-6" />
      <div className="space-y-1 w-full">
        <h3 className="font-semibold text-lg text-c-90">{title}</h3>
        <p className="text-c-70 text-sm">{description}</p>
      </div>
      <Button onClick={onClick} variant="black" size="sm" className="px-6">
        {buttonLabel}
      </Button>
    </div>
  );
}

function SubTabsSection() {
  const [activeTab, setActiveTab] = React.useState<
    "main" | "activities" | "transactions"
  >("main");
  const [dateRange, setDateRange] = React.useState<string>("today");

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <HeaderTabs
          activeTab={activeTab}
          tabs={[
            {
              id: "main",
              label: "Main",
              onClick: () => setActiveTab("main"),
            },
            {
              id: "activities",
              label: "Activities",
              onClick: () => setActiveTab("activities"),
            },
            {
              id: "transactions",
              label: "Transactions",
              onClick: () => setActiveTab("transactions"),
            },
          ]}
          activeTabClassName="bg-[#222] text-white shadow-sm"
          containerClassName="h-10"
        />

        <SelectDateRange
          selectedId={dateRange}
          update={(val) => setDateRange(val)}
          className="h-[42px] rounded-xl max-w-[180px]"
        />
      </div>

      <div className="pt-2">
        {activeTab === "main" && <MainSubTabContent />}
        {activeTab === "activities" && <ActivitiesSubTabContent />}
        {activeTab === "transactions" && <TransactionsSubTabContent />}
      </div>
    </div>
  );
}

function SubTab({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-5 py-2 rounded-[10px] text-[15px] font-medium transition-all",
        isActive
          ? "bg-[#333] text-white shadow-sm"
          : "text-c-60 hover:text-c-90",
      )}
    >
      {label}
    </button>
  );
}

function MainSubTabContent() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {/* Top Row */}
      <RoleStatCard
        role="Total Applications"
        count="34,890"
        className="bg-[#f7f7f7] border-0"
      />
      <RoleStatCard
        role="Accepted Agents"
        count="31,420"
        className="bg-green/10 border-0 [&_p]:text-green"
      />
      <RoleStatCard
        role="Rejected Agents"
        count="0"
        className="bg-red/10 border-0 [&_p]:text-red"
      />

      {/* Bottom Row */}
      <RoleStatCard role="Polling Agents" count="31,420" />
      <RoleStatCard role="Ward Supervisors" count="581" />
      <RoleStatCard role="LGA Supervisors" count="121" />
      <RoleStatCard role="State Supervisors" count="5" />
    </div>
  );
}

function RoleStatCard({
  role,
  count,
  className,
}: {
  role: string;
  count: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "col-span-1 border border-border rounded-[20px] p-5 space-y-2",
        className,
      )}
    >
      <p className="font-semibold text-[15px] text-c-80">{role}</p>
      <p className="text-[28px] font-medium text-c-90 tracking-[-0.03em]">
        {count}
      </p>
    </div>
  );
}

function ActivitiesSubTabContent() {
  const activities = [
    {
      name: "Kamsi Uzorchukwu",
      role: "Polling Agent",
      time: "2m ago",
      amount: "-₦50,000",
      status: "Accepted",
      avatar: "https://i.pravatar.cc/150?u=1",
      roleColor: "text-c-50",
    },
    {
      name: "Maxwel Nnodi",
      role: "Polling Agent",
      time: "4m ago",
      amount: "-₦50,000",
      status: "Accepted",
      avatar: "https://i.pravatar.cc/150?u=2",
      roleColor: "text-c-50",
    },
    {
      name: "Favour Udezue",
      role: "Ward Supervisor",
      time: "3h ago",
      amount: "-₦70,000",
      status: "Accepted",
      avatar: "https://i.pravatar.cc/150?u=3",
      roleColor: "text-[#8b5cf6]",
    },
    {
      name: "Tobi Obafemi",
      role: "State Supervisor",
      time: "May 29, 14:56",
      amount: "-₦500,000",
      status: "Accepted",
      avatar: "https://i.pravatar.cc/150?u=4",
      roleColor: "text-[#00a859]",
    },
  ];

  return (
    <div>
      {activities.map((a, i) => (
        <div
          key={i}
          className="h-16 flex items-center px-3 hover:bg-c-5 rounded-2xl transition-colors gap-3 cursor-pointer"
        >
          <img
            src={a.avatar}
            alt=""
            className="size-11 rounded-full object-cover shrink-0"
          />
          <div className="space-y-1 w-full">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-c-90 w-full">{a.name}</p>
              <p className="shrink-0 font-medium text-c-90">{a.amount}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-c-50 w-full">
                <span className={a.roleColor}>{a.role}</span> · {a.time}
              </p>
              <p className="text-green">{a.status}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TransactionsSubTabContent() {
  const transactions = [
    {
      type: "Agent Stipend: Deposited",
      time: "2m ago",
      amount: "-₦50,000,000",
      status: "Successful",
      isDeposit: false,
    },
    {
      type: "Slots: Purchased",
      time: "2m ago",
      amount: "-₦8,000,000",
      status: "Successful",
      isDeposit: false,
    },
    {
      type: "Marketing Funds: Deposited",
      time: "2m ago",
      amount: "-₦8,000,000",
      status: "Successful",
      isDeposit: false,
    },
    {
      type: "Wallet Balance: Funded",
      time: "2m ago",
      amount: "+₦50,000,000",
      status: "Successful",
      isDeposit: true,
    },
  ];

  return (
    <div>
      {transactions.map((t, i) => (
        <div
          key={i}
          className="h-16 flex items-center px-3 hover:bg-c-5 rounded-2xl transition-colors gap-3"
        >
          <div
            className={cn(
              "size-11 rounded-full flex items-center justify-center shrink-0",
              t.isDeposit ? "bg-green/20 text-green" : "bg-c-10 text-c-80",
            )}
          >
            {t.isDeposit ? (
              <ArrowHandleIcon className="size-4 rotate-90" />
            ) : (
              <ArrowHandleIcon className="size-4 -rotate-90" />
            )}
          </div>
          <div className="space-y-1 w-full">
            <div className="flex items-center gap-2 w-full">
              <p className="font-medium w-full text-c-90">{t.type}</p>
              <p
                className={cn(
                  "shrink-0 font-semibold",
                  t.isDeposit ? "text-green" : "text-c-90",
                )}
              >
                {t.amount}
              </p>
            </div>
            <div className="flex items-center gap-2 w-full">
              <p className="text-sm text-c-50 w-full">{t.time}</p>
              <p className="shrink-0 text-green">{t.status}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FinancialOverallCard({
  walletBalance,
  slots,
}: {
  walletBalance: number;
  slots: number;
}) {
  const balanceNGN = (walletBalance / 100).toLocaleString("en-NG", {
    maximumFractionDigits: 1,
  });

  return (
    <ReadinessStatSection title="Financial Overall">
      <FinancialRow label="Party Wallet Balance" value={`₦${balanceNGN}`} />
      <div className="px-3 py-2">
        <div className="h-px bg-border w-full" />
      </div>
      <FinancialRow label="Slots" value={slots.toLocaleString()} />
      <FinancialRow label="Agent Stipend" value="₦176M" />
      <FinancialRow label="Marketing Funds" value="₦200M" />
    </ReadinessStatSection>
  );
}

function FinancialRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="h-11 px-3 flex items-center gap-5">
      <p className="text-c-70 w-full">{label}</p>
      <span className="font-semibold text-[16px] text-c-80">{value}</span>
      <Button variant="black" className="h-8 px-3 rounded-[10px]">
        <ArrowHandleIcon className="-rotate-90 size-4" strokeWidth={2} />
      </Button>
    </div>
  );
}

function TargetCard() {
  const targets = [
    { role: "Polling Agent per unit", count: "2" },
    { role: "Ward Supervisor per ward", count: "2" },
    { role: "LGA Supervisor per lga", count: "2" },
    { role: "State Supervisor per state", count: "1" },
  ];

  return (
    <ReadinessStatSection
      title="Target"
      headerAction={
        <Button
          variant="outline"
          size="xs"
          className="hover:bg-background hover:text-green"
        >
          Edit
        </Button>
      }
    >
      {targets.map((t, i) => (
        <SimpleStatTile key={i} label={t.role} value={t.count} />
      ))}
    </ReadinessStatSection>
  );
}

function SimpleStatTile({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="h-11 px-3 flex items-center gap-3">
      {icon ?? <FancyAgentIcon className="shrink-0 size-5" />}
      <p className="text-c-70 w-full">{label}</p>
      <span className="font-semibold text-[16px] text-c-90">{value}</span>
    </div>
  );
}

function AgentStipendCard({
  onEdit,
  party,
}: {
  onEdit: () => void;
  party: any;
}) {
  const defaultStipend =
    (party?.agentPaymentAllocation?.default || 5000000) / 100;

  const stipends = [
    { role: "Polling Agent", amount: `₦${defaultStipend.toLocaleString()}` },
    { role: "Ward Supervisor", amount: "₦70,000" },
    { role: "LGA Supervisor", amount: "₦100,000" },
    { role: "State Supervisor", amount: "₦500,000" },
  ];

  return (
    <ReadinessStatSection
      title="Agent Stipend"
      headerAction={
        <Button
          variant="outline"
          size="xs"
          className="hover:bg-background hover:text-green"
        >
          Edit
        </Button>
      }
    >
      {stipends.map((s, i) => (
        <SimpleStatTile key={i} label={s.role} value={s.amount} />
      ))}
    </ReadinessStatSection>
  );
}
