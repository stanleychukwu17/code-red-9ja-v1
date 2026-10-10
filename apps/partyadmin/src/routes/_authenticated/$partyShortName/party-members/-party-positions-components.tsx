/**
 * @file Party Positions Page SubComponents
 * @description Modular components for the Party Positions roster page:
 * - PartyPositionsActionBar: Tier navigation tabs and action buttons
 * - PartyPositionsFilterBar: Search layer and appointment type filter dropdown
 * - PartyPositionsRosterView: Loading, empty, and populated table views
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { PageSearchLayer } from "@repo/ui/components/custom/AdminLayouts";
export {
  PartyPositionsActionBar,
  type PartyPositionsActionBarProps,
} from "./-party-positions-action-bar";

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
