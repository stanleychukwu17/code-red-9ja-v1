import { useState } from "react";
import { HeaderTabs } from "@repo/ui/components/custom/AdminLayouts";
import { cn } from "@repo/ui/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getApplications } from "#/lib/server/applications";
import { useUserParty } from "#/hooks/useUserParty";
import { getPartyWalletTransactions } from "#/lib/server/parties";
import { QUERY_KEYS } from "#/lib/config";
import { TransactionCard, type WalletTransaction } from "../../wallet/index";

type SubTabsSectionProps = {
  partyStats?: any;
  electionGroupId?: number;
  stateId?: number;
  lgaId?: number;
  wardId?: number;
};

/**
 * SubTabsSection Component
 *
 * Tabbed panel toggling between:
 * - "Main": Recent agent applications triage and acceptance rate statistics.
 * - "Transactions": Ledger history of deposits, slot purchases, and stipend disbursements.
 */
export function SubTabsSection({
  partyStats,
  electionGroupId,
  stateId,
  lgaId,
  wardId,
}: SubTabsSectionProps) {
  const [activeTab, setActiveTab] = useState<
    "main" | "activities" | "transactions"
  >("main");

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
              id: "transactions",
              label: "Transactions",
              onClick: () => setActiveTab("transactions"),
            },
          ]}
          activeTabClassName="bg-[#222] text-white shadow-sm"
          containerClassName="h-10"
        />
      </div>

      <div className="pt-2">
        {activeTab === "main" && (
          <MainSubTabContent
            partyStats={partyStats}
            electionGroupId={electionGroupId}
            stateId={stateId}
            lgaId={lgaId}
            wardId={wardId}
          />
        )}
        {activeTab === "transactions" && <TransactionsSubTabContent />}
      </div>
    </div>
  );
}

/**
 * RoleStatCard Component
 *
 * Micro-card displaying application triage metrics (total, accepted, or rejected).
 */
export function RoleStatCard({
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

/**
 * MainSubTabContent Component
 *
 * Displays top summary cards (total, accepted, rejected applications) and the most recent
 * agent applicant submissions filtered by the active geographic scope.
 */
export function MainSubTabContent({
  partyStats,
  electionGroupId,
  stateId,
  lgaId,
  wardId,
}: {
  partyStats?: any;
  electionGroupId?: number;
  stateId?: number;
  lgaId?: number;
  wardId?: number;
}) {
  const getApplicationsFn = useServerFn(getApplications);
  const { data: appsData, isLoading } = useQuery({
    queryKey: [
      "recent-party-applications",
      electionGroupId,
      stateId,
      lgaId,
      wardId,
    ],
    queryFn: () =>
      getApplicationsFn({
        data: {
          electionGroupId,
          stateId,
          lgaId,
          wardId,
          limit: 5,
        },
      }),
    enabled: !!electionGroupId,
  });

  const applications: any[] = appsData?.data?.applications || [];

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "polling_agent":
        return "Polling Agent";
      case "ward_supervisor":
        return "Ward Supervisor";
      case "lga_supervisor":
        return "LGA Supervisor";
      case "state_supervisor":
        return "State Supervisor";
      default:
        return role || "Agent";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "state_supervisor":
        return "text-[#00a859]";
      case "lga_supervisor":
        return "text-[#8b5cf6]";
      case "ward_supervisor":
        return "text-blue-600";
      default:
        return "text-c-50";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "accepted":
        return "text-green";
      case "rejected":
        return "text-red-500";
      default:
        return "text-amber-500";
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Top Row */}
        <RoleStatCard
          role="Total Applications"
          count={(partyStats?.applications_count || 0).toLocaleString()}
          className="bg-[#f7f7f7] border-0"
        />
        <RoleStatCard
          role="Accepted Agents"
          count={(
            partyStats?.accepted_applications_count || 0
          ).toLocaleString()}
          className="bg-green/10 border-0 [&_p]:text-green"
        />
        <RoleStatCard
          role="Rejected Agents"
          count={(
            partyStats?.rejected_applications_count || 0
          ).toLocaleString()}
          className="bg-red/10 border-0 [&_p]:text-red"
        />
      </div>
      <div>
        {isLoading ? (
          <div className="p-4 text-center text-c-50 text-sm">
            Loading recent applications...
          </div>
        ) : applications.length === 0 ? (
          <div className="p-4 text-center text-c-50 text-sm">
            No recent applications found.
          </div>
        ) : (
          applications.map((app: any) => {
            const name =
              `${app.first_name || ""} ${app.last_name || ""}`.trim() ||
              app.username ||
              "Applicant";
            const role = getRoleLabel(app.role);
            const roleColor = getRoleColor(app.role);
            const statusColor = getStatusColor(app.status);
            const time = formatTime(app.created_at);
            const location =
              app.polling_unit_name || app.lga_name || app.state_name || "";

            return (
              <div
                key={app.id}
                className="h-16 flex items-center px-0 md:px-3 hover:bg-c-5 rounded-2xl transition-colors gap-3 cursor-pointer"
              >
                <img
                  src={app.avatar || `https://i.pravatar.cc/150?u=${app.id}`}
                  alt=""
                  className="size-11 rounded-full object-cover shrink-0"
                />
                <div className="space-y-1 w-full">
                  <div className="flex items-center gap-5">
                    <p className="font-semibold text-c-90 w-full">{name}</p>
                    <span className={roleColor}>{role}</span>
                  </div>
                  <div className="flex items-center gap-5">
                    <p className="text-sm text-c-50 w-full line-clamp-1">
                      {location && <span>{location} ·</span>} {time}
                    </p>
                    <p className={cn("capitalize", statusColor)}>
                      {app.status}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * TransactionsSubTabContent Component
 *
 * Paginated ledger list showing the most recent wallet funding events and disbursements.
 */
export function TransactionsSubTabContent() {
  const { party } = useUserParty();
  const partyId = party?.id;
  const getPartyWalletTransactionsFn = useServerFn(getPartyWalletTransactions);

  const { data: txRes, isLoading } = useQuery({
    queryKey: QUERY_KEYS.partyWallet.transactions(partyId),
    queryFn: () =>
      getPartyWalletTransactionsFn({
        data: { partyID: partyId!, limit: 5, offset: 0 },
      }),
    enabled: !!partyId,
  });

  const transactions: WalletTransaction[] = txRes?.data?.transactions ?? [];

  return (
    <div>
      {isLoading ? (
        <div className="p-4 text-center text-c-50 text-sm">
          Loading transactions...
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-4 text-center text-c-50 text-sm">
          No transactions found.
        </div>
      ) : (
        transactions.map((tx) => (
          <TransactionCard key={tx.id} transaction={tx} />
        ))
      )}
    </div>
  );
}
