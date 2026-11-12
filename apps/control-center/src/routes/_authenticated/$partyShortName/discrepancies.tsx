/**
 * @file Parallel Vote Audit & Discrepancy Matrix
 * @description Real-time comparison between party agent primary Form EC8A figures,
 * official INEC scraper portal data, and ward/LGA collation aggregates.
 */

import { createFileRoute, useParams } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Search, Filter, ShieldCheck, Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/$partyShortName/discrepancies")({
  head: () =>
    getPageHeader({
      title: "Discrepancy Matrix | Free9ja Control Center",
    }),
  component: DiscrepancyMatrixView,
});

function DiscrepancyMatrixView() {
  const { partyShortName } = useParams({ from: "/_authenticated/$partyShortName/discrepancies" });
  const [filterType, setFilterType] = useState<"all" | "mismatch" | "overvoting" | "smudge">("all");
  const [search, setSearch] = useState("");

  const discrepancies = [
    {
      id: "DISC-1042",
      puCode: "19/04/08/014",
      state: "Rivers",
      lga: "Obio/Akpor",
      ward: "Ward 08",
      puName: "Open Space, Rumuokoro Junction",
      agentEC8A: 284,
      inecGrabber: 140,
      diff: -144,
      accredited: 310,
      type: "mismatch",
      severity: "CRITICAL",
      reason: "Agent EC8A carbon copy records 284 votes; INEC portal sheet shows altered figure 140.",
      status: "Under Legal Review",
    },
    {
      id: "DISC-1043",
      puCode: "24/12/03/007",
      state: "Lagos",
      lga: "Surulere",
      ward: "Ward 03",
      puName: "Ojuelegba Primary School Booth B",
      agentEC8A: 412,
      inecGrabber: 412,
      diff: 0,
      accredited: 380,
      type: "overvoting",
      severity: "HIGH",
      reason: "Total votes cast (412) exceeds total accredited voters on BVAS (380) by 32 votes.",
      status: "Flagged for Cancellation",
    },
    {
      id: "DISC-1044",
      puCode: "18/02/01/022",
      state: "Kano",
      lga: "Nasarawa",
      ward: "Gwagwarwa",
      puName: "Customary Court Premises",
      agentEC8A: 195,
      inecGrabber: 195,
      diff: 0,
      accredited: 220,
      type: "smudge",
      severity: "MEDIUM",
      reason: "EC8A stamp smudged; party agent signature verified via digital signature hash.",
      status: "Resolved - Matched",
    },
    {
      id: "DISC-1045",
      puCode: "03/06/04/011",
      state: "Bauchi",
      lga: "Katagum",
      ward: "Chinade",
      puName: "Central Ward Kiosk",
      agentEC8A: 340,
      inecGrabber: 280,
      diff: -60,
      accredited: 350,
      type: "mismatch",
      severity: "CRITICAL",
      reason: "Sub-total arithmetic error on Form EC8B collation vs sum of EC8A unit slips.",
      status: "Escalated to Collation Officer",
    },
  ];

  const filtered = discrepancies.filter((d) => {
    const matchesFilter = filterType === "all" || d.type === filterType;
    const matchesSearch =
      !search ||
      d.puCode.toLowerCase().includes(search.toLowerCase()) ||
      d.state.toLowerCase().includes(search.toLowerCase()) ||
      d.lga.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold mb-2">
            <AlertTriangle className="size-3.5" />
            <span>Parallel Dataset &bull; Forensic Audit</span>
          </div>
          <h1 className="text-2xl font-black text-white">Parallel Audit &amp; Discrepancy Matrix</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Automated divergence detection between Party Polling Unit Agent EC8A uploads and INEC Scraper extractions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(["all", "mismatch", "overvoting", "smudge"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filterType === t
                  ? "bg-amber-500 text-neutral-950"
                  : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Discrepancy Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-1">
          <span className="text-xs text-neutral-400">Total Flagged Units</span>
          <p className="text-2xl font-black text-white">142</p>
          <span className="text-[10px] text-neutral-500">Across 18 States</span>
        </div>
        <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-1">
          <span className="text-xs text-neutral-400">Critical Figure Mismatches</span>
          <p className="text-2xl font-black text-red-400">48</p>
          <span className="text-[10px] text-red-500/80">Affecting &gt; 18,000 votes</span>
        </div>
        <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-1">
          <span className="text-xs text-neutral-400">Over-voting Detected</span>
          <p className="text-2xl font-black text-amber-400">31</p>
          <span className="text-[10px] text-amber-500/80">Votes &gt; BVAS Accreditation</span>
        </div>
        <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-1">
          <span className="text-xs text-neutral-400">Reconciled / Cleared</span>
          <p className="text-2xl font-black text-emerald-400">63</p>
          <span className="text-[10px] text-emerald-500/80">Verified by Collation Agent</span>
        </div>
      </div>

      {/* Discrepancy Table */}
      <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">Active Irregularity Docket</h2>
          <div className="relative w-full sm:w-72">
            <Search className="size-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by PU code, State, LGA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-800 text-neutral-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Docket ID</th>
                <th className="py-2.5 px-3">Location / PU Code</th>
                <th className="py-2.5 px-3">Agent EC8A</th>
                <th className="py-2.5 px-3">INEC Portal</th>
                <th className="py-2.5 px-3">Variance</th>
                <th className="py-2.5 px-3">Severity &amp; Details</th>
                <th className="py-2.5 px-3 text-right">Action / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-200">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-800/40 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-neutral-400">{item.id}</td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-white block">{item.puName}</span>
                    <span className="text-[11px] font-mono text-neutral-400 block">
                      {item.state} &bull; {item.lga} &bull; {item.puCode}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-400">{item.agentEC8A}</td>
                  <td className="py-3 px-3 font-mono font-bold text-sky-400">{item.inecGrabber}</td>
                  <td className="py-3 px-3 font-mono">
                    {item.diff === 0 ? (
                      <span className="text-neutral-400">0</span>
                    ) : (
                      <span className="font-bold text-red-400">{item.diff}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 max-w-xs">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider mb-1 ${
                        item.severity === "CRITICAL"
                          ? "bg-red-950/60 text-red-400 border border-red-800/60"
                          : item.severity === "HIGH"
                            ? "bg-amber-950/60 text-amber-400 border border-amber-800/60"
                            : "bg-blue-950/60 text-blue-400 border border-blue-800/60"
                      }`}
                    >
                      {item.severity}
                    </span>
                    <p className="text-[11px] text-neutral-300 line-clamp-1">{item.reason}</p>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-300">
                      {item.status}
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
