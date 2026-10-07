/**
 * @file Party Positions Page Subcomponents
 * @description Modular components for the Party Positions roster page:
 * - PartyPositionsActionBar: Tier navigation tabs and action buttons
 * - PartyPositionsFilterBar: Search layer and appointment type filter dropdown
 * - PartyPositionsRosterView: Loading, empty, and populated table views
 */

import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { PageSearchLayer } from "@repo/ui/components/custom/AdminLayouts";
import { PartyTierNav } from "./-party-tier-nav";
import { BookOpen } from "lucide-react";

interface PartyPositionsActionBarProps {
  chapterTier: string;
  onTierChange: (tier: string) => void;
  selectedCountryId?: number;
  onCountryChange: (id?: number) => void;
  selectedZonalId?: number;
  onZonalChange: (id?: number) => void;
  selectedStateId?: number;
  onStateChange: (id?: number) => void;
  selectedLgaId?: number;
  onLgaChange: (id?: number) => void;
  selectedWardId?: number;
  onWardChange: (id?: number) => void;
  onOpenCatalog: () => void;
}

/**
 * Top action bar with chapter tier navigation and action buttons (Catalog).
 */
export function PartyPositionsActionBar({
  chapterTier,
  onTierChange,
  selectedCountryId,
  onCountryChange,
  selectedZonalId,
  onZonalChange,
  selectedStateId,
  onStateChange,
  selectedLgaId,
  onLgaChange,
  selectedWardId,
  onWardChange,
  onOpenCatalog,
}: PartyPositionsActionBarProps) {
  return (
    <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 mb-4">
      {/* Tier Tabs Navigation with Inline Dynamic Geographic Selectors */}
      <PartyTierNav
        chapterTier={chapterTier}
        onTierChange={onTierChange}
        selectedCountryId={selectedCountryId}
        onCountryChange={onCountryChange}
        selectedZonalId={selectedZonalId}
        onZonalChange={onZonalChange}
        selectedStateId={selectedStateId}
        onStateChange={onStateChange}
        selectedLgaId={selectedLgaId}
        onLgaChange={onLgaChange}
        selectedWardId={selectedWardId}
        onWardChange={onWardChange}
      />

      {/* Action Buttons: Catalog */}
      <div className="flex items-center gap-2.5">
        <Button
          type="button"
          variant="ghost"
          onClick={onOpenCatalog}
          className="h-10 px-3.5 rounded-xl bg-sidebar-mobile hover:bg-sidebar-mobile/80 text-c-70 text-[13px] font-medium flex items-center gap-2"
        >
          <BookOpen className="size-4 text-c-50" />
          <span>Position Catalog</span>
        </Button>
      </div>
    </div>
  );
}

interface PartyPositionsFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  appointmentTypeFilter: string;
  onAppointmentTypeChange: (value: string) => void;
}

/**
 * Filter layer providing official search and appointment type filter dropdown.
 */
export function PartyPositionsFilterBar({
  searchQuery,
  onSearchChange,
  appointmentTypeFilter,
  onAppointmentTypeChange,
}: PartyPositionsFilterBarProps) {
  return (
    <PageSearchLayer
      value={searchQuery}
      onChange={(e) => onSearchChange(e.target.value)}
      ariaLabel="Search party positions"
      placeholder="Search by official name, @username, or display title..."
      rightComponent={
        <Select
          value={appointmentTypeFilter}
          onValueChange={onAppointmentTypeChange}
        >
          <SelectTrigger className="h-12 px-3.5 rounded-xl border border-border text-[14px] text-c-70 min-w-44">
            <SelectValue placeholder="All Appointment Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Appointment Types</SelectItem>
            <SelectItem value="substantive">Substantive</SelectItem>
            <SelectItem value="acting">Acting</SelectItem>
            <SelectItem value="caretaker">Caretaker</SelectItem>
            <SelectItem value="interim">Interim</SelectItem>
          </SelectContent>
        </Select>
      }
    />
  );
}

export {
  PartyPositionsRosterView,
  type PartyPositionsRosterViewProps,
} from "./-party-positions-roster-view";

