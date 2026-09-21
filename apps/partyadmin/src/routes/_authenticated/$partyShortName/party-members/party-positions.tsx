/**
 * @file Party Positions Roster Page
 * @description Roster displaying party officials, executive positions, and leadership offices.
 * Lists national, zonal, state, LGA, and ward officials with auto-prefixed display titles,
 * chapter tier filtering, position catalog viewer, and appointment workflow.
 */

import * as React from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
} from "@repo/ui/components/custom/AdminLayouts";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute } from "@tanstack/react-router";
import { getPartyAdminsTabs } from "./-data";
import { useUserParty } from "#/hooks/useUserParty";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounceValue } from "usehooks-ts";
import { Button } from "@repo/ui/components/button";
import {
  PartyPositionTableHeader,
  PartyPositionTableTile,
} from "#/components/tiles/party-position-tile";
import { AssignPositionDialog } from "#/components/dialogs/AssignPositionDialog";
import { PartyPositionsCatalogDialog } from "#/components/dialogs/PartyPositionsCatalogDialog";
import {
  getPartyOfficials,
  vacatePartyOfficial,
  type PartyOfficialItem,
} from "#/lib/server/parties";
import { getStates } from "#/lib/server/countries";
import { getLGAs, getWards } from "#/lib/server/applications";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  BookOpen,
  UserPlus,
  Filter,
  MapPin,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/party-members/party-positions",
)({
  head: () => getPageHeader({ title: "Party positions" }),
  component: RouteComponent,
});

/**
 * Party Positions Page Component
 * Renders party officials holding executive leadership and administration positions across chapter tiers.
 */
function RouteComponent() {
  const { partyShortName } = Route.useParams();
  const { party } = useUserParty();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 400);

  // Dialog States
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [isCatalogDialogOpen, setIsCatalogDialogOpen] = React.useState(false);

  // Chapter Hierarchy Filters
  const [chapterTier, setChapterTier] = React.useState<string>("all");
  const [selectedStateId, setSelectedStateId] = React.useState<number | undefined>(undefined);
  const [selectedLgaId, setSelectedLgaId] = React.useState<number | undefined>(undefined);
  const [selectedWardId, setSelectedWardId] = React.useState<number | undefined>(undefined);

  // Appointment Type Filter
  const [appointmentTypeFilter, setAppointmentTypeFilter] = React.useState<string>("all");

  // Fetch States for Filter
  const { data: statesRes } = useQuery({
    queryKey: ["states", 161],
    queryFn: () => getStates({ data: { countryId: 161, limit: 50 } }),
    enabled: ["state", "lga", "ward"].includes(chapterTier),
  });
  const statesList = Array.isArray(statesRes?.data?.states) ? statesRes.data.states : [];

  // Fetch LGAs for Filter
  const { data: lgasRes } = useQuery({
    queryKey: ["lgas", selectedStateId],
    queryFn: () => getLGAs({ data: { stateId: selectedStateId } }),
    enabled: ["lga", "ward"].includes(chapterTier) && !!selectedStateId,
  });
  const lgasList = Array.isArray(lgasRes?.data) ? lgasRes.data : [];

  // Fetch Wards for Filter
  const { data: wardsRes } = useQuery({
    queryKey: ["wards", selectedLgaId],
    queryFn: () => getWards({ data: { lga_id: selectedLgaId } }),
    enabled: chapterTier === "ward" && !!selectedLgaId,
  });
  const wardsList = Array.isArray(wardsRes?.data) ? wardsRes.data : [];

  // Fetch Officials
  const { data: officialsRes, isLoading } = useQuery({
    queryKey: [
      "partyOfficials",
      party?.id,
      chapterTier,
      selectedStateId,
      selectedLgaId,
      selectedWardId,
      debouncedSearchQuery,
    ],
    queryFn: () =>
      getPartyOfficials({
        data: {
          partyId: party!.id!,
          chapterType: chapterTier !== "all" ? chapterTier : undefined,
          stateId: selectedStateId,
          lgaId: selectedLgaId,
          wardId: selectedWardId,
          search: debouncedSearchQuery.trim() || undefined,
          status: "active",
        },
      }),
    enabled: !!party?.id,
  });

  const rawOfficials: PartyOfficialItem[] = officialsRes?.data?.officials || [];

  // Client-side filter by appointment type if selected
  const officials = React.useMemo(() => {
    if (appointmentTypeFilter === "all") return rawOfficials;
    return rawOfficials.filter(
      (o) => o.appointment_type.toLowerCase() === appointmentTypeFilter.toLowerCase(),
    );
  }, [rawOfficials, appointmentTypeFilter]);

  // Handle Vacate Office
  const handleVacateOfficial = async (official: PartyOfficialItem) => {
    const confirmVacate = window.confirm(
      `Are you sure you want to vacate ${official.display_title || official.position_name} for ${official.first_name} ${official.last_name}?`,
    );
    if (!confirmVacate || !party?.id) return;

    try {
      const res = await vacatePartyOfficial({
        data: {
          partyId: party.id,
          assignmentId: official.assignment_id,
        },
      });
      if (res?.success) {
        toast.success("Office vacated successfully");
        queryClient.invalidateQueries({ queryKey: ["partyOfficials"] });
      } else {
        toast.error(res?.message || "Failed to vacate office");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to vacate office");
    }
  };

  const handleTierChange = (tier: string) => {
    setChapterTier(tier);
    setSelectedStateId(undefined);
    setSelectedLgaId(undefined);
    setSelectedWardId(undefined);
  };

  return (
    <Layout>
      <PageHeader
        title="Party members"
        activeTab="party-positions"
        tabs={getPartyAdminsTabs(partyShortName)}
      />

      {/* Top Action Buttons & Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-4">
        {/* Tier Tabs Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-[#f3f4f6] rounded-xl overflow-x-auto">
          {[
            { key: "all", label: "All Tiers" },
            { key: "national", label: "National" },
            { key: "zonal", label: "Zonal" },
            { key: "state", label: "State" },
            { key: "lga", label: "LGA" },
            { key: "ward", label: "Ward" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTierChange(tab.key)}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition whitespace-nowrap ${
                chapterTier === tab.key
                  ? "bg-white text-c-90 shadow-xs"
                  : "text-c-60 hover:text-c-90"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action Buttons: Catalog & Assign */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCatalogDialogOpen(true)}
            className="h-10 px-3.5 rounded-xl border-[#d1d5db] text-c-70 hover:bg-[#fafafa] text-[13px] font-medium flex items-center gap-2"
          >
            <BookOpen className="size-4 text-c-50" />
            <span>Position Catalog</span>
          </Button>

          <Button
            type="button"
            onClick={() => setIsAssignDialogOpen(true)}
            className="h-10 px-4 rounded-xl bg-[#ff9a3c] hover:bg-[#e0832c] text-white text-[13px] font-medium flex items-center gap-2 shadow-xs"
          >
            <UserPlus className="size-4" />
            <span>Assign Position</span>
          </Button>
        </div>
      </div>

      {/* Dynamic Geographic Entity Filters for State / LGA / Ward */}
      {["state", "lga", "ward"].includes(chapterTier) && (
        <div className="flex flex-wrap items-center gap-3 p-3 mb-4 bg-white rounded-xl border border-[#ebebeb]">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-c-60 mr-1">
            <MapPin className="size-4 text-c-40" />
            <span>Chapter scope:</span>
          </div>

          <select
            value={selectedStateId || ""}
            onChange={(e) => {
              setSelectedStateId(e.target.value ? Number(e.target.value) : undefined);
              setSelectedLgaId(undefined);
              setSelectedWardId(undefined);
            }}
            className="h-9 px-3 text-[13px] rounded-lg border border-[#d1d5db] bg-white focus:outline-none focus:ring-1 focus:ring-[#ff9a3c]"
          >
            <option value="">All States</option>
            {statesList.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {["lga", "ward"].includes(chapterTier) && selectedStateId && (
            <select
              value={selectedLgaId || ""}
              onChange={(e) => {
                setSelectedLgaId(e.target.value ? Number(e.target.value) : undefined);
                setSelectedWardId(undefined);
              }}
              className="h-9 px-3 text-[13px] rounded-lg border border-[#d1d5db] bg-white focus:outline-none focus:ring-1 focus:ring-[#ff9a3c]"
            >
              <option value="">All LGAs</option>
              {lgasList.map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}

          {chapterTier === "ward" && selectedLgaId && (
            <select
              value={selectedWardId || ""}
              onChange={(e) =>
                setSelectedWardId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="h-9 px-3 text-[13px] rounded-lg border border-[#d1d5db] bg-white focus:outline-none focus:ring-1 focus:ring-[#ff9a3c]"
            >
              <option value="">All Wards</option>
              {wardsList.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Search Bar + Appointment Filter */}
      <PageSearchLayer
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        ariaLabel="Search party positions"
        placeholder="Search by official name, @username, or display title..."
        rightComponent={
          <div className="flex items-center gap-2">
            <select
              value={appointmentTypeFilter}
              onChange={(e) => setAppointmentTypeFilter(e.target.value)}
              className="h-11 px-3.5 text-[14px] rounded-xl border border-[#dfdfdf] bg-white text-c-70 focus:outline-none"
            >
              <option value="all">All Appointment Types</option>
              <option value="substantive">Substantive</option>
              <option value="acting">Acting</option>
              <option value="caretaker">Caretaker</option>
              <option value="interim">Interim</option>
            </select>
          </div>
        }
      />

      {/* Main Officials Roster */}
      {isLoading ? (
        <div className="w-full p-16 flex flex-col items-center justify-center gap-3 text-c-50 bg-white rounded-2xl border border-[#dfdfdf]">
          <Loader2 className="size-6 animate-spin text-[#ff9a3c]" />
          <p className="text-[14px]">Loading chapter officials...</p>
        </div>
      ) : officials.length === 0 ? (
        <div className="w-full p-16 text-center text-c-50 font-medium bg-white rounded-2xl border border-[#dfdfdf] space-y-3">
          <p className="text-[16px] text-c-70">No party officials found.</p>
          <p className="text-[13px] text-c-40 max-w-md mx-auto">
            No officials have been appointed to positions matching your selected tier and filters.
            Click &quot;Assign Position&quot; to appoint an official.
          </p>
          <div className="pt-2">
            <Button
              onClick={() => setIsAssignDialogOpen(true)}
              className="bg-[#ff9a3c] hover:bg-[#e0832c] text-white text-[13px]"
            >
              <UserPlus className="size-4 mr-2" />
              Assign an Official
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-2xl border border-[#dfdfdf] bg-white">
          <PartyPositionTableHeader />
          <div className="divide-y divide-[#efefef]">
            {officials.map((official) => (
              <PartyPositionTableTile
                key={official.assignment_id}
                official={official}
                onVacate={handleVacateOfficial}
              />
            ))}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AssignPositionDialog
        open={isAssignDialogOpen}
        onClose={() => setIsAssignDialogOpen(false)}
        partyId={party?.id}
      />

      <PartyPositionsCatalogDialog
        open={isCatalogDialogOpen}
        onClose={() => setIsCatalogDialogOpen(false)}
        partyId={party?.id}
      />
    </Layout>
  );
}
