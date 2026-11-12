/**
 * @file Big-Screen Situation Room Wall Display
 * @description High-density full-screen projector / television wall display mode
 * for party headquarters and election night war rooms.
 */

import { createFileRoute, useParams } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useUserParty } from "#/hooks/useUserParty";
import { useState, useEffect } from "react";
import { Radio, Layers, AlertTriangle, Users, TrendingUp, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/$partyShortName/war-room")({
  head: () =>
    getPageHeader({
      title: "War Room Wall Display | Free9ja Control Center",
    }),
  component: WarRoomWallView,
});

function WarRoomWallView() {
  const { partyShortName } = useParams({ from: "/_authenticated/$partyShortName/war-room" });
  const { party } = useUserParty();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top War Room Ticker */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-3 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-widest">
            HEADQUARTERS SITUATION ROOM &bull; {party?.short_name || partyShortName.toUpperCase()} COMMAND WALL
          </span>
        </div>

        <div className="flex items-center gap-6 font-mono text-xs text-neutral-400">
          <div>
            POLLING STATUS: <span className="text-white font-bold">CLOSE OF POLL / COLLATION ACTIVE</span>
          </div>
          <div>
            UPTIME: <span className="text-emerald-400 font-bold">{Math.floor(seconds / 60)}m {seconds % 60}s</span>
          </div>
        </div>
      </div>

      {/* Giant Wall Display Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-6 rounded-3xl bg-neutral-900/90 border border-neutral-800 text-center space-y-1">
          <span className="text-xs uppercase tracking-wider text-neutral-400 font-bold block">
            National PU Reporting
          </span>
          <p className="text-5xl lg:text-6xl font-black text-emerald-400 tracking-tight font-mono">
            68.4%
          </p>
          <span className="text-xs text-neutral-500 font-mono">120,962 / 176,846 Units</span>
        </div>

        <div className="p-6 rounded-3xl bg-neutral-900/90 border border-neutral-800 text-center space-y-1">
          <span className="text-xs uppercase tracking-wider text-neutral-400 font-bold block">
            Agent Coverage Active
          </span>
          <p className="text-5xl lg:text-6xl font-black text-sky-400 tracking-tight font-mono">
            94.1%
          </p>
          <span className="text-xs text-neutral-500 font-mono">166,412 Agents on Ground</span>
        </div>

        <div className="p-6 rounded-3xl bg-neutral-900/90 border border-neutral-800 text-center space-y-1">
          <span className="text-xs uppercase tracking-wider text-neutral-400 font-bold block">
            Discrepancy Audit Queue
          </span>
          <p className="text-5xl lg:text-6xl font-black text-amber-400 tracking-tight font-mono">
            142
          </p>
          <span className="text-xs text-neutral-500 font-mono">INEC vs EC8A Divergences</span>
        </div>

        <div className="p-6 rounded-3xl bg-neutral-900/90 border border-neutral-800 text-center space-y-1">
          <span className="text-xs uppercase tracking-wider text-neutral-400 font-bold block">
            Active Incidents
          </span>
          <p className="text-5xl lg:text-6xl font-black text-red-400 tracking-tight font-mono">
            23
          </p>
          <span className="text-xs text-neutral-500 font-mono">4 Critical BVAS/Security</span>
        </div>
      </div>

      {/* Battleground State Heatmap / Tallies */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { state: "Lagos", pus: "11,200 / 13,325", pct: 84, lead: "Leading (+82k)", color: "emerald" },
          { state: "Kano", pus: "9,840 / 11,222", pct: 87, lead: "Tight Contest (-12k)", color: "amber" },
          { state: "Rivers", pus: "4,210 / 6,866", pct: 61, lead: "Leading (+44k)", color: "emerald" },
          { state: "Kaduna", pus: "6,940 / 8,012", pct: 86, lead: "Leading (+18k)", color: "emerald" },
          { state: "Oyo", pus: "5,800 / 6,390", pct: 90, lead: "Leading (+65k)", color: "emerald" },
          { state: "FCT Abuja", pus: "2,822 / 2,822", pct: 100, lead: "Declared Won (+120k)", color: "emerald" },
        ].map((item) => (
          <div key={item.state} className="p-5 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-extrabold text-white">{item.state}</span>
              <span className="font-mono text-xs font-bold text-emerald-400">{item.pct}%</span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${item.pct}%` }} />
            </div>
            <div className="flex justify-between items-center text-xs text-neutral-400 font-mono">
              <span>{item.pus} PUs</span>
              <span className="font-bold text-white">{item.lead}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
