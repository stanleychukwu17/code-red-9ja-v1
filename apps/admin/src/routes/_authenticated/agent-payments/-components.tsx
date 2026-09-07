import * as React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { APP_URL } from "#/lib/config";
import { Coins, CheckCircle, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getElectionGroups } from "#/lib/server/election_groups";

// ─── Header with Top Navigation Tabs ───────────────────────────────────────────

export function AgentPaymentsHeader() {
  const location = useLocation();
  const pathname = location.pathname;

  const isOverview = pathname === "/agent-payments" || pathname === "/agent-payments/";
  const isElectionPay = pathname.includes("/agent-payments/election-pay");
  const isReferralPay = pathname.includes("/agent-payments/referral-pay");

  const tabs = [
    { label: "Overview", href: APP_URL.agentPayments.overview, active: isOverview },
    { label: "Election Pay", href: APP_URL.agentPayments.electionPay, active: isElectionPay },
    { label: "Referral Pay", href: APP_URL.agentPayments.referralPay, active: isReferralPay },
  ];

  return (
    <div className="w-full flex items-center justify-between flex-wrap gap-4 py-3">
      {/* Title */}
      <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
        Agent Payments
      </h1>

      {/* Navigation Tabs Pill Group */}
      <div className="bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl flex items-center gap-1 border border-neutral-200/50 dark:border-neutral-700/50">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            to={tab.href}
            className={`px-4 py-1.5 rounded-lg text-[13.5px] font-medium transition-all ${
              tab.active
                ? "bg-[#0D7A3E] text-white shadow-sm font-semibold"
                : "text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Election Group Select Component ───────────────────────────────────────────

export function ElectionGroupSelect({
  selectedId,
  onChange,
}: {
  selectedId?: number;
  onChange: (id: number) => void;
}) {
  const fetchGroups = useServerFn(getElectionGroups);
  const { data } = useQuery({
    queryKey: ["election-groups-select"],
    queryFn: async () => {
      const res = await fetchGroups({ data: { limit: 50, orderBy: "rank", order: "ASC" } });
      const raw = (res as any)?.data?.items || (res as any)?.data || res;
      return Array.isArray(raw) ? raw : [];
    },
  });

  const groups = Array.isArray(data) ? data : [];

  // Auto-select first group if none selected
  React.useEffect(() => {
    if (!selectedId && groups.length > 0) {
      onChange(groups[0].id);
    }
  }, [selectedId, groups, onChange]);

  if (groups.length === 0) return null;

  return (
    <select
      aria-label="Select election group"
      value={selectedId || ""}
      onChange={(e) => onChange(Number(e.target.value))}
      className="px-3 py-1.5 text-sm font-medium rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-400"
    >
      {groups.map((g: any) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </select>
  );
}

// ─── Pay All Confirmation Modal ────────────────────────────────────────────────

export function PayAllModal({
  isOpen,
  onClose,
  onConfirm,
  isPaying,
  title,
  description,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPaying: boolean;
  title: string;
  description: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-xl border border-neutral-200 dark:border-neutral-800 space-y-4 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#0D7A3E] flex items-center justify-center shrink-0">
            <Coins className="size-5" />
          </div>
          <div>
            <h2 className="font-bold text-neutral-900 dark:text-white text-lg">{title}</h2>
            <p className="text-sm text-neutral-500">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            disabled={isPaying}
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPaying}
            onClick={onConfirm}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 transition-colors flex items-center gap-2"
          >
            {isPaying ? "Processing..." : "Confirm & Pay all"}
          </button>
        </div>
      </div>
    </div>
  );
}
