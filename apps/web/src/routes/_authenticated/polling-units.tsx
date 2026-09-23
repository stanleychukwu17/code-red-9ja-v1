import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppPageHeader } from "#/components/AppPageHeader";
import { getPageHeader } from "#/lib/shared/meta";
import { useAppSelector } from "@/redux/hooks";
import {
  getStatesForNigeria,
  getLGAsByState,
  getWardsByLGA,
  getPollingUnitsList,
  type StateItem,
  type LGAItem,
  type WardItem,
  type PollingUnitItem,
} from "#/lib/server/polling_units";
import {
  Search,
  MapPin,
  Vote,
  ChevronRight,
  Filter,
  CheckCircle2,
  RotateCcw,
  Building,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/polling-units")({
  head: () =>
    getPageHeader({
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
  const { data: statesRes, isLoading: statesLoading } = useQuery({
    queryKey: ["nigeria-states"],
    queryFn: () => getStatesForNigeria(),
  });

  const states: StateItem[] = statesRes?.data?.states || [];

  // 2. Fetch LGAs when state is selected
  const { data: lgasRes, isLoading: lgasLoading } = useQuery({
    queryKey: ["lgas", selectedStateId],
    queryFn: () =>
      getLGAsByState({
        data: { stateId: Number(selectedStateId) },
      }),
    enabled: Boolean(selectedStateId),
  });

  const lgas: LGAItem[] = lgasRes?.data?.lgas || [];

  // 3. Fetch Wards when LGA is selected
  const { data: wardsRes, isLoading: wardsLoading } = useQuery({
    queryKey: ["wards", selectedLgaId, selectedStateId],
    queryFn: () =>
      getWardsByLGA({
        data: {
          lgaId: Number(selectedLgaId),
          stateId: selectedStateId ? Number(selectedStateId) : undefined,
        },
      }),
    enabled: Boolean(selectedLgaId),
  });

  const wards: WardItem[] = wardsRes?.data?.wards || [];

  // 4. Fetch Polling Units based on selected location
  const {
    data: pollingUnitsRes,
    isLoading: puLoading,
    isFetching: puFetching,
  } = useQuery({
    queryKey: ["polling-units-list", selectedStateId, selectedLgaId, selectedWardId],
    queryFn: () =>
      getPollingUnitsList({
        data: {
          stateId: selectedStateId ? Number(selectedStateId) : undefined,
          localGovernmentId: selectedLgaId ? Number(selectedLgaId) : undefined,
          wardId: selectedWardId ? Number(selectedWardId) : undefined,
          limit: 100,
        },
      }),
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
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <AppPageHeader
          title="Find My Polling Unit"
          subtitle="Explore voting stations, live voter consensus, and polling reports"
        />

        {/* Search & Location Filter Box */}
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900 space-y-4">
          {/* Main search bar */}
          <div className="flex h-13 items-center gap-3 rounded-full bg-[#f4f2f4] px-5 dark:bg-neutral-800">
            <Search className="size-5 text-[#8e898b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by PU Code (e.g. 24-01-01-002), station name, or landmark..."
              className="w-full bg-transparent text-[16px] text-[#242123] outline-none placeholder:text-[#a3a0a4] dark:text-neutral-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Cascading Electoral Filters */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* State Selector */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
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
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-medium text-[#242123] outline-none transition focus:border-[#2f6f57] dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100"
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
              <label className="text-[13px] font-medium text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
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
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-medium text-[#242123] outline-none transition disabled:opacity-50 focus:border-[#2f6f57] dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100"
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
              <label className="text-[13px] font-medium text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                <MapPin className="size-3.5" /> Electoral Ward
              </label>
              <select
                value={selectedWardId}
                disabled={!selectedLgaId || wardsLoading}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : "";
                  setSelectedWardId(val);
                }}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-medium text-[#242123] outline-none transition disabled:opacity-50 focus:border-[#2f6f57] dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100"
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
            <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5 text-xs text-neutral-500">
              <span>Filters active</span>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-[#2f6f57] hover:underline font-semibold"
              >
                <RotateCcw className="size-3" /> Reset all
              </button>
            </div>
          )}
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
            {puLoading || puFetching
              ? "Fetching polling units..."
              : `Found ${filteredUnits.length} polling unit${filteredUnits.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {/* Polling Units Grid / Cards */}
        {puLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-black/5 bg-white p-5 space-y-3 dark:border-white/5 dark:bg-neutral-900"
              >
                <div className="h-5 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-4 w-1/3 rounded bg-neutral-100 dark:bg-neutral-800/60" />
                <div className="h-4 w-full rounded bg-neutral-100 dark:bg-neutral-800/40" />
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
                  className="group relative flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-5 shadow-xs transition hover:border-[#2f6f57] hover:shadow-md cursor-pointer dark:border-white/10 dark:bg-neutral-900"
                >
                  <div className="space-y-2.5">
                    {/* Header: Title & Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-[17px] font-bold text-[#161315] group-hover:text-[#2f6f57] transition-colors dark:text-neutral-100">
                        {pu.name}
                      </h3>
                      {isUserPU && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                          <CheckCircle2 className="size-3" /> My Unit
                        </span>
                      )}
                    </div>

                    {/* Hierarchy tags */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                      {puCodeDisplay && (
                        <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-mono font-semibold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                          {puCodeDisplay}
                        </span>
                      )}
                      {pu.ward_name && (
                        <span className="rounded-md bg-[#eaf2ee] px-2 py-0.5 font-medium text-[#2f6f57] dark:bg-[#1a382c] dark:text-emerald-300">
                          Ward: {pu.ward_name}
                        </span>
                      )}
                      {pu.lga_name && (
                        <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          {pu.lga_name} LGA
                        </span>
                      )}
                      {pu.state_name && (
                        <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          {pu.state_name}
                        </span>
                      )}
                    </div>

                    {/* Address / Location */}
                    {(pu.formatted_address || pu.precise_location) && (
                      <p className="text-xs text-neutral-500 flex items-start gap-1.5 pt-1 dark:text-neutral-400">
                        <MapPin className="size-3.5 shrink-0 mt-0.5 text-neutral-400" />
                        <span className="line-clamp-2">
                          {pu.formatted_address || pu.precise_location}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Card Footer Action */}
                  <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 dark:border-white/5">
                    <span className="text-xs font-medium text-neutral-500 group-hover:text-[#2f6f57] transition-colors flex items-center gap-1">
                      <Vote className="size-3.5" /> View Results & Feed
                    </span>
                    <div className="flex size-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 group-hover:bg-[#2f6f57] group-hover:text-white transition dark:bg-neutral-800 dark:text-neutral-300">
                      <ChevronRight className="size-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white py-16 text-center dark:border-neutral-800 dark:bg-neutral-900 space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-[#2f6f57] dark:bg-emerald-950/50">
              <Vote className="size-6" />
            </div>
            <h4 className="text-base font-bold text-neutral-800 dark:text-neutral-100">
              No polling units found
            </h4>
            <p className="mx-auto max-w-md text-xs text-neutral-500 dark:text-neutral-400">
              {hasActiveFilters
                ? "Try selecting a different State/LGA or clearing your search keywords."
                : "Select a State or type a polling unit keyword above to start browsing."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 rounded-full bg-neutral-100 px-4 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
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
