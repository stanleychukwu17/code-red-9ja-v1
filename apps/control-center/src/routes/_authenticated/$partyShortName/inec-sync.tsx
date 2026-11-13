/**
 * @file INEC Scraper Command & Sync Center
 * @description Operational interface for authorized party officials to inspect INEC scraper daemons,
 * trigger on-demand syncs for target states/races, and view real-time scrape logs.
 * Supports both Light and Dark themes.
 */

import { createFileRoute, useParams } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getINECResultGrabbers,
  syncINECResultGrabber,
  toggleINECResultGrabberPause,
  getINECResultGrabberLogs,
} from "#/lib/server/inec_grabber";
import {
  RefreshCw,
  Play,
  Pause,
  Terminal,
  CheckCircle2,
  Database,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/$partyShortName/inec-sync")({
  head: () =>
    getPageHeader({
      title: "INEC Scraper Command | Free9ja Control Center",
    }),
  component: INECScraperSyncView,
});

function INECScraperSyncView() {
  const { partyShortName } = useParams({ from: "/_authenticated/$partyShortName/inec-sync" });
  const queryClient = useQueryClient();
  const [selectedGrabberId, setSelectedGrabberId] = useState<number | string | null>(null);

  // Grabbers query
  const { data: grabberData, isLoading, refetch } = useQuery({
    queryKey: ["inec-grabbers-list"],
    queryFn: async () => {
      const res = await getINECResultGrabbers({ data: { limit: 20 } });
      return res;
    },
    refetchInterval: 10000,
  });

  const grabbers = (grabberData as any)?.data?.inec_result_grabbers || [];

  // Logs query for selected or first grabber
  const activeGrabberId = selectedGrabberId || (grabbers.length > 0 ? grabbers[0]?.id : null);

  const { data: logsData, isFetching: isLogsFetching } = useQuery({
    queryKey: ["inec-grabber-logs", activeGrabberId],
    queryFn: async () => {
      if (!activeGrabberId) return null;
      return await getINECResultGrabberLogs({ data: { grabberId: activeGrabberId, limit: 30 } });
    },
    enabled: Boolean(activeGrabberId),
    refetchInterval: 5000,
  });

  const logs = (logsData as any)?.data?.inec_result_grabber_logs || [];

  // Trigger sync mutation
  const syncMutation = useMutation({
    mutationFn: async (id: number | string) => {
      return await syncINECResultGrabber({ data: { id, uploadToR2: true, aiExtract: true } });
    },
    onSuccess: (res) => {
      if (res?.success) {
        toast.success("INEC Scraper sync triggered successfully");
        queryClient.invalidateQueries({ queryKey: ["inec-grabbers-list"] });
        queryClient.invalidateQueries({ queryKey: ["inec-grabber-logs"] });
      } else {
        toast.error(res?.message || "Failed to trigger sync");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Sync request failed");
    },
  });

  // Toggle pause mutation
  const togglePauseMutation = useMutation({
    mutationFn: async (id: number | string) => {
      return await toggleINECResultGrabberPause({ data: { id } });
    },
    onSuccess: (res) => {
      if (res?.success) {
        toast.success("Scraper state updated");
        queryClient.invalidateQueries({ queryKey: ["inec-grabbers-list"] });
      } else {
        toast.error(res?.message || "Failed to toggle status");
      }
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-2">
            <RefreshCw className="size-3.5" />
            <span>Official Portal Pipeline</span>
          </div>
          <h1 className="text-2xl font-black text-foreground">INEC Scraper Command &amp; Ingestion</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Trigger on-demand scraping, review AI document extraction, and verify sync logs from the official INEC IReV portal.
          </p>
        </div>

        <button
          onClick={() => {
            if (activeGrabberId) syncMutation.mutate(activeGrabberId);
          }}
          disabled={!activeGrabberId || syncMutation.isPending}
          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
        >
          <RefreshCw className={`size-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          <span>Sync Selected Scraper Now</span>
        </button>
      </div>

      {/* Main Grid: Scraper Daemons list & Live Terminal Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scraper List (1 col) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Scraper Daemons ({grabbers.length})
            </h3>
            <button
              onClick={() => refetch()}
              className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-card border border-border animate-pulse shadow-xs" />
              ))}
            </div>
          ) : grabbers.length === 0 ? (
            <div className="p-8 rounded-2xl bg-card border border-border text-center text-xs text-muted-foreground shadow-xs">
              No active scraper instances found.
            </div>
          ) : (
            grabbers.map((g: any) => {
              const isSelected = g.id === activeGrabberId;
              const isPaused = g.is_paused || g.status === "paused";

              return (
                <div
                  key={g.id}
                  onClick={() => setSelectedGrabberId(g.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 shadow-xs ${
                    isSelected
                      ? "bg-card border-primary ring-1 ring-primary/40"
                      : "bg-card border-border hover:border-border/80 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground truncate max-w-[180px]">
                      {g.name || g.title || `INEC Grabber #${g.id}`}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        isPaused
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {isPaused ? "Paused" : "Running"}
                    </span>
                  </div>

                  <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>Scope: {g.scope || "Presidential / National"}</span>
                    <span className="font-mono text-foreground font-semibold">{g.total_scraped || 0} sheets</span>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-border text-xs">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePauseMutation.mutate(g.id);
                      }}
                      className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {isPaused ? <Play className="size-3" /> : <Pause className="size-3" />}
                      <span>{isPaused ? "Resume" : "Pause"}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        syncMutation.mutate(g.id);
                      }}
                      disabled={syncMutation.isPending}
                      className="text-primary hover:underline font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      <RefreshCw className="size-3" />
                      <span>Sync</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Live Terminal & Logs (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-5 flex flex-col justify-between space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="size-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Live Ingestion Stream
              </h3>
            </div>
            {isLogsFetching && (
              <span className="text-[10px] text-muted-foreground font-mono animate-pulse">Streaming...</span>
            )}
          </div>

          {/* Terminal Window */}
          <div className="h-96 rounded-xl bg-neutral-950 dark:bg-black border border-neutral-800 p-4 font-mono text-[11px] overflow-y-auto space-y-2 select-text shadow-inner">
            {logs.length === 0 ? (
              <div className="text-neutral-500 py-12 text-center">
                Waiting for scraper log entries...
              </div>
            ) : (
              logs.map((log: any, idx: number) => (
                <div key={log.id || idx} className="flex items-start gap-2">
                  <span className="text-neutral-500 shrink-0">
                    {log.created_at ? new Date(log.created_at).toLocaleTimeString() : `[LOG-${idx}]`}
                  </span>
                  <span
                    className={`shrink-0 font-bold uppercase text-[9px] px-1 rounded ${
                      log.level === "ERROR"
                        ? "bg-red-950 text-red-400"
                        : log.level === "WARN"
                          ? "bg-amber-950 text-amber-400"
                          : "bg-emerald-950 text-emerald-400"
                    }`}
                  >
                    {log.level || "INFO"}
                  </span>
                  <span className="text-neutral-300 break-all">{log.message || log.text}</span>
                </div>
              ))
            )}
          </div>

          {/* Scraper Status Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] text-muted-foreground border-t border-border">
            <div className="flex items-center gap-2">
              <Database className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>R2 Cloud Backup: Active</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="size-3.5 text-sky-600 dark:text-sky-400" />
              <span>AI OCR Extraction: Enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>INEC IReV Handshake: OK</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
