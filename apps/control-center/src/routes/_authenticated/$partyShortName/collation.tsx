/**
 * @file Collation Waterfall View
 * @description In-depth collation progression through Form EC8A (PU), EC8B (Ward),
 * EC8C (LGA), EC8D (State), and EC8E (Declaration) tiers with live state filters.
 */

import { createFileRoute, useParams } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useState } from "react";
import { Layers, CheckCircle2, AlertCircle, Clock, Search, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/$partyShortName/collation")({
  head: () =>
    getPageHeader({
      title: "Collation Waterfall | Free9ja Control Center",
    }),
  component: CollationWaterfallView,
});

function CollationWaterfallView() {
  const { partyShortName } = useParams({ from: "/_authenticated/$partyShortName/collation" });
  const [selectedTier, setSelectedTier] = useState<"all" | "ec8a" | "ec8b" | "ec8c" | "ec8d" | "ec8e">("all");
  const [searchState, setSearchState] = useState("");

  const collationTiers = [
    {
      code: "EC8A",
      tier: "Polling Unit",
      total: 176846,
      processed: 120962,
      pending: 55884,
      pct: 68.4,
      officer: "Presiding Officer (PO)",
      color: "emerald",
    },
    {
      code: "EC8B",
      tier: "Ward Collation",
      total: 8809,
      processed: 5810,
      pending: 2999,
      pct: 65.9,
      officer: "Ward Collation Officer (WCO)",
      color: "sky",
    },
    {
      code: "EC8C",
      tier: "LGA Collation",
      total: 774,
      processed: 412,
      pending: 362,
      pct: 53.2,
      officer: "LGA Collation Officer (LGACO)",
      color: "indigo",
    },
    {
      code: "EC8D",
      tier: "State Collation",
      total: 37,
      processed: 11,
      pending: 26,
      pct: 29.7,
      officer: "State Returning Officer (SRO)",
      color: "amber",
    },
    {
      code: "EC8E",
      tier: "Final Declaration",
      total: 1,
      processed: 0,
      pending: 1,
      pct: 0,
      officer: "Chief Electoral Commissioner / Returning Officer",
      color: "purple",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2">
            <Layers className="size-3.5" />
            <span>Form EC8 Series Waterfall</span>
          </div>
          <h1 className="text-2xl font-black text-white">Parallel Collation Progression</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Reconcile party parallel dataset tier-by-tier against official collation officer records.
          </p>
        </div>

        {/* Tier filter tabs */}
        <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800 overflow-x-auto">
          {(["all", "ec8a", "ec8b", "ec8c", "ec8d", "ec8e"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTier(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                selectedTier === t
                  ? "bg-emerald-500 text-neutral-950"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Waterfall Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {collationTiers.map((tier) => (
          <div
            key={tier.code}
            className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-black text-white px-2 py-0.5 rounded bg-neutral-800">
                {tier.code}
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">{tier.pct}%</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{tier.tier}</h3>
              <p className="text-[10px] text-neutral-400 line-clamp-1">{tier.officer}</p>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${tier.pct}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-neutral-400 font-mono">
              <span>{tier.processed.toLocaleString()} done</span>
              <span className="text-neutral-500">{tier.pending.toLocaleString()} left</span>
            </div>
          </div>
        ))}
      </div>

      {/* State Aggregations Table */}
      <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">Geopolitical State Breakdown</h2>
          <div className="relative w-full sm:w-64">
            <Search className="size-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter states..."
              value={searchState}
              onChange={(e) => setSearchState(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-800 text-neutral-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">State</th>
                <th className="py-2.5 px-3">Total PUs</th>
                <th className="py-2.5 px-3">EC8A Uploaded</th>
                <th className="py-2.5 px-3">EC8B (Wards)</th>
                <th className="py-2.5 px-3">EC8C (LGAs)</th>
                <th className="py-2.5 px-3">EC8D Status</th>
                <th className="py-2.5 px-3 text-right">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-200">
              {[
                { name: "Lagos", pus: 13325, ec8a: 11200, wards: "245/245", lgas: "18/20", ec8d: "In Collation", audit: "Clean" },
                { name: "Kano", pus: 11222, ec8a: 9840, wards: "484/484", lgas: "40/44", ec8d: "In Collation", audit: "Flagged (2)" },
                { name: "Rivers", pus: 6866, ec8a: 4210, wards: "180/319", lgas: "12/23", ec8d: "Awaiting", audit: "Flagged (5)" },
                { name: "Kaduna", pus: 8012, ec8a: 6940, wards: "220/255", lgas: "19/23", ec8d: "In Collation", audit: "Clean" },
                { name: "Oyo", pus: 6390, ec8a: 5800, wards: "310/351", lgas: "29/33", ec8d: "In Collation", audit: "Clean" },
                { name: "Anambra", pus: 5720, ec8a: 4900, wards: "290/326", lgas: "18/21", ec8d: "In Collation", audit: "Clean" },
                { name: "FCT Abuja", pus: 2822, ec8a: 2822, wards: "62/62", lgas: "6/6", ec8d: "Declared (EC8D)", audit: "Reconciled" },
              ]
                .filter((s) => !searchState || s.name.toLowerCase().includes(searchState.toLowerCase()))
                .map((row) => (
                  <tr key={row.name} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-white">{row.name}</td>
                    <td className="py-3 px-3 font-mono">{row.pus.toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono text-emerald-400">
                      {row.ec8a.toLocaleString()} ({Math.round((row.ec8a / row.pus) * 100)}%)
                    </td>
                    <td className="py-3 px-3 font-mono">{row.wards}</td>
                    <td className="py-3 px-3 font-mono">{row.lgas}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-300">
                        {row.ec8d}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          row.audit.includes("Flagged")
                            ? "bg-amber-950/50 text-amber-400 border border-amber-800/60"
                            : "bg-emerald-950/40 text-emerald-400 border border-emerald-800/50"
                        }`}
                      >
                        {row.audit}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
