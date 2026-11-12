import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, X, ArrowRight, Radio } from "lucide-react";
import { APP_URL } from "#/lib/config";
import { getParties } from "#/lib/server/parties";
import { getPageHeader } from "#/lib/shared/meta";
import { useUser, type Party } from "#/hooks/useUser";
import { cn } from "@repo/ui/lib/utils";

export const Route = createFileRoute("/_authenticated/parties")({
  head: () =>
    getPageHeader({
      title: "Select Party Command Room | Free9ja Control Center",
      description: "Switch between political party situation rooms and collation command dashboards.",
    }),
  component: SelectPartySituationRoom,
});

function SelectPartySituationRoom() {
  const user = useUser();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: partiesRes, isLoading, error, refetch } = useQuery({
    queryKey: ["control-center-parties-list"],
    queryFn: async () => {
      const res = await getParties();
      if (res?.success) {
        return res;
      }
      throw new Error(res?.message || "Failed to fetch parties");
    },
    staleTime: Infinity,
  });

  const parties: Party[] = (partiesRes as any)?.data?.parties || [];

  const filteredParties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return parties;
    return parties.filter((p) => {
      const matchShortName = p.short_name?.toLowerCase().includes(q);
      const matchName = p.name?.toLowerCase().includes(q);
      return matchShortName || matchName;
    });
  }, [parties, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2">
            <Radio className="size-3.5 animate-pulse" />
            <span>Multi-Tenant Situation Room Dispatch</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Party Command Selection
          </h1>
          <p className="text-neutral-400 text-xs md:text-sm mt-1">
            Choose a registered political party to launch their dedicated real-time situation room and collation matrix.
          </p>
        </div>

        <div className="w-full md:w-80 relative">
          <div className="flex h-10 items-center gap-2.5 rounded-xl bg-neutral-900 border border-neutral-800 px-3.5 transition-colors focus-within:border-emerald-500">
            <Search className="size-4 shrink-0 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search party by code or name..."
              className="w-full bg-transparent text-xs text-white placeholder:text-neutral-500 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="shrink-0 p-1 text-neutral-400 hover:text-white rounded-md transition-colors cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 rounded-2xl bg-neutral-900/60 border border-neutral-800 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-800/40 bg-red-950/20 p-6 text-center text-red-300 space-y-3">
          <p className="font-semibold text-sm">Failed to load political parties</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-900/50 hover:bg-red-800 text-white rounded-xl text-xs font-semibold"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredParties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredParties.map((p) => {
            const isUserParty =
              user?.party?.short_name?.toLowerCase() === p.short_name?.toLowerCase();
            const ringColor = p.color_hex || "#10b981";

            return (
              <div
                key={p.id}
                onClick={() => {
                  if (p.short_name) {
                    navigate({
                      to: APP_URL.controlCenter.home(p.short_name),
                    });
                  }
                }}
                className={cn(
                  "group relative flex flex-col justify-between rounded-2xl bg-neutral-900/70 border border-neutral-800 p-5 transition-all duration-200 hover:border-emerald-500/50 hover:bg-neutral-900 cursor-pointer overflow-hidden",
                  isUserParty && "ring-1 ring-emerald-500/60 border-emerald-500/50 bg-neutral-900"
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="size-12 rounded-2xl border border-neutral-700 overflow-hidden bg-neutral-800 flex items-center justify-center shrink-0 shadow-inner"
                    style={{ borderLeftColor: ringColor, borderLeftWidth: "4px" }}
                  >
                    {p.logo ? (
                      <img
                        src={p.logo}
                        alt={p.short_name || "Party"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-black text-xs text-white">
                        {p.short_name}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-white truncate">
                        {p.short_name}
                      </h2>
                      {isUserParty && (
                        <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 uppercase tracking-wide">
                          Assigned Party
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">
                      {p.name}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                  <span className="text-[11px] font-mono text-neutral-500">ID #{p.id}</span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
                    <span>Open Situation Room</span>
                    <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center text-neutral-500 text-xs">
          No political parties matched &quot;{searchQuery}&quot;.
        </div>
      )}
    </div>
  );
}
