/**
 * @file Party Positions Roster Page
 * @description Roster displaying party officials, executive positions, and leadership offices.
 * Lists national, zonal, state, LGA, and ward officials with auto-prefixed display titles,
 * chapter tier filtering, position catalog viewer, and appointment workflow.
 */

import * as React from "react";
import { Layout, PageHeader } from "@repo/ui/components/custom/AdminLayouts";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute } from "@tanstack/react-router";
import { getPartyAdminsTabs } from "./-data";
import { useUserParty } from "#/hooks/useUserParty";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounceValue } from "usehooks-ts";
import { AssignPositionDialog } from "#/components/dialogs/AssignPositionDialog";
import { PartyPositionsCatalogDialog } from "#/components/dialogs/PartyPositionsCatalogDialog";
import {
  PartyPositionsActionBar,
  PartyPositionsFilterBar,
  PartyPositionsRosterView,
} from "./-party-positions-components";
import {
  getPartyOfficials,
  vacatePartyOfficial,
  type PartyOfficialItem,
} from "#/lib/server/parties";
import { toast } from "sonner";

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
  const [selectedCountryId, setSelectedCountryId] = React.useState<number | undefined>(undefined);
  const [selectedZonalId, setSelectedZonalId] = React.useState<number | undefined>(undefined);
  const [selectedStateId, setSelectedStateId] = React.useState<number | undefined>(undefined);
  const [selectedLgaId, setSelectedLgaId] = React.useState<number | undefined>(undefined);
  const [selectedWardId, setSelectedWardId] = React.useState<number | undefined>(undefined);

  // Appointment Type Filter
  const [appointmentTypeFilter, setAppointmentTypeFilter] = React.useState<string>("all");

  // Fetch Officials
  const { data: officialsRes, isLoading } = useQuery({
    queryKey: [
      "partyOfficials",
      party?.id,
      chapterTier,
      selectedCountryId,
      selectedZonalId,
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
          countryId: selectedCountryId,
          zonalId: selectedZonalId,
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
    setSelectedCountryId(undefined);
    setSelectedZonalId(undefined);
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
      <PartyPositionsActionBar
        chapterTier={chapterTier}
        onTierChange={handleTierChange}
        selectedCountryId={selectedCountryId}
        onCountryChange={setSelectedCountryId}
        selectedZonalId={selectedZonalId}
        onZonalChange={setSelectedZonalId}
        selectedStateId={selectedStateId}
        onStateChange={setSelectedStateId}
        selectedLgaId={selectedLgaId}
        onLgaChange={setSelectedLgaId}
        selectedWardId={selectedWardId}
        onWardChange={setSelectedWardId}
        onOpenCatalog={() => setIsCatalogDialogOpen(true)}
        onOpenAssign={() => setIsAssignDialogOpen(true)}
      />

      {/* Search Bar + Appointment Filter */}
      <PartyPositionsFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        appointmentTypeFilter={appointmentTypeFilter}
        onAppointmentTypeChange={setAppointmentTypeFilter}
      />

      {/* Main Officials Roster */}
      <PartyPositionsRosterView
        isLoading={isLoading}
        officials={officials}
        onVacateOfficial={handleVacateOfficial}
        onOpenAssign={() => setIsAssignDialogOpen(true)}
      />

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
