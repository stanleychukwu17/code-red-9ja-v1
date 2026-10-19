import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { StatesTable } from "#/components/Tables";
import type { StateType } from "#/components/Tables";
import { BODIES_TABS } from "./-data";
import { useState, useMemo } from "react";
import { useNigeriaStates } from "#/hooks/useNigeriaStates";
import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";
import { BodiesDropdown } from "#/components/dropdowns/BodiesDropdown";
import { Loader2 } from "lucide-react";

// Route definition for the Admin Bodies - States view
export const Route = createFileRoute("/_authenticated/bodies/states")({
  head: () => getPageHeader({ title: "Bodies - States" }),
  component: RouteComponent,
});

function RouteComponent() {
  return <StatesListComponent />;
}

function StatesListComponent() {
  // Dialog management for creating/editing geographic entities
  const { dialogProps, renderDialogs } = useBodiesDialogs();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all 37 states for Nigeria using centralized hook
  const { data: rawStates = [], isLoading, error } = useNigeriaStates();

  // Normalize API response into StateType table items
  const allStates: StateType[] = useMemo(() =>
    rawStates.map((state: any) => ({
      id: state.id,
      name: state.name,
      country_id: state.country_id ?? 161,
      latitude: state.latitude ?? 0,
      longitude: state.longitude ?? 0,
      lgas_count: state.lgas_count,
      senatorial_districts_count: state.senatorial_districts_count,
      federal_constituencies_count: state.federal_constituencies_count,
      state_constituencies_count: state.state_constituencies_count,
      wards_count: state.wards_count,
      polling_units_count: state.polling_units_count,
    })),
    [rawStates],
  );

  // Fast client-side filtering (37 static records - eliminates network debounce latency)
  const states = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return allStates;
    return allStates.filter((s) => s.name.toLowerCase().includes(trimmed));
  }, [allStates, searchQuery]);

  return (
    <Layout>
      {/* Top navigation tabs and title */}
      <PageHeader title="Bodies" activeTab="states" tabs={BODIES_TABS} />

      {/* Instant search input and action buttons (filter, dropdown actions, create) */}
      <PageSearchLayer
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        rightComponent={
          <>
            <FilterButton />
            <BodiesDropdown />
            <AddButton {...dialogProps} />
          </>
        }
      />

      {/* Main Content: Loading, Error, Empty, or Data Table */}
      {isLoading ? (
        <div className="w-full h-60 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-c-50" />
        </div>
      ) : error ? (
        <div className="w-full p-6 text-center text-red-600 font-medium">
          {error instanceof Error ? error.message : "Failed to load states"}
        </div>
      ) : states.length === 0 ? (
        <div className="w-full p-12 text-center text-c-40 font-medium bg-white rounded-2xl border border-[#dfdfdf]">
          No states found.
        </div>
      ) : (
        <StatesTable items={states} />
      )}

      {/* Create / Edit Dialog Modals */}
      {renderDialogs()}
    </Layout>
  );
}
