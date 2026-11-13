/**
 * @file Incident & SOS Triage Desk
 * @description Centralized emergency triage room for field irregularities, BVAS breakdowns,
 * voter intimidation reports, and agent SOS safety alerts.
 * Supports both Light and Dark themes.
 */

import { createFileRoute, useParams } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useState } from "react";
import { Flame, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/$partyShortName/incidents")({
  head: () =>
    getPageHeader({
      title: "Incident & SOS Desk | Free9ja Control Center",
    }),
  component: IncidentTriageView,
});

function IncidentTriageView() {
  const { partyShortName } = useParams({ from: "/_authenticated/$partyShortName/incidents" });
  const [priorityFilter, setPriorityFilter] = useState<"all" | "CRITICAL" | "HIGH" | "MEDIUM">("all");
  const [search, setSearch] = useState("");

  const [incidents, setIncidents] = useState([
    {
      id: "INC-901",
      priority: "CRITICAL",
      title: "BVAS Malfunction & Voting Halt",
      location: "Kano &bull; Fagge &bull; Ward 03 &bull; PU 012",
      reporter: "Agent Ibrahim Musa",
      phone: "+234 803 111 2233",
      timestamp: "12m ago",
      description: "BVAS device battery died; replacement device lacks biometric keys for this unit. 200+ voters queued.",
      status: "OPEN",
    },
    {
      id: "INC-902",
      priority: "CRITICAL",
      title: "Thugs Intimidation / Ballot Snatch Attempt",
      location: "Rivers &bull; Port Harcourt &bull; Ward 05 &bull; PU 019",
      reporter: "Agent Kingsley Amadi",
      phone: "+234 802 888 9900",
      timestamp: "28m ago",
      description: "Armed individuals arrived attempting to hijack ballot box. Police escort intervened; agents took shelter.",
      status: "TRIAGING",
    },
    {
      id: "INC-903",
      priority: "HIGH",
      title: "Late Arrival of INEC Sensitive Materials",
      location: "Lagos &bull; Alimosho &bull; Ward 05 &bull; PU 008",
      reporter: "Agent Funke Balogun",
      phone: "+234 809 444 3322",
      timestamp: "45m ago",
      description: "Materials arrived at 11:45 AM instead of 8:30 AM. Presiding officer agreed to extend voting until line clears.",
      status: "MONITORING",
    },
    {
      id: "INC-904",
      priority: "MEDIUM",
      title: "Presiding Officer Refused Duplicate EC8A",
      location: "Oyo &bull; Ibadan North &bull; Ward 02 &bull; PU 003",
      reporter: "Agent Segun Adebayo",
      phone: "+234 816 555 1122",
      timestamp: "1h 10m ago",
      description: "PO claimed shortage of EC8A carbon paper. Agent photographed wall-pasted copy as legal fallback.",
      status: "RESOLVED",
    },
  ]);

  const handleResolve = (id: string) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status: "RESOLVED" } : inc))
    );
    toast.success(`Incident ${id} marked as resolved`);
  };

  const filtered = incidents.filter((inc) => {
    const matchesPriority = priorityFilter === "all" || inc.priority === priorityFilter;
    const matchesSearch =
      !search ||
      inc.title.toLowerCase().includes(search.toLowerCase()) ||
      inc.location.toLowerCase().includes(search.toLowerCase()) ||
      inc.id.toLowerCase().includes(search.toLowerCase());
    return matchesPriority && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 text-xs font-semibold mb-2">
            <Flame className="size-3.5" />
            <span>Crisis &amp; Emergency Escalation</span>
          </div>
          <h1 className="text-2xl font-black text-foreground">Incident &amp; Field Distress Triage</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time feed of violence, technical malfunctions, late deployments, and agent safety alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(["all", "CRITICAL", "HIGH", "MEDIUM"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                priorityFilter === p
                  ? "bg-destructive text-destructive-foreground font-bold shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Triage Stream */}
      <div className="space-y-3">
        {filtered.map((inc) => (
          <div
            key={inc.id}
            className={`p-5 rounded-2xl border transition-all space-y-3 shadow-xs ${
              inc.priority === "CRITICAL"
                ? "bg-red-500/5 dark:bg-red-950/20 border-red-500/30"
                : inc.priority === "HIGH"
                  ? "bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/30"
                  : "bg-card border-border"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase ${
                    inc.priority === "CRITICAL"
                      ? "bg-red-600 text-white"
                      : inc.priority === "HIGH"
                        ? "bg-amber-600 text-white"
                        : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {inc.priority}
                </span>
                <span className="font-mono text-xs text-muted-foreground font-bold">{inc.id}</span>
                <h3 className="text-sm font-bold text-foreground">{inc.title}</h3>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-mono">{inc.timestamp}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    inc.status === "RESOLVED"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-muted text-foreground border border-border"
                  }`}
                >
                  {inc.status}
                </span>
              </div>
            </div>

            <p className="text-xs text-foreground/90 leading-relaxed">{inc.description}</p>

            <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                <span dangerouslySetInnerHTML={{ __html: inc.location }} />
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={`tel:${inc.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium border border-border transition-colors"
                >
                  <Phone className="size-3 text-primary" />
                  <span>Call {inc.reporter}</span>
                </a>

                {inc.status !== "RESOLVED" && (
                  <button
                    onClick={() => handleResolve(inc.id)}
                    className="px-3 py-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
