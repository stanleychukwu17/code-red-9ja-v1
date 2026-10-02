import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, X, ArrowRight } from "lucide-react";
import { APP_URL } from "#/lib/config";
import { getParties } from "#/lib/server/parties";
import { getPageHeader } from "#/lib/shared/meta";
import { useUser, type Party } from "#/hooks/useUser";
import { cn } from "@repo/ui/lib/utils";

export const Route = createFileRoute("/_authenticated/parties")({
  head: () =>
    getPageHeader({
      title: "Political Parties Directory | Admin",
      description: "Overview of registered political parties.",
    }),
  component: AdminPartiesComponent,
});

function AdminPartiesComponent() {
  const user = useUser();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: partiesRes, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-parties-list"],
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
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header and Search */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Political Parties Directory
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Select a political party to switch dashboards or manage administrative operations.
            </p>
          </div>

          <div className="w-full md:w-80 relative">
            <div className="flex h-11 items-center gap-2.5 rounded-xl bg-sidebar-softer px-3.5 transition-colors focus-within:border-foreground">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search parties by name or code..."
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="shrink-0 p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Loading / Error / Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-neutral-200/60 dark:bg-neutral-900 animate-pulse border border-border/40"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center text-destructive space-y-3">
            <p className="font-semibold text-sm">Failed to load parties</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-destructive text-white rounded-xl text-xs font-semibold"
            >
              Try Again
            </button>
          </div>
        ) : filteredParties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredParties.map((p) => {
              const isCurrentParty = user?.party?.short_name?.toLowerCase() === p.short_name?.toLowerCase();
              const ringColor = p.color_hex || "#4ade80";

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (p.short_name) {
                      navigate({
                        to: APP_URL.partyHome,
                        params: { partyShortName: p.short_name },
                      });
                    }
                  }}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl bg-sidebar-softer/50 p-5 transition-all duration-200 hover:shadow-md hover:border-foreground/40 cursor-pointer overflow-hidden",
                    isCurrentParty && "ring-2 ring-primary/60 border-primary"
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Logo */}
                    <div
                      className="size-13 rounded-full border-2 border-background overflow-hidden bg-muted flex items-center justify-center shrink-0 shadow-sm"
                      style={{ boxShadow: `0 0 0 2px ${ringColor}` }}
                    >
                      {p.logo ? (
                        <img
                          src={p.logo}
                          alt={p.short_name || "Party"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-bold text-xs text-foreground">
                          {p.short_name}
                        </span>
                      )}
                    </div>

                    <div className=" flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-foreground truncate">
                          {p.short_name}
                        </h2>
                        {isCurrentParty && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white text-primary uppercase tracking-wide">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {p.name}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 flex items-center justify-end text-[10px] lg:text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-semibold text-foreground group-hover:translate-x-0.5 transition-transform duration-150">
                        <span>Open Dashboard</span>
                        <ArrowRight className="size-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No political parties found matching &quot;{searchQuery}&quot;.
          </div>
        )}
      </div>
    </div>
  );
}
