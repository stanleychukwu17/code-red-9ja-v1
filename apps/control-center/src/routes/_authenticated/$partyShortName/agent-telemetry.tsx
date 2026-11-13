/**
 * @file Field Deployment & Live Telemetry
 * @description Real-time monitoring of party agents across all polling units and collation centers.
 * Shows who is active, who has checked in, and which polling units are currently silent.
 * Supports both Light and Dark themes.
 */

import { createFileRoute, useParams } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useState } from "react";
import { Users, Search, Phone, Wifi, WifiOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/$partyShortName/agent-telemetry")({
  head: () =>
    getPageHeader({
      title: "Agent Deployment & Telemetry | Free9ja Control Center",
    }),
  component: AgentTelemetryView,
});

function AgentTelemetryView() {
  const { partyShortName } = useParams({ from: "/_authenticated/$partyShortName/agent-telemetry" });
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "silent" | "unassigned">("all");
  const [search, setSearch] = useState("");

  const sampleAgents = [
    {
      id: "AGT-881",
      name: "Ibrahim Musa",
      phone: "+234 803 111 2233",
      role: "PU Agent",
      puCode: "18/02/01/014",
      state: "Kano",
      lga: "Nasarawa",
      ward: "Gwagwarwa",
      status: "active",
      lastSeen: "2 mins ago",
      battery: "88%",
      ec8aSubmitted: true,
    },
    {
      id: "AGT-882",
      name: "Chukwudi Eze",
      phone: "+234 802 444 5566",
      role: "PU Agent",
      puCode: "19/04/08/014",
      state: "Rivers",
      lga: "Obio/Akpor",
      ward: "Ward 08",
      status: "active",
      lastSeen: "6 mins ago",
      battery: "64%",
      ec8aSubmitted: true,
    },
    {
      id: "AGT-883",
      name: "Babatunde Adeleke",
      phone: "+234 814 777 8899",
      role: "Ward Collation Agent",
      puCode: "Ward 03 Collation Center",
      state: "Lagos",
      lga: "Surulere",
      ward: "Ward 03",
      status: "active",
      lastSeen: "Just now",
      battery: "92%",
      ec8aSubmitted: false,
    },
    {
      id: "AGT-884",
      name: "Amina Yusuf",
      phone: "+234 805 222 3344",
      role: "PU Agent",
      puCode: "04/01/02/009",
      state: "Kaduna",
      lga: "Zaria",
      ward: "Dambo",
      status: "silent",
      lastSeen: "1h 45m ago",
      battery: "Unknown",
      ec8aSubmitted: false,
    },
    {
      id: "AGT-885",
      name: "Tariere Briggs",
      phone: "+234 809 333 4455",
      role: "PU Agent",
      puCode: "06/03/01/002",
      state: "Bayelsa",
      lga: "Brass",
      ward: "Brass I",
      status: "silent",
      lastSeen: "2h 10m ago",
      battery: "Unknown",
      ec8aSubmitted: false,
    },
  ];

  const filtered = sampleAgents.filter((a) => {
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const matchesSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.state.toLowerCase().includes(search.toLowerCase()) ||
      a.lga.toLowerCase().includes(search.toLowerCase()) ||
      a.puCode.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 text-xs font-semibold mb-2">
            <Users className="size-3.5" />
            <span>Field Forces Telemetry</span>
          </div>
          <h1 className="text-2xl font-black text-foreground">Party Agent Deployment &amp; Presence</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time ping telemetry for 176k+ Polling Unit Agents and 8.8k+ Collation Officers across Nigeria.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(["all", "active", "silent", "unassigned"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setStatusFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                statusFilter === t
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1 shadow-xs">
          <span className="text-xs text-muted-foreground">Total Party Agents Deployed</span>
          <p className="text-2xl font-black text-foreground">166,412</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">94.1% National Coverage</span>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1 shadow-xs">
          <span className="text-xs text-muted-foreground">Active / Live Pings</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">155,978</p>
          <span className="text-[10px] text-muted-foreground">Connected within 15 mins</span>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1 shadow-xs">
          <span className="text-xs text-muted-foreground">Silent / Unreachable Units</span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">10,434</p>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80">Network / Battery dropped</span>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1 shadow-xs">
          <span className="text-xs text-muted-foreground">Unassigned Units</span>
          <p className="text-2xl font-black text-red-600 dark:text-red-400">10,434</p>
          <span className="text-[10px] text-red-600/80 dark:text-red-400/80">Requires roving agent coverage</span>
        </div>
      </div>

      {/* Agent Roster Table */}
      <div className="rounded-2xl bg-card border border-border p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-foreground">Agent Telemetry Stream</h2>
          <div className="relative w-full sm:w-72">
            <Search className="size-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search agent name, PU code, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border text-muted-foreground uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Agent</th>
                <th className="py-2.5 px-3">Role &amp; Assignment</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Telemetry Ping</th>
                <th className="py-2.5 px-3">EC8A Status</th>
                <th className="py-2.5 px-3 text-right">Direct Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filtered.map((agent) => (
                <tr key={agent.id} className="hover:bg-muted/40 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-bold text-foreground block">{agent.name}</span>
                    <span className="text-[11px] font-mono text-muted-foreground">{agent.id}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-foreground block">{agent.role}</span>
                    <span className="text-[11px] font-mono text-muted-foreground">{agent.puCode}</span>
                  </td>
                  <td className="py-3 px-3 text-muted-foreground">
                    <span className="text-foreground">{agent.state} &bull; {agent.lga}</span>
                    <span className="text-[11px] text-muted-foreground block">{agent.ward}</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      {agent.status === "active" ? (
                        <>
                          <Wifi className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">{agent.lastSeen}</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="size-3.5 text-amber-600 dark:text-amber-400" />
                          <span className="text-amber-600 dark:text-amber-400 font-medium">{agent.lastSeen}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    {agent.ec8aSubmitted ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        EC8A Uploaded
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                        Pending Close of Poll
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <a
                      href={`tel:${agent.phone}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-mono text-[11px] transition-colors border border-border"
                    >
                      <Phone className="size-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{agent.phone}</span>
                    </a>
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
