/**
 * @file Situation Room Master Overview
 * @description Real-time command dashboard showing live collation progress, agent check-in telemetry,
 * vote aggregates, and high-priority field incidents for the selected party.
 * Supports both Light and Dark themes.
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
  ArrowRight,
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
  const activeScrapersCount = grabbers.filter(
    (g: any) => g.status === "active" || g.status === "running"
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner Alert / Situation Status */}
      <div className="rounded-2xl bg-card border border-border p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Radio className="size-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-foreground">
                {party?.name || partyShortName.toUpperCase()} Situation Room
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wide">
                Live Operations
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Monitoring Form EC8 collation waterfall, parallel vote tallies, and field agent telemetry across all 176,846 Polling Units.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={APP_URL.controlCenter.warRoom(partyShortName)}
            className="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-colors flex items-center gap-1.5 border border-border"
          >
            <span>Wall Display Mode</span>
          </Link>
          <Link
            to={APP_URL.controlCenter.inecSync(partyShortName)}
            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className="size-3.5" />
            <span>INEC Scraper Sync</span>
          </Link>
        </div>
      </div>

      {/* KPI Command Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: PU Reporting Rate */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">PU Form EC8A Inflow</span>
            <Layers className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">68.4%</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">+4.2%/hr</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "68.4%" }} />
          </div>
          <p className="text-[11px] text-muted-foreground">120,962 of 176,846 PUs uploaded</p>
        </div>

        {/* Card 2: Field Agents Active */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Field Agents Checked In</span>
            <Users className="size-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">94.1%</span>
            <span className="text-xs text-muted-foreground font-mono">166,412</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: "94.1%" }} />
          </div>
          <p className="text-[11px] text-muted-foreground">10,434 PUs currently silent</p>
        </div>

        {/* Card 3: Discrepancies Detected */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Discrepancies Flagged</span>
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">142</span>
            <span className="text-xs text-amber-600/80 dark:text-amber-400/80 font-medium">Audit Queue</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: "18%" }} />
          </div>
          <p className="text-[11px] text-muted-foreground">PU vs INEC Grabber mismatch</p>
        </div>

        {/* Card 4: Scraper Health & Sync */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">INEC Scraper Daemons</span>
            <RefreshCw className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">
              {isScraperLoading ? "--" : `${activeScrapersCount} Active`}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Syncing</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "100%" }} />
          </div>
          <p className="text-[11px] text-muted-foreground">Official INEC portal extraction</p>
        </div>
      </div>

      {/* Main Grid: Waterfall Progression & Priority Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waterfall Progression Summary (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-5 space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Collation Waterfall Progress</h2>
              <p className="text-xs text-muted-foreground">Form tier aggregation status across administrative levels</p>
            </div>
            <Link
              to={APP_URL.controlCenter.collation(partyShortName)}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>View Waterfall Details</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {/* PU (EC8A) */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs px-2 py-1 rounded bg-muted text-emerald-700 dark:text-emerald-400 font-bold border border-border">
                  EC8A
                </span>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Polling Unit Results</h4>
                  <p className="text-[11px] text-muted-foreground">120,962 of 176,846 collected</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">68.4%</span>
                <span className="text-[10px] text-muted-foreground block">Uploaded by PU Agents</span>
              </div>
            </div>

            {/* Ward (EC8B) */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs px-2 py-1 rounded bg-muted text-sky-700 dark:text-sky-400 font-bold border border-border">
                  EC8B
                </span>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Ward Collation Totals</h4>
                  <p className="text-[11px] text-muted-foreground">5,810 of 8,809 wards reconciled</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">65.9%</span>
                <span className="text-[10px] text-muted-foreground block">Verified by Ward Agents</span>
              </div>
            </div>

            {/* LGA (EC8C) */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs px-2 py-1 rounded bg-muted text-indigo-700 dark:text-indigo-400 font-bold border border-border">
                  EC8C
                </span>
                <div>
                  <h4 className="text-xs font-bold text-foreground">LGA Collation Totals</h4>
                  <p className="text-[11px] text-muted-foreground">412 of 774 LGAs reconciled</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">53.2%</span>
                <span className="text-[10px] text-muted-foreground block">In Progress</span>
              </div>
            </div>

            {/* State (EC8D) */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs px-2 py-1 rounded bg-muted text-amber-700 dark:text-amber-400 font-bold border border-border">
                  EC8D
                </span>
                <div>
                  <h4 className="text-xs font-bold text-foreground">State Collation Totals</h4>
                  <p className="text-[11px] text-muted-foreground">11 of 37 States declared</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">29.7%</span>
                <span className="text-[10px] text-muted-foreground block">State Returning Officers</span>
              </div>
            </div>

            {/* Final Declaration (EC8E) */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs px-2 py-1 rounded bg-muted text-purple-700 dark:text-purple-400 font-bold border border-border">
                  EC8E
                </span>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Final Declaration &amp; Certificate</h4>
                  <p className="text-[11px] text-muted-foreground">Awaiting national collation convergence</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-muted-foreground">Pending</span>
                <span className="text-[10px] text-muted-foreground block">Chief Electoral Officer</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Incident & SOS Feed (1 col) */}
        <div className="rounded-2xl bg-card border border-border p-5 space-y-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="size-4 text-red-500 animate-bounce" />
                <h2 className="text-base font-bold text-foreground">Incident Stream</h2>
              </div>
              <Link
                to={APP_URL.controlCenter.incidents(partyShortName)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                All (23)
              </Link>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">
                    CRITICAL &bull; BVAS Failure
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">10m ago</span>
                </div>
                <p className="text-xs font-semibold text-foreground">Kano &bull; Fagge &bull; Ward 03 &bull; PU 012</p>
                <p className="text-[11px] text-muted-foreground">
                  BVAS camera failing to verify fingerprints; PO refusing manual backup.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    WARNING &bull; Delayed Materials
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">24m ago</span>
                </div>
                <p className="text-xs font-semibold text-foreground">Lagos &bull; Alimosho &bull; Ward 05 &bull; PU 008</p>
                <p className="text-[11px] text-muted-foreground">
                  INEC officials arrived 2 hours late; party agents on ground awaiting ballot delivery.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/60 border border-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wide">
                    AUDIT &bull; Result Sheet Flag
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">38m ago</span>
                </div>
                <p className="text-xs font-semibold text-foreground">Rivers &bull; Port Harcourt &bull; Ward 02 &bull; PU 004</p>
                <p className="text-[11px] text-muted-foreground">
                  Agent uploaded EC8A copy has smudge on APC/PDP totals; awaiting high-res photo.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link
              to={APP_URL.controlCenter.incidents(partyShortName)}
              className="w-full py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold text-center block transition-colors border border-border"
            >
              Open Incident Triage Desk
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
