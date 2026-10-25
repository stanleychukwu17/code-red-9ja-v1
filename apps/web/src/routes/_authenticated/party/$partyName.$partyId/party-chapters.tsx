import { useState, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useDebounceValue } from "usehooks-ts";
import { Search, MapPin, Building2, Landmark, Globe, ChevronRight, ArrowRight, CheckCircle2, Layers } from "lucide-react";
import { Input } from "@repo/ui/components/input";
import { HeaderAccent } from "@repo/ui/components/header-accent";
import { partyProfileQueryOptions } from "../$partyName.$partyId";
import { useNigeriaStates, useLGAs, useWards } from "#/hooks";
import type { StateItem, LGAItem, WardItem } from "#/lib/server/polling_units";

export const Route = createFileRoute("/_authenticated/party/$partyName/$partyId/party-chapters")({
  component: PartyChaptersTabComponent,
});

type ChapterTierFilter = "all" | "national" | "state" | "lga" | "ward";

function PartyChaptersTabComponent() {
  const { partyName, partyId } = Route.useParams();
  const search = Route.useSearch() as { chapterId?: number };
  const currentChapterId = search?.chapterId;
  const navigate = useNavigate();

  // Retrieve current active chapter metadata from parent profile query cache
  const { data: profileRes } = useQuery(
    partyProfileQueryOptions(partyId, partyName, currentChapterId),
  );

  const activeChapterType = profileRes?.success
    ? profileRes.data.chapter_type || "national"
    : "national";
  const activeChapterGeoName = profileRes?.success
    ? profileRes.data.chapter_geo_name
    : undefined;
  const activeChapterId = profileRes?.success
    ? profileRes.data.chapter?.id
    : undefined;

  // Tier Filter and Search
  const [selectedTier, setSelectedTier] = useState<ChapterTierFilter>("state");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 250);

  // Cascading selections when drilling into LGA or Ward
  const [selectedState, setSelectedState] = useState<StateItem | null>(null);
  const [selectedLga, setSelectedLga] = useState<LGAItem | null>(null);

  // 1. Fetch States (Nigeria)
  const { data: states = [], isLoading: statesLoading } = useNigeriaStates();

  // 2. Fetch LGAs when State is selected (or when tier is LGA/Ward)
  const { data: lgas = [], isLoading: lgasLoading } = useLGAs(selectedState?.id, {
    enabled: Boolean(selectedState?.id),
  });

  // 3. Fetch Wards when LGA is selected
  const { data: wards = [], isLoading: wardsLoading } = useWards(
    selectedLga?.id,
    selectedState?.id,
    { enabled: Boolean(selectedLga?.id) },
  );

  const tierFilters: { id: ChapterTierFilter; label: string; count?: number }[] = [
    { id: "all", label: "All Levels" },
    { id: "national", label: "National" },
    { id: "state", label: "State Chapters", count: 37 },
    { id: "lga", label: "LGA Chapters", count: 774 },
    { id: "ward", label: "Ward Chapters", count: 8813 },
  ];

  // Helper to switch active viewing chapter across the whole party
  const handleSwitchChapter = (targetChapterId?: number) => {
    navigate({
      to: "/party/$partyName/$partyId/leadership",
      params: { partyName, partyId },
      search: targetChapterId ? { chapterId: targetChapterId } : {},
    });
  };

  // Filter States by search
  const filteredStates = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return states;
    const term = debouncedSearchQuery.toLowerCase().trim();
    return states.filter((s) => s.name.toLowerCase().includes(term));
  }, [states, debouncedSearchQuery]);

  // Filter LGAs by search
  const filteredLgas = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return lgas;
    const term = debouncedSearchQuery.toLowerCase().trim();
    return lgas.filter((l) => l.name.toLowerCase().includes(term));
  }, [lgas, debouncedSearchQuery]);

  // Filter Wards by search
  const filteredWards = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return wards;
    const term = debouncedSearchQuery.toLowerCase().trim();
    return wards.filter((w) => w.name.toLowerCase().includes(term));
  }, [wards, debouncedSearchQuery]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="relative inline-block">
            <h2 className="relative text-xl sm:text-2xl font-bold tracking-tight text-foreground z-2">
              {partyName.toUpperCase()} Chapters Directory
            </h2>
            <HeaderAccent />
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Browse and explore registered chapters across Nigeria from national and state headquarters
            down to local governments and electoral wards.
          </p>
        </div>

        {/* Current Active Chapter Indicator */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-card border border-border/60 rounded-2xl p-2.5 px-4 shadow-2xs">
          <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-xs">
            <span className="text-muted-foreground">Currently Viewing: </span>
            <span className="font-semibold text-foreground capitalize">
              {activeChapterType === "national"
                ? "National Headquarters"
                : `${activeChapterGeoName || ""} (${activeChapterType})`}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Navigation Tabs */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-sidebar-mobile/40 dark:bg-card/40 p-3 sm:p-4 rounded-2xl border border-border/40">
        {/* Tier filter pill buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {tierFilters.map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => {
                setSelectedTier(tier.id);
                setSearchQuery("");
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${selectedTier === tier.id
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              <span>{tier.label}</span>
              {tier.count !== undefined && (
                <span
                  className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-md ${selectedTier === tier.id
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                    }`}
                >
                  {tier.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              selectedTier === "lga"
                ? "Search LGAs..."
                : selectedTier === "ward"
                  ? "Search Wards..."
                  : "Search by state or city..."
            }
            className="pl-10 h-10 bg-card border-border/60 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Cascading Geographic Breadcrumb Bar for LGA and Ward tiers */}
      {(selectedTier === "lga" || selectedTier === "ward") && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/40 rounded-2xl border border-border/50 text-xs">
          <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
            <Layers className="size-3.5" />
            <span>Select Hierarchy:</span>
          </span>

          {/* State selector */}
          <select
            value={selectedState?.id || ""}
            onChange={(e) => {
              const val = Number(e.target.value);
              const found = states.find((s) => s.id === val) || null;
              setSelectedState(found);
              setSelectedLga(null);
            }}
            className="h-9 px-3 font-medium rounded-xl border border-border/60 bg-card text-foreground cursor-pointer focus:outline-hidden"
          >
            <option value="">-- Choose a State --</option>
            {states.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} State
              </option>
            ))}
          </select>

          {/* LGA selector for Ward tier */}
          {selectedTier === "ward" && (
            <select
              value={selectedLga?.id || ""}
              disabled={!selectedState}
              onChange={(e) => {
                const val = Number(e.target.value);
                const found = lgas.find((l) => l.id === val) || null;
                setSelectedLga(found);
              }}
              className="h-9 px-3 font-medium rounded-xl border border-border/60 bg-card text-foreground cursor-pointer disabled:opacity-50 focus:outline-hidden"
            >
              <option value="">
                {selectedState ? "-- Choose an LGA --" : "Select a State first"}
              </option>
              {lgas.map((lga) => (
                <option key={lga.id} value={lga.id}>
                  {lga.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Main Content Sections Based on Selected Tier */}

      {/* 1. NATIONAL CHAPTER BANNER CARD (Show if 'all' or 'national' is selected) */}
      {(selectedTier === "all" || selectedTier === "national") && (
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-sidebar-mobile/80 via-card to-sidebar-mobile/40 border border-border/60 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                <Landmark className="size-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground uppercase tracking-wider">
                    Headquarters
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    Federal Republic of Nigeria
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mt-1.5">
                  {partyName.toUpperCase()} National Executive Chapter
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
                  Central governing body overseeing nationwide chapters, constitutional matters,
                  national conventions, and executive leadership.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
              <Link
                to="/party/$partyName/$partyId/leadership"
                params={{ partyName, partyId }}
                search={{}}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity"
              >
                <span>View Leadership</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2. STATE CHAPTERS GRID */}
      {(selectedTier === "all" || selectedTier === "state") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              <span>State Executive Chapters ({filteredStates.length})</span>
            </h3>
            {selectedTier === "all" && (
              <button
                type="button"
                onClick={() => setSelectedTier("state")}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View all 37 States</span>
                <ChevronRight className="size-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStates.map((state) => {
              const isCurrent =
                activeChapterType === "state" &&
                activeChapterGeoName?.toLowerCase() === state.name.toLowerCase();

              return (
                <div
                  key={state.id}
                  className={`group rounded-2xl border p-5 transition-all flex flex-col justify-between ${isCurrent
                    ? "bg-primary/5 border-primary/40 shadow-xs"
                    : "bg-card border-border/60 hover:border-primary/40 hover:bg-muted/20"
                    }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="size-10 rounded-xl bg-muted/60 flex items-center justify-center text-foreground font-bold text-xs group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        {state.name.slice(0, 2).toUpperCase()}
                      </div>
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5" />
                          <span>Active View</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground font-medium">
                          State Tier
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {state.name} State Chapter
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="size-3 shrink-0" />
                      <span>{state.name} State, Nigeria</span>
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedState(state);
                        setSelectedTier("lga");
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <span>Explore LGAs</span>
                      <ChevronRight className="size-3" />
                    </button>

                    <Link
                      to="/party/$partyName/$partyId/leadership"
                      params={{ partyName, partyId }}
                      search={{}}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>View</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. LGA CHAPTERS SECTION */}
      {selectedTier === "lga" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                <span>
                  {selectedState
                    ? `${selectedState.name} State LGAs (${filteredLgas.length})`
                    : "Select a State above to view local government chapters"}
                </span>
              </h3>
              {selectedState && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Showing Local Government Areas registered in {selectedState.name} State.
                </p>
              )}
            </div>
          </div>

          {!selectedState ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 p-12 text-center">
              <div className="mx-auto size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                <MapPin className="size-6" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">Select a State</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Choose any state from the selector above to browse all LGA party chapters in that region.
              </p>
            </div>
          ) : filteredLgas.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card/40 p-10 text-center text-muted-foreground text-xs">
              No LGAs found matching "{searchQuery}" in {selectedState.name} State.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredLgas.map((lga) => (
                <div
                  key={lga.id}
                  className="rounded-2xl border border-border/60 bg-card p-5 hover:border-primary/40 hover:bg-muted/20 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                      LGA Chapter
                    </span>
                    <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors mt-1">
                      {lga.name} Chapter
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Building2 className="size-3 shrink-0" />
                      <span>{selectedState.name} State</span>
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLga(lga);
                        setSelectedTier("ward");
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <span>Explore Wards</span>
                      <ChevronRight className="size-3" />
                    </button>

                    <Link
                      to="/party/$partyName/$partyId/leadership"
                      params={{ partyName, partyId }}
                      search={{}}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>View</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. WARD CHAPTERS SECTION */}
      {selectedTier === "ward" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Globe className="size-4 text-primary" />
              <span>
                {selectedLga
                  ? `${selectedLga.name} Electoral Wards (${filteredWards.length})`
                  : "Select a State and LGA above to explore electoral ward chapters"}
              </span>
            </h3>
            {selectedLga && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Showing grassroots electoral ward chapters in {selectedLga.name} LGA,{" "}
                {selectedState?.name} State.
              </p>
            )}
          </div>

          {!selectedState || !selectedLga ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 p-12 text-center">
              <div className="mx-auto size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                <Globe className="size-6" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                {!selectedState ? "Select a State" : "Select an LGA"}
              </h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {!selectedState
                  ? "Choose a state and LGA from the selectors above to explore grassroots ward chapters."
                  : `Choose an LGA in ${selectedState.name} State to view its ward chapters.`}
              </p>
            </div>
          ) : filteredWards.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card/40 p-10 text-center text-muted-foreground text-xs">
              No electoral wards found matching "{searchQuery}" in {selectedLga.name} LGA.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredWards.map((ward) => (
                <div
                  key={ward.id}
                  className="rounded-2xl border border-border/60 bg-card p-5 hover:border-primary/40 hover:bg-muted/20 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Ward Chapter
                    </span>
                    <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors mt-1">
                      {ward.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="size-3 shrink-0" />
                      <span>{selectedLga.name}, {selectedState.name}</span>
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Grassroots Tier</span>
                    <Link
                      to="/party/$partyName/$partyId/leadership"
                      params={{ partyName, partyId }}
                      search={{}}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>View</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PartyChaptersTabComponent;
