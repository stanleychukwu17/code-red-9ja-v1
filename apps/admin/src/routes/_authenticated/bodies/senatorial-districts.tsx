import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { DistrictsTable } from "#/components/Tables";
import type { DistrictType } from "#/components/tiles/district-tile";
import { BODIES_TABS } from "./-data";
import { useState, useMemo } from "react";
import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";
import { useSenatorialDistricts } from "#/hooks/useSenatorialDistricts";
import { BodiesDropdown } from "#/components/dropdowns/BodiesDropdown";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/bodies/senatorial-districts")({
  head: () => getPageHeader({ title: "Bodies - Senatorial Districts" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all 109 senatorial districts for Nigeria using centralized hook
  const { data: rawDistricts = [], isLoading, error } = useSenatorialDistricts();

  // Normalize API response into DistrictType table items
  const allDistricts: DistrictType[] = useMemo(() =>
    rawDistricts.map((district: any) => ({
      id: district.id,
      name: district.name,
      code: district.code,
      description: district.description ?? "",
      coalition_center: district.coalition_center ?? "",
      state_id: district.state_id,
      state_name: district.state_name,
      federal_constituencies_count: district.federal_constituencies_count,
      lgas_count: district.lgas_count,
      state_constituencies_count: district.state_constituencies_count,
      wards_count: district.wards_count,
      polling_units_count: district.polling_units_count,
    })),
    [rawDistricts],
  );

  // Fast client-side filtering across name, state, code, and description
  const districts = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return allDistricts;
    return allDistricts.filter((d) =>
      d.name.toLowerCase().includes(trimmed) ||
      (d.state_name && d.state_name.toLowerCase().includes(trimmed)) ||
      (d.code && d.code.toLowerCase().includes(trimmed)) ||
      (d.description && d.description.toLowerCase().includes(trimmed)),
    );
  }, [allDistricts, searchQuery]);

  return (
    <Layout>
      <PageHeader title="Bodies" activeTab="districts" tabs={BODIES_TABS} />
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

      {isLoading ? (
        <div className="w-full h-60 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-c-50" />
        </div>
      ) : error ? (
        <div className="w-full p-6 text-center text-red-600 font-medium">
          {error instanceof Error ? error.message : "Failed to load senatorial districts"}
        </div>
      ) : districts.length === 0 ? (
        <div className="w-full p-12 text-center text-c-40 font-medium bg-white rounded-2xl border border-[#dfdfdf]">
          No senatorial districts found.
        </div>
      ) : (
        <DistrictsTable items={districts} />
      )}
      {renderDialogs()}
    </Layout>
  );
}
