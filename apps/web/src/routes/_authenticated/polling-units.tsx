import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppPageHeader } from "#/components/AppPageHeader";
import { getPageHeader } from "#/lib/shared/meta";
import { useAppSelector } from "@/redux/hooks";
import { useNigeriaStates, useLGAs, useWards } from "#/hooks";
import { getPollingUnitsList, type PollingUnitItem } from "#/lib/server/polling_units";
import { Search, MapPin, Vote, ChevronRight, Filter, CheckCircle2, RotateCcw, Building } from "lucide-react";

export const Route = createFileRoute("/_authenticated/polling-units")({
  head: () => getPageHeader({
    title: "Find My Polling Unit",
    description: "Search and explore official polling units across Nigeria.",
  }),
  component: PollingUnitsPage,
});

function PollingUnitsPage() {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const userPuId = (user as any)?.polling_unit_id;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStateId, setSelectedStateId] = useState<number | "">("");
  const [selectedLgaId, setSelectedLgaId] = useState<number | "">("");
  const [selectedWardId, setSelectedWardId] = useState<number | "">("");

  // 1. Fetch States
  const { data: states = [], isLoading: statesLoading } = useNigeriaStates();

  // 2. Fetch LGAs when state is selected
  const { data: lgas = [], isLoading: lgasLoading } = useLGAs(selectedStateId);

  // 3. Fetch Wards when LGA is selected
  const { data: wards = [], isLoading: wardsLoading } = useWards(selectedLgaId, selectedStateId);

  // 4. Fetch Polling Units based on selected location (requires ward selection)
  const { data: pollingUnitsRes, isLoading: puLoading, isFetching: puFetching } = useQuery({
    queryKey: ["polling-units-list", selectedWardId],
    queryFn: () =>
      getPollingUnitsList({
        data: {
          wardId: Number(selectedWardId),
          localGovernmentId: selectedLgaId ? Number(selectedLgaId) : undefined,
          stateId: selectedStateId ? Number(selectedStateId) : undefined,
        },
      }),
    enabled: Boolean(selectedWardId),
    staleTime: Infinity,
  });

  const pollingUnits: PollingUnitItem[] =
    pollingUnitsRes?.data?.polling_units || [];

  // 5. Client-side search filtering
  const filteredUnits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pollingUnits;

    return pollingUnits.filter((pu) => {
      const matchName = pu.name?.toLowerCase().includes(q);
      const matchCode = pu.pu_code?.toLowerCase().includes(q) || pu.code?.toLowerCase().includes(q);
      const matchAddress = pu.formatted_address?.toLowerCase().includes(q) || pu.precise_location?.toLowerCase().includes(q);
      const matchWard = pu.ward_name?.toLowerCase().includes(q);
      const matchLga = pu.lga_name?.toLowerCase().includes(q);
      return matchName || matchCode || matchAddress || matchWard || matchLga;
    });
  }, [pollingUnits, searchQuery]);

  const resetFilters = () => {
    setSelectedStateId("");
    setSelectedLgaId("");
    setSelectedWardId("");
    setSearchQuery("");
  };

  const hasActiveFilters = Boolean(
    selectedStateId || selectedLgaId || selectedWardId || searchQuery,
  );

  return (
    <div className="flex-1 px-4 pb-12 pt-6 md:px-12 md:pt-7">
      <div className="mx-auto flex w-full max-w-300 flex-col gap-6">
        <AppPageHeader
          title="Find My Polling Unit"
          subtitle="Explore voting stations, live voter consensus, and polling reports"
        />

        {/* Search & Location Filter Box */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
          {/* Main search bar */}
          <div className="flex h-13 items-center gap-3 rounded-full bg-muted px-5">
            <Search className="size-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by PU Code (e.g. 24-01-01-002), station name, or landmark..."
              className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Cascading Electoral Filters */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* State Selector */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground flex items-center gap-1.5">
                <Building className="size-3.5" /> State
              </label>
              <select
                value={selectedStateId}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : "";
                  setSelectedStateId(val);
                  setSelectedLgaId("");
                  setSelectedWardId("");
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary dark:bg-card"
              >
                <option value="">All States</option>
                {states.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            {/* LGA Selector */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground flex items-center gap-1.5">
                <Filter className="size-3.5" /> Local Government (LGA)
              </label>
              <select
                value={selectedLgaId}
                disabled={!selectedStateId || lgasLoading}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : "";
                  setSelectedLgaId(val);
                  setSelectedWardId("");
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground outline-none transition disabled:opacity-50 focus:border-primary focus:ring-1 focus:ring-primary dark:bg-card"
              >
                <option value="">
                  {!selectedStateId
                    ? "Select State first"
                    : lgasLoading
                      ? "Loading LGAs..."
                      : "All LGAs"}
                </option>
                {lgas.map((lga) => (
                  <option key={lga.id} value={lga.id}>
                    {lga.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Ward Selector */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground flex items-center gap-1.5">
                <MapPin className="size-3.5" /> Electoral Ward
              </label>
              <select
                value={selectedWardId}
                disabled={!selectedLgaId || wardsLoading}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : "";
                  setSelectedWardId(val);
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground outline-none transition disabled:opacity-50 focus:border-primary focus:ring-1 focus:ring-primary dark:bg-card"
              >
                <option value="">
                  {!selectedLgaId
                    ? "Select LGA first"
                    : wardsLoading
                      ? "Loading Wards..."
                      : "All Wards"}
                </option>
                {wards.map((ward) => (
                  <option key={ward.id} value={ward.id}>
                    {ward.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Status & Reset */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-1 border-t border-border text-xs text-muted-foreground">
              <span>Filters active</span>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
              >
                <RotateCcw className="size-3" /> Reset all
              </button>
            </div>
          )}
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-muted-foreground">
            {puLoading || puFetching
              ? "Fetching polling units..."
              : selectedWardId
                ? `Found ${filteredUnits.length} polling unit${filteredUnits.length === 1 ? "" : "s"}`
                : "Select an Electoral Ward to browse stations"}
          </p>
        </div>

        {/* Polling Units Grid / Cards */}
        {puLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-border bg-card p-5 space-y-3"
              >
                <div className="h-5 w-2/3 rounded bg-muted" />
                <div className="h-4 w-1/3 rounded bg-muted/60" />
                <div className="h-4 w-full rounded bg-muted/40" />
              </div>
            ))}
          </div>
        ) : filteredUnits.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredUnits.map((pu) => {
              const isUserPU = userPuId && Number(userPuId) === pu.id;
              const puCodeDisplay = pu.pu_code || pu.code;

              return (
                <div
                  key={pu.id}
                  onClick={() =>
                    navigate({
                      to: "/polling-unit/$pollingUnitId",
                      params: { pollingUnitId: String(pu.id) },
                    })
                  }
                  className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs transition hover:border-primary hover:shadow-md cursor-pointer"
                >
                  <div className="space-y-2.5">
                    {/* Header: Title & Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-[17px] font-bold text-card-foreground group-hover:text-primary transition-colors">
                        {pu.name}
                      </h3>
                      {isUserPU && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary shrink-0 border border-primary/20">
                          <CheckCircle2 className="size-3" /> My Unit
                        </span>
                      )}
                    </div>

                    {/* Hierarchy tags */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {puCodeDisplay && (
                        <span className="rounded-md bg-muted px-2 py-0.5 font-mono font-semibold text-foreground">
                          {puCodeDisplay}
                        </span>
                      )}
                      {pu.ward_name && (
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary">
                          Ward: {pu.ward_name}
                        </span>
                      )}
                      {pu.lga_name && (
                        <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                          {pu.lga_name} LGA
                        </span>
                      )}
                      {pu.state_name && (
                        <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                          {pu.state_name}
                        </span>
                      )}
                    </div>

                    {/* Address / Location */}
                    {(pu.formatted_address || pu.precise_location) && (
                      <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-1">
                        <MapPin className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                        <span className="line-clamp-2">
                          {pu.formatted_address || pu.precise_location}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Card Footer Action */}
                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                      <Vote className="size-3.5" /> View Results & Feed
                    </span>
                    <div className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition">
                      <ChevronRight className="size-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Vote className="size-6" />
            </div>
            <h4 className="text-base font-bold text-card-foreground">
              {selectedWardId ? "No polling units found" : "Select an Electoral Ward"}
            </h4>
            <p className="mx-auto max-w-md text-xs text-muted-foreground">
              {selectedWardId
                ? hasActiveFilters && searchQuery
                  ? "No polling units in this ward match your search keywords. Try adjusting your query."
                  : "No polling units are registered under this ward."
                : "Select your State, Local Government (LGA), and Electoral Ward above to view all official polling stations."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 rounded-full bg-muted px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
