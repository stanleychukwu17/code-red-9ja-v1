/**
 * @file Field Deployment & Live Telemetry
 * @description Real-time monitoring of party agents across all polling units and collation centers.
 * Shows who is active, who has checked in, and which polling units are currently silent.
 */

import { createFileRoute, useParams } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useState } from "react";
import { Users, Search, Phone, ShieldCheck, MapPin, Radio, Wifi, WifiOff } from "lucide-react";

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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold mb-2">
            <Users className="size-3.5" />
            <span>Field Forces Telemetry</span>
          </div>
          <h1 className="text-2xl font-black text-white">Party Agent Deployment &amp; Presence</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time ping telemetry for 176k+ Polling Unit Agents and 8.8k+ Collation Officers across Nigeria.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(["all", "active", "silent", "unassigned"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setStatusFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                statusFilter === t
                  ? "bg-sky-500 text-neutral-950"
                  : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-1">
          <span className="text-xs text-neutral-400">Total Party Agents Deployed</span>
          <p className="text-2xl font-black text-white">166,412</p>
          <span className="text-[10px] text-emerald-400">94.1% National Coverage</span>
        </div>
        <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-1">
          <span className="text-xs text-neutral-400">Active / Live Pings</span>
          <p className="text-2xl font-black text-emerald-400">155,978</p>
          <span className="text-[10px] text-neutral-500">Connected within 15 mins</span>
        </div>
        <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-1">
          <span className="text-xs text-neutral-400">Silent / Unreachable Units</span>
          <p className="text-2xl font-black text-amber-400">10,434</p>
          <span className="text-[10px] text-amber-500/80">Network / Battery dropped</span>
        </div>
        <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-1">
          <span className="text-xs text-neutral-400">Unassigned Units</span>
          <p className="text-2xl font-black text-red-400">10,434</p>
          <span className="text-[10px] text-red-500/80">Requires roving agent coverage</span>
        </div>
      </div>

      {/* Agent Roster Table */}
      <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">Agent Telemetry Stream</h2>
          <div className="relative w-full sm:w-72">
            <Search className="size-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search agent name, PU code, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-800 text-neutral-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Agent</th>
                <th className="py-2.5 px-3">Role &amp; Assignment</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Telemetry Ping</th>
                <th className="py-2.5 px-3">EC8A Status</th>
                <th className="py-2.5 px-3 text-right">Direct Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-200">
              {filtered.map((agent) => (
                <tr key={agent.id} className="hover:bg-neutral-800/40 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-bold text-white block">{agent.name}</span>
                    <span className="text-[11px] font-mono text-neutral-400">{agent.id}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-neutral-200 block">{agent.role}</span>
                    <span className="text-[11px] font-mono text-neutral-400">{agent.puCode}</span>
                  </td>
                  <td className="py-3 px-3 text-neutral-300">
                    <span>{agent.state} &bull; {agent.lga}</span>
                    <span className="text-[11px] text-neutral-500 block">{agent.ward}</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      {agent.status === "active" ? (
                        <>
                          <Wifi className="size-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">{agent.lastSeen}</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="size-3.5 text-amber-400" />
                          <span className="text-amber-400 font-medium">{agent.lastSeen}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    {agent.ec8aSubmitted ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-800/50">
                        EC8A Uploaded
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-400">
                        Pending Close of Poll
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <a
                      href={`tel:${agent.phone}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono text-[11px] transition-colors"
                    >
                      <Phone className="size-3 text-emerald-400" />
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
