import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@repo/ui/components/custom/AdminLayouts";
import { getPageHeader } from "#/lib/shared/meta";
import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getElectionPayList,
  payElectionAgent,
  payAllAgentPayments,
  type ElectionPayItem,
} from "#/lib/server/agent-payments";
import {
  AgentPaymentsHeader,
  ElectionGroupSelect,
  PayAllModal,
} from "./-components";
import { ElectionPayTable } from "#/components/Tables";
import { Coins, Search, X, Users, AlertCircle } from "lucide-react";
import { useDebounceValue } from "usehooks-ts";
import { toast } from "sonner";

export const Route = createFileRoute(
  "/_authenticated/agent-payments/election-pay",
)({
  head: () => getPageHeader({ title: "Agent Payments - Election Pay" }),
  component: ElectionPayPage,
});

type SubTab = "unpaid" | "paid" | "ineligible";

function ElectionPayPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SubTab>("unpaid");
  const [selectedElectionGroupId, setSelectedElectionGroupId] = useState<
    number | undefined
  >(undefined);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch] = useDebounceValue(searchInput, 300);

  const [payingId, setPayingId] = useState<number | null>(null);
  const [isPayAllOpen, setIsPayAllOpen] = useState(false);
  const [isPayingAll, setIsPayingAll] = useState(false);

  const fetchElectionPay = useServerFn(getElectionPayList);
  const executePaySingle = useServerFn(payElectionAgent);
  const executePayAll = useServerFn(payAllAgentPayments);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "election-pay-list",
      selectedElectionGroupId,
      activeTab,
      debouncedSearch,
    ],
    queryFn: async () => {
      const res = await fetchElectionPay({
        data: {
          electionGroupId: selectedElectionGroupId,
          status: activeTab,
          search: debouncedSearch || undefined,
          limit: 100,
        },
      });
      return (res as any)?.data?.items || [];
    },
  });

  const items: ElectionPayItem[] = Array.isArray(data) ? data : [];

  const handlePaySingle = async (item: ElectionPayItem) => {
    try {
      setPayingId(item.id);
      const res = (await executePaySingle({ data: item.id })) as any;
      if (res?.success) {
        toast.success(`Payment of ${item.earned_amount} recorded for ${item.user_name}`);
        queryClient.invalidateQueries({ queryKey: ["election-pay-list"] });
        queryClient.invalidateQueries({ queryKey: ["agent-payments-overview"] });
      } else {
        toast.error(res?.message || "Failed to record payment");
      }
    } catch (e: any) {
      toast.error(e?.message || "Payment request failed");
    } finally {
      setPayingId(null);
    }
  };

  const handlePayAllConfirm = async () => {
    try {
      setIsPayingAll(true);
      const res = (await executePayAll({
        data: {
          type: "election",
          election_group_id: selectedElectionGroupId,
        },
      })) as any;
      if (res?.success) {
        toast.success(res?.message || `Successfully processed payments for all ${items.length} agents`);
        setIsPayAllOpen(false);
        queryClient.invalidateQueries({ queryKey: ["election-pay-list"] });
        queryClient.invalidateQueries({ queryKey: ["agent-payments-overview"] });
      } else {
        toast.error(res?.message || "Failed to execute batch payout");
      }
    } catch (e: any) {
      toast.error(e?.message || "Batch payment failed");
    } finally {
      setIsPayingAll(false);
    }
  };

  const tabs: { key: SubTab; label: string }[] = [
    { key: "unpaid", label: "Unpaid" },
    { key: "paid", label: "Paid" },
    { key: "ineligible", label: "Ineligible" },
  ];

  return (
    <Layout>
      <AgentPaymentsHeader />

      {/* Sub-controls Layer */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 py-4 border-b border-neutral-100 dark:border-neutral-800/80">
        {/* Left: Sub-Tabs */}
        <div className="flex items-center gap-1 bg-neutral-100/80 dark:bg-neutral-800/60 p-1 rounded-xl w-fit">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs font-semibold"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right: Search, Election Group, and Pay All */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search bar */}
          <div className="relative min-w-[220px] sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search agent..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400 text-neutral-900 dark:text-white placeholder:text-neutral-400"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Election Group Dropdown */}
          <ElectionGroupSelect
            selectedId={selectedElectionGroupId}
            onChange={(id) => setSelectedElectionGroupId(id)}
          />

          {/* Pay All Button (visible when not in Paid tab and items exist) */}
          {activeTab !== "paid" && (
            <button
              type="button"
              disabled={items.length === 0}
              onClick={() => setIsPayAllOpen(true)}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs shrink-0"
            >
              <Coins className="size-4 text-emerald-400 dark:text-emerald-600" />
              <span>Pay all</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      <div className="py-2">
        {isLoading ? (
          <div className="py-20 text-center text-c-50 text-[15px]">
            Loading election pay records...
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="size-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
              {activeTab === "ineligible" ? (
                <AlertCircle className="size-6" />
              ) : (
                <Users className="size-6" />
              )}
            </div>
            <p className="text-base font-semibold text-neutral-900 dark:text-white">
              No {activeTab} election agents
            </p>
            <p className="text-sm text-neutral-500 max-w-sm mx-auto">
              {searchInput
                ? `No agents matching "${searchInput}" found in this group.`
                : activeTab === "unpaid"
                  ? "All eligible election agents for this group have been paid."
                  : activeTab === "paid"
                    ? "No agents have received election pay for this group yet."
                    : "There are currently no ineligible election agents."}
            </p>
          </div>
        ) : (
          <ElectionPayTable
            items={items}
            status={activeTab}
            onPay={handlePaySingle}
            payingId={payingId}
          />
        )}
      </div>

      {/* Pay All Modal */}
      <PayAllModal
        isOpen={isPayAllOpen}
        onClose={() => setIsPayAllOpen(false)}
        onConfirm={handlePayAllConfirm}
        isPaying={isPayingAll}
        title="Pay All Election Agents"
        description={`Are you sure you want to mark all ${items.length} eligible election agents as paid for this election group?`}
      />
    </Layout>
  );
}
