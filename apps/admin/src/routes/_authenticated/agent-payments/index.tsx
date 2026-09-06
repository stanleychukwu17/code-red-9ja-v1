import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@repo/ui/components/custom/AdminLayouts";
import { getPageHeader } from "#/lib/shared/meta";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAgentPaymentsOverview } from "#/lib/server/agent-payments";
import { AgentPaymentsHeader, ElectionGroupSelect } from "./-components";
import { APP_URL } from "#/lib/config";
import { ArrowRight, CheckCircle2, Clock, AlertTriangle, Users, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/agent-payments/")({
  head: () => getPageHeader({ title: "Agent Payments - Overview" }),
  component: AgentPaymentsOverviewPage,
});

function formatNaira(amount: number) {
  return "₦" + amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function AgentPaymentsOverviewPage() {
  const [selectedElectionGroupId, setSelectedElectionGroupId] = useState<number | undefined>(undefined);
  const fetchOverview = useServerFn(getAgentPaymentsOverview);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["agent-payments-overview", selectedElectionGroupId],
    queryFn: async () => {
      const res = await fetchOverview({ data: selectedElectionGroupId });
      return (res as any)?.data || null;
    },
  });

  const electionPay = data?.election_pay || {
    unpaid_total_kobo: 0,
    paid_total_kobo: 0,
    unpaid_count: 0,
    paid_count: 0,
    ineligible_count: 0,
  };

  const referralPay = data?.referral_pay || {
    unpaid_total: 0,
    paid_total: 0,
    unpaid_count: 0,
    paid_count: 0,
  };

  const electionUnpaidNaira = Number(electionPay.unpaid_total_kobo || 0) / 100;
  const electionPaidNaira = Number(electionPay.paid_total_kobo || 0) / 100;

  return (
    <Layout>
      <AgentPaymentsHeader />

      {/* Control Bar: Election Group Select */}
      <div className="flex items-center justify-between gap-4 flex-wrap py-2 border-b border-neutral-100 dark:border-neutral-800/80 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
            Election Group:
          </span>
          <ElectionGroupSelect
            selectedId={selectedElectionGroupId}
            onChange={(id) => setSelectedElectionGroupId(id)}
          />
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          Refresh stats
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-c-50 text-[15px]">
          Loading agent payments overview...
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main Grid: Election Pay & Referral Pay Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Election Pay Card */}
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-6 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0D7A3E] flex items-center justify-center font-bold">
                      <Wallet className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                        Election Pay
                      </h2>
                      <p className="text-xs text-neutral-500">Duty earnings per election day tasks</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    {electionPay.unpaid_count + electionPay.paid_count} Total Agents
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
                      <Clock className="size-3.5 text-amber-500" />
                      <span>Pending Unpaid</span>
                    </div>
                    <div className="text-xl font-black text-neutral-900 dark:text-white">
                      {formatNaira(electionUnpaidNaira)}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {electionPay.unpaid_count} agents due
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                      <span>Total Paid</span>
                    </div>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      {formatNaira(electionPaidNaira)}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {electionPay.paid_count} agents paid
                    </div>
                  </div>
                </div>

                {electionPay.ineligible_count > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                    <span>
                      <strong>{electionPay.ineligible_count}</strong> agents flagged as ineligible (absent or incomplete results). Admin override available.
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-6 mt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                <Link
                  to={APP_URL.agentPayments.electionPay}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#0D7A3E] hover:underline"
                >
                  Manage Election Pay <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            {/* 2. Referral Pay Card */}
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-6 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center font-bold">
                      <Users className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                        Referral Pay
                      </h2>
                      <p className="text-xs text-neutral-500">Agent referral rewards from marketing</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    {referralPay.unpaid_count + referralPay.paid_count} Referrers
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
                      <Clock className="size-3.5 text-amber-500" />
                      <span>Pending Unpaid</span>
                    </div>
                    <div className="text-xl font-black text-neutral-900 dark:text-white">
                      {formatNaira(Number(referralPay.unpaid_total || 0))}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {referralPay.unpaid_count} referrers due
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                      <span>Total Paid</span>
                    </div>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      {formatNaira(Number(referralPay.paid_total || 0))}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {referralPay.paid_count} referrers paid
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                <Link
                  to={APP_URL.agentPayments.referralPay}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#0D7A3E] hover:underline"
                >
                  Manage Referral Pay <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
