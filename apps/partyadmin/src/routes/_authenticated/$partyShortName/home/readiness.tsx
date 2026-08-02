import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { DashboardLayout } from "@repo/ui/components/custom/AdminLayouts";
import { HomePageHeader } from "./-header";
import { ElectionScopeSelector } from "./components/-election-scope-selector";
import { useAppContext } from "#/hooks/useAppContext";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getPartyWallet } from "#/lib/server/parties";
import { AccountDetailsDialog } from "#/components/dialogs/account-details-dialog";
import { BuyAgentSlotsDialog } from "#/components/dialogs/buy-agent-slots-dialog";
import { SetAgentPaymentDialog } from "@repo/ui/components/dialogs/set-agent-payment-dialog";
import { HeaderTabs } from "@repo/ui/components/custom/AdminLayouts";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { getStates } from "#/lib/server/countries";
import { updatePartyStateAllowances } from "#/lib/server/parties";
import { TargetFormDialog } from "@repo/ui/components/dialogs/TargetFormDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/$partyShortName/home/readiness")({
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
    ? statesRes.data.states.map((s: any) => s.name).sort((a: string, b: string) => a.localeCompare(b))
    : [
        "Abia", "Abuja FCT", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi",
        "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi",
        "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna",
        "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
        "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
        "Sokoto", "Taraba", "Yobe", "Zamfara",
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

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] items-start pt-4 pb-20">
        {/* Left Hand Column */}
        <div className="space-y-8">
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
          <FinancialOverallCard walletBalance={wallet?.balance_kobo || 0} slots={party?.slots || 0} />
          <TargetCard />
          <AgentStipendCard onEdit={() => setIsBudgetDialogOpen(true)} party={party} />
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
  return (
    <div className="bg-[#111] text-white rounded-[24px] p-8 space-y-6 shadow-xl">
      <div className="flex flex-col gap-6">
        <RoleProgressRow role="Polling Agent" count="22,982" max="174,402" percent={32} />
        <RoleProgressRow role="Ward Election Supervisor" count="3,982" max="8,273" percent={32} />
        <RoleProgressRow role="LGA Election Supervisor" count="241" max="774" percent={32} />
        <RoleProgressRow role="State Election Supervisor" count="37" max="37" percent={100} isComplete />
      </div>
    </div>
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
          className={cn("size-5 rounded-full flex items-center justify-center shrink-0", isComplete ? "bg-[#06c270]" : "bg-white/20")}
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
          {percent}% <span className="text-white/40 font-normal">test ready</span>
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
          icon="/icons/buy-slots.png" // Placeholder
          bgClass="bg-[#fff3e0]"
          buttonClass="bg-[#242424] text-white hover:bg-[#111]"
          onClick={onBuySlots}
        />
        <ActionBanner
          title="Deposit Agent Stipend"
          description="Deposit party agent election day stipend."
          buttonLabel="Deposit Agent Stipend"
          icon="/icons/deposit-stipend.png" // Placeholder
          bgClass="bg-[#e2e0ff]"
          buttonClass="bg-[#242424] text-white hover:bg-[#111]"
          onClick={onDepositStipend}
        />
        <ActionBanner
          title="Deposit Marketing Funds"
          description="Acquire agents for the upcoming election by depositing funds for Free9ja marketing."
          buttonLabel="Deposit Marketing Funds"
          icon="/icons/deposit-marketing.png" // Placeholder
          bgClass="bg-[#d2edff]"
          buttonClass="bg-[#242424] text-white hover:bg-[#111]"
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
  icon,
  bgClass,
  buttonClass,
  onClick,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  icon?: string;
  bgClass: string;
  buttonClass: string;
  onClick?: () => void;
}) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-[20px] gap-4", bgClass)}>
      <div className="flex items-start gap-4">
        <div className="size-10 rounded-full bg-black/10 shrink-0 mt-0.5 overflow-hidden flex items-center justify-center text-lg">
          🧑🏾
        </div>
        <div>
          <h3 className="font-semibold text-[17px] text-c-90">{title}</h3>
          <p className="text-c-70 text-[14px] mt-0.5">{description}</p>
        </div>
      </div>
      <button 
        onClick={onClick}
        className={cn("px-6 py-2.5 rounded-[12px] font-semibold text-[14px] transition-colors shrink-0 whitespace-nowrap", buttonClass)}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function SubTabsSection() {
  const [activeTab, setActiveTab] = React.useState<"main" | "activities" | "transactions">("main");

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

        <select className="bg-white border border-border rounded-[12px] px-4 py-2 text-[15px] font-medium outline-none h-[42px] cursor-pointer hover:bg-c-5">
          <option>Today</option>
          <option>This Week</option>
          <option>This Month</option>
        </select>
      </div>

      <div className="pt-2">
        {activeTab === "main" && <MainSubTabContent />}
        {activeTab === "activities" && <ActivitiesSubTabContent />}
        {activeTab === "transactions" && <TransactionsSubTabContent />}
      </div>
    </div>
  );
}

function SubTab({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("px-5 py-2 rounded-[10px] text-[15px] font-medium transition-all", isActive ? "bg-[#333] text-white shadow-sm" : "text-c-60 hover:text-c-90")}
    >
      {label}
    </button>
  );
}

function MainSubTabContent() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {/* Top Row */}
      <div className="col-span-1 bg-[#f7f7f7] rounded-[20px] p-5 space-y-2">
        <p className="font-semibold text-[15px] text-c-80">Total Applications</p>
        <p className="text-[32px] font-medium text-c-90 tracking-[-0.03em]">34,890</p>
      </div>
      <div className="col-span-1 bg-[#f2fcf6] rounded-[20px] p-5 space-y-2 border border-[#e6f7ee]">
        <p className="font-semibold text-[15px] text-[#00a859]">Accepted Agents</p>
        <p className="text-[32px] font-medium text-[#00a859] tracking-[-0.03em]">31,420</p>
      </div>
      <div className="col-span-1 md:col-span-1 col-span-2 bg-[#fff5f5] rounded-[20px] p-5 space-y-2 border border-[#ffebeb]">
        <p className="font-semibold text-[15px] text-[#ff2d2d]">Rejected Agents</p>
        <p className="text-[32px] font-medium text-[#ff2d2d] tracking-[-0.03em]">0</p>
      </div>

      {/* Bottom Row */}
      <RoleStatCard role="Polling Agents" count="31,420" />
      <RoleStatCard role="Ward Supervisors" count="581" />
      <RoleStatCard role="LGA Supervisors" count="121" />
      <RoleStatCard role="State Supervisors" count="5" />
    </div>
  );
}

function RoleStatCard({ role, count }: { role: string; count: string }) {
  return (
    <div className="col-span-1 border border-border rounded-[20px] p-5 space-y-2">
      <p className="font-semibold text-[15px] text-c-80">{role}</p>
      <p className="text-[28px] font-medium text-c-90 tracking-[-0.03em]">{count}</p>
    </div>
  );
}

function ActivitiesSubTabContent() {
  const activities = [
    { name: "Kamsi Uzorchukwu", role: "Polling Agent", time: "2m ago", amount: "-₦50,000", status: "Accepted", avatar: "https://i.pravatar.cc/150?u=1", roleColor: "text-c-50" },
    { name: "Maxwel Nnodi", role: "Polling Agent", time: "4m ago", amount: "-₦50,000", status: "Accepted", avatar: "https://i.pravatar.cc/150?u=2", roleColor: "text-c-50" },
    { name: "Favour Udezue", role: "Ward Supervisor", time: "3h ago", amount: "-₦70,000", status: "Accepted", avatar: "https://i.pravatar.cc/150?u=3", roleColor: "text-[#8b5cf6]" },
    { name: "Tobi Obafemi", role: "State Supervisor", time: "May 29, 14:56", amount: "-₦500,000", status: "Accepted", avatar: "https://i.pravatar.cc/150?u=4", roleColor: "text-[#00a859]" },
  ];

  return (
    <div className="space-y-1">
      {activities.map((a, i) => (
        <div key={i} className="flex items-center justify-between p-3 hover:bg-c-5 rounded-2xl transition-colors">
          <div className="flex items-center gap-4">
            <img src={a.avatar} alt="" className="size-12 rounded-full object-cover shrink-0" />
            <div>
              <p className="font-semibold text-[16px] text-c-90">{a.name}</p>
              <p className="text-[14px] text-c-50 mt-0.5">
                <span className={a.roleColor}>{a.role}</span> . {a.time}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-[16px] text-c-90">{a.amount}</p>
            <p className="text-[14px] font-medium text-[#00a859] mt-0.5">{a.status}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TransactionsSubTabContent() {
  const transactions = [
    { type: "Agent Stipend: Deposited", time: "2m ago", amount: "-₦50,000,000", status: "Successful", isPositive: false },
    { type: "Slots: Purchased", time: "2m ago", amount: "-₦8,000,000", status: "Successful", isPositive: false },
    { type: "Marketing Funds: Deposited", time: "2m ago", amount: "-₦8,000,000", status: "Successful", isPositive: false },
    { type: "Wallet Balance: Funded", time: "2m ago", amount: "+₦50,000,000", status: "Successful", isPositive: true },
  ];

  return (
    <div className="space-y-1">
      {transactions.map((t, i) => (
        <div key={i} className="flex items-center justify-between p-3 hover:bg-c-5 rounded-2xl transition-colors">
          <div className="flex items-center gap-4">
            <div className={cn("size-12 rounded-full flex items-center justify-center shrink-0", t.isPositive ? "bg-[#e2fcf1] text-[#00a859]" : "bg-[#f2f2f2] text-c-80")}>
              {t.isPositive ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              )}
            </div>
            <div>
              <p className="font-semibold text-[16px] text-c-90">{t.type}</p>
              <p className="text-[14px] text-c-50 mt-0.5">{t.time}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={cn("font-semibold text-[16px]", t.isPositive ? "text-[#00a859]" : "text-c-90")}>{t.amount}</p>
            <p className="text-[14px] font-medium text-[#00a859] mt-0.5">{t.status}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FinancialOverallCard({ walletBalance, slots }: { walletBalance: number; slots: number }) {
  const balanceNGN = (walletBalance / 100).toLocaleString("en-NG", { maximumFractionDigits: 1 });
  
  return (
    <div className="bg-[#fcfcff] rounded-[24px] p-6 space-y-6">
      <h3 className="text-[17px] font-semibold text-c-80">Financial Overall</h3>
      <div className="space-y-5">
        <FinancialRow label="Party Wallet Balance" value={`₦${balanceNGN}`} />
        <div className="h-px bg-border w-full" />
        <FinancialRow label="Slots" value={slots.toLocaleString()} />
        <div className="h-px bg-border w-full" />
        <FinancialRow label="Agent Stipend" value="₦176M" />
        <div className="h-px bg-border w-full" />
        <FinancialRow label="Marketing Funds" value="₦200M" />
      </div>
    </div>
  );
}

function FinancialRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-medium text-c-70 text-[15px]">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-bold text-[16px] text-c-90">{value}</span>
        <button className="size-[30px] bg-[#333] hover:bg-[#111] transition-colors rounded-full flex items-center justify-center text-white shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
        </button>
      </div>
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
    <div className="bg-[#fcfcff] rounded-[24px] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[17px] font-semibold text-c-80">Target</h3>
        <button className="px-4 py-1.5 bg-white border border-border rounded-xl text-[14px] font-semibold hover:bg-c-5 transition-colors text-c-90">
          Edit
        </button>
      </div>
      <div className="space-y-6">
        {targets.map((t, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-7 rounded-full bg-black/10 shrink-0 overflow-hidden flex items-center justify-center text-sm">
                🧑🏾
              </div>
              <span className="font-medium text-c-70 text-[15px]">{t.role}</span>
            </div>
            <span className="font-bold text-[16px] text-c-90">{t.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentStipendCard({ onEdit, party }: { onEdit: () => void; party: any }) {
  const defaultStipend = (party?.agentPaymentAllocation?.default || 5000000) / 100;
  
  const stipends = [
    { role: "Polling Agent", amount: `₦${defaultStipend.toLocaleString()}` },
    { role: "Ward Supervisor", amount: "₦70,000" },
    { role: "LGA Supervisor", amount: "₦100,000" },
    { role: "State Supervisor", amount: "₦500,000" },
  ];

  return (
    <div className="bg-[#fcfcff] rounded-[24px] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[17px] font-semibold text-c-80">Agent Stipend</h3>
        <button 
          onClick={onEdit}
          className="px-4 py-1.5 bg-white border border-border rounded-xl text-[14px] font-semibold hover:bg-c-5 transition-colors text-c-90"
        >
          Edit
        </button>
      </div>
      <div className="space-y-6">
        {stipends.map((s, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-7 rounded-full bg-black/10 shrink-0 overflow-hidden flex items-center justify-center text-sm">
                🧑🏾
              </div>
              <span className="font-medium text-c-70 text-[15px]">{s.role}</span>
            </div>
            <span className="font-bold text-[16px] text-c-90">{s.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
