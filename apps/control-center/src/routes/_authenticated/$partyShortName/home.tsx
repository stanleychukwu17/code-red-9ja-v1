/**
 * @file Situation Room Master Overview
 * @description Real-time command dashboard showing live collation progress, agent check-in telemetry,
 * vote aggregates, and high-priority field incidents for the selected party.
 */

import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useUserParty } from "#/hooks/useUserParty";
import { APP_URL } from "#/lib/config";
import {
  Radio,
  Layers,
  AlertTriangle,
  RefreshCw,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Flame,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getINECResultGrabbers } from "#/lib/server/inec_grabber";

export const Route = createFileRoute("/_authenticated/$partyShortName/home")({
  head: () =>
    getPageHeader({
      title: "Situation Room Command | Free9ja Control Center",
    }),
  component: SituationRoomHome,
});

function SituationRoomHome() {
  const { partyShortName } = useParams({ from: "/_authenticated/$partyShortName/home" });
  const { party } = useUserParty();

  // Fetch INEC scraper status
  const { data: grabberData, isLoading: isScraperLoading } = useQuery({
    queryKey: ["control-center-scraper-status"],
    queryFn: async () => {
      const res = await getINECResultGrabbers({ data: { limit: 5 } });
      return res;
    },
    refetchInterval: 15000,
  });

  const grabbers = (grabberData as any)?.data?.inec_result_grabbers || [];
  const activeScrapersCount = grabbers.filter((g: any) => g.status === "active" || g.status === "running").length;

  return (
    <div className="space-y-6">
      {/* Top Banner Alert / Situation Status */}
      <div className="rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-emerald-950/40 border border-neutral-800 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Radio className="size-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-white">
                {party?.name || partyShortName.toUpperCase()} Situation Room
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wide">
                Live Operations
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Monitoring Form EC8 collation waterfall, parallel vote tallies, and field agent telemetry across all 176,846 Polling Units.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={APP_URL.controlCenter.warRoom(partyShortName)}
            className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <span>Wall Display Mode</span>
          </Link>
          <Link
            to={APP_URL.controlCenter.inecSync(partyShortName)}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-neutral-950 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            <span>INEC Scraper Sync</span>
          </Link>
        </div>
      </div>

      {/* KPI Command Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: PU Reporting Rate */}
        <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">PU Form EC8A Inflow</span>
            <Layers className="size-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">68.4%</span>
            <span className="text-xs text-emerald-400 font-semibold">+4.2%/hr</span>
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "68.4%" }} />
          </div>
          <p className="text-[11px] text-neutral-500">120,962 of 176,846 PUs uploaded</p>
        </div>

        {/* Card 2: Field Agents Active */}
        <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Field Agents Checked In</span>
            <Users className="size-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">94.1%</span>
            <span className="text-xs text-neutral-400 font-mono">166,412</span>
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: "94.1%" }} />
          </div>
          <p className="text-[11px] text-neutral-500">10,434 PUs currently silent</p>
        </div>

        {/* Card 3: Discrepancies Detected */}
        <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Discrepancies Flagged</span>
            <AlertTriangle className="size-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">142</span>
            <span className="text-xs text-amber-500/80 font-medium">Audit Queue</span>
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: "18%" }} />
          </div>
          <p className="text-[11px] text-neutral-500">PU vs INEC Grabber mismatch</p>
        </div>

        {/* Card 4: Scraper Health & Sync */}
        <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">INEC Scraper Daemons</span>
            <RefreshCw className="size-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {isScraperLoading ? "--" : `${activeScrapersCount} Active`}
            </span>
            <span className="text-xs text-emerald-400 font-medium">Syncing</span>
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "100%" }} />
          </div>
          <p className="text-[11px] text-neutral-500">Official INEC portal extraction</p>
        </div>
      </div>

      {/* Main Grid: Waterfall Progression & Priority Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waterfall Progression Summary (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-neutral-900/70 border border-neutral-800 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Collation Waterfall Progress</h2>
              <p className="text-xs text-neutral-400">Form tier aggregation status across administrative levels</p>
            </div>
            <Link
              to={APP_URL.controlCenter.collation(partyShortName)}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>View Waterfall Details</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {/* PU (EC8A) */}
            <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs px-2 py-1 rounded bg-neutral-800 text-emerald-400 font-bold">
                  EC8A
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white">Polling Unit Results</h4>
                  <p className="text-[11px] text-neutral-400">120,962 of 176,846 collected</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-emerald-400">68.4%</span>
                <span className="text-[10px] text-neutral-500 block">Uploaded by PU Agents</span>
              </div>
            </div>

            {/* Ward (EC8B) */}
            <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs px-2 py-1 rounded bg-neutral-800 text-sky-400 font-bold">
                  EC8B
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white">Ward Collation Totals</h4>
                  <p className="text-[11px] text-neutral-400">5,810 of 8,809 wards reconciled</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-sky-400">65.9%</span>
                <span className="text-[10px] text-neutral-500 block">Verified by Ward Agents</span>
              </div>
            </div>

            {/* LGA (EC8C) */}
            <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs px-2 py-1 rounded bg-neutral-800 text-indigo-400 font-bold">
                  EC8C
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white">LGA Collation Totals</h4>
                  <p className="text-[11px] text-neutral-400">412 of 774 LGAs reconciled</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-indigo-400">53.2%</span>
                <span className="text-[10px] text-neutral-500 block">In Progress</span>
              </div>
            </div>

            {/* State (EC8D) */}
            <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs px-2 py-1 rounded bg-neutral-800 text-amber-400 font-bold">
                  EC8D
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white">State Collation Totals</h4>
                  <p className="text-[11px] text-neutral-400">11 of 37 States declared</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-amber-400">29.7%</span>
                <span className="text-[10px] text-neutral-500 block">State Returning Officers</span>
              </div>
            </div>

            {/* Final Declaration (EC8E) */}
            <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs px-2 py-1 rounded bg-neutral-800 text-purple-400 font-bold">
                  EC8E
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white">Final Declaration &amp; Certificate</h4>
                  <p className="text-[11px] text-neutral-400">Awaiting national collation convergence</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-neutral-400">Pending</span>
                <span className="text-[10px] text-neutral-500 block">Chief Electoral Officer</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Incident & SOS Feed (1 col) */}
        <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="size-4 text-red-400 animate-bounce" />
                <h2 className="text-base font-bold text-white">Incident Stream</h2>
              </div>
              <Link
                to={APP_URL.controlCenter.incidents(partyShortName)}
                className="text-xs font-semibold text-neutral-400 hover:text-white"
              >
                All (23)
              </Link>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-800/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide">
                    CRITICAL &bull; BVAS Failure
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">10m ago</span>
                </div>
                <p className="text-xs font-semibold text-white">Kano &bull; Fagge &bull; Ward 03 &bull; PU 012</p>
                <p className="text-[11px] text-neutral-300">
                  BVAS camera failing to verify fingerprints; PO refusing manual backup.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">
                    WARNING &bull; Delayed Materials
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">24m ago</span>
                </div>
                <p className="text-xs font-semibold text-white">Lagos &bull; Alimosho &bull; Ward 05 &bull; PU 008</p>
                <p className="text-[11px] text-neutral-300">
                  INEC officials arrived 2 hours late; party agents on ground awaiting ballot delivery.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wide">
                    AUDIT &bull; Result Sheet Flag
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">38m ago</span>
                </div>
                <p className="text-xs font-semibold text-white">Rivers &bull; Port Harcourt &bull; Ward 02 &bull; PU 004</p>
                <p className="text-[11px] text-neutral-300">
                  Agent uploaded EC8A copy has smudge on APC/PDP totals; awaiting high-res photo.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link
              to={APP_URL.controlCenter.incidents(partyShortName)}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold text-center block transition-colors"
            >
              Open Incident Triage Desk
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
