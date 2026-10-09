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
import { PartyPositionsCatalogDialog } from "#/components/dialogs/PartyPositionsCatalogDialog";
import {
  PartyPositionsActionBar,
  PartyPositionsFilterBar,
} from "./-party-positions-components";
import { PartyPositionsRosterView } from "./-party-positions-roster-view";

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

  const [searchQuery, setSearchQuery] = React.useState("");

  // Dialog States
  const [isCatalogDialogOpen, setIsCatalogDialogOpen] = React.useState(false);

  // Chapter Hierarchy Filters
  const [chapterTier, setChapterTier] = React.useState<string>("national");
  const [selectedCountryId, setSelectedCountryId] = React.useState<number | undefined>(161);
  const [selectedZonalId, setSelectedZonalId] = React.useState<number | undefined>(undefined);
  const [selectedStateId, setSelectedStateId] = React.useState<number | undefined>(undefined);
  const [selectedLgaId, setSelectedLgaId] = React.useState<number | undefined>(undefined);
  const [selectedWardId, setSelectedWardId] = React.useState<number | undefined>(undefined);

  // Appointment Type Filter
  const [appointmentTypeFilter, setAppointmentTypeFilter] = React.useState<string>("all");

  const handleTierChange = (tier: string) => {
    setChapterTier(tier);
    setSelectedCountryId(tier === "national" ? 161 : undefined);
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
        chapterTier={chapterTier}
        selectedCountryId={selectedCountryId}
        selectedZonalId={selectedZonalId}
        selectedStateId={selectedStateId}
        selectedLgaId={selectedLgaId}
        selectedWardId={selectedWardId}
        searchQuery={searchQuery}
        appointmentTypeFilter={appointmentTypeFilter}
      />

      {/* Dialogs */}
      <PartyPositionsCatalogDialog
        open={isCatalogDialogOpen}
        onClose={() => setIsCatalogDialogOpen(false)}
      />
    </Layout>
  );
}
