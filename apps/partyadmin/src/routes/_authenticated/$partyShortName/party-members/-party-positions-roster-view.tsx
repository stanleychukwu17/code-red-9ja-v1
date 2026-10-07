import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounceValue } from "usehooks-ts";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useUserParty } from "#/hooks/useUserParty";
import {
  getPartyOfficials,
  vacatePartyOfficial,
  type PartyOfficialItem,
} from "#/lib/server/parties";
import {
  PartyPositionTableHeader,
  PartyPositionTableTile,
} from "#/components/tiles/party-position-tile";
import { MOCK_PARTY_OFFICIALS } from "./-mock-officials";

export interface PartyPositionsRosterViewProps {
  chapterTier?: string;
  selectedCountryId?: number;
  selectedZonalId?: number;
  selectedStateId?: number;
  selectedLgaId?: number;
  selectedWardId?: number;
  searchQuery?: string;
  appointmentTypeFilter?: string;
  onVacateOfficial?: (official: PartyOfficialItem) => void;
}

/**
 * Main roster view showing loading state, empty state, or table list.
 * Self-contained: manages fetching officials, appointment type filtering, and vacating officials in-house.
 */
export function PartyPositionsRosterView({
  chapterTier = "national",
  selectedCountryId,
  selectedZonalId,
  selectedStateId,
  selectedLgaId,
  selectedWardId,
  searchQuery = "",
  appointmentTypeFilter = "all",
  onVacateOfficial,
}: PartyPositionsRosterViewProps) {
  const { party } = useUserParty();
  const queryClient = useQueryClient();
  const partyId = party?.id;

  // Fetch Party Officials in-house
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 400);

  // Fetch Officials in-house
  const { data: officialsRes, isLoading } = useQuery({
    queryKey: [
      "partyOfficials", partyId, chapterTier, selectedCountryId, selectedZonalId, selectedStateId,
      selectedLgaId, selectedWardId, debouncedSearchQuery,
    ],
    queryFn: () =>
      getPartyOfficials({
        data: {
          partyId: partyId!,
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
    enabled: !!partyId,
  });

  const rawOfficials: PartyOfficialItem[] = officialsRes?.data?.officials || [];

  // Use mock data for design preview of PartyPositionTableTile (filters responsive)
  const displayOfficials = React.useMemo(() => {
    let list = MOCK_PARTY_OFFICIALS;
    if (appointmentTypeFilter !== "all") {
      list = list.filter(
        (o) => o.appointment_type.toLowerCase() === appointmentTypeFilter.toLowerCase(),
      );
    }
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase().trim();
      list = list.filter(
        (o) =>
          o.display_title.toLowerCase().includes(q) ||
          o.position_name.toLowerCase().includes(q) ||
          `${o.first_name || ""} ${o.last_name || ""}`.toLowerCase().includes(q) ||
          (o.username && o.username.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [appointmentTypeFilter, debouncedSearchQuery]);

  // Handle Vacate Office
  const handleVacateOfficial = async (official: PartyOfficialItem) => {
    if (onVacateOfficial) {
      onVacateOfficial(official);
      return;
    }

    const confirmVacate = window.confirm(
      `Are you sure you want to vacate ${official.display_title || official.position_name} for ${official.first_name} ${official.last_name}?`,
    );
    if (!confirmVacate || !partyId) return;

    try {
      const res = await vacatePartyOfficial({
        data: {
          partyId,
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

  if (displayOfficials.length === 0) {
    return (
      <div className="w-full p-16 text-center text-c-50 font-medium bg-background rounded-2xl border border-border space-y-3">
        <p className="text-[16px] text-c-70">No party officials found.</p>
        <p className="text-[13px] text-c-40 max-w-md mx-auto">
          No officials have been appointed to positions matching your selected tier and filters.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-background">
      <PartyPositionTableHeader />
      <div className="divide-y divide-border">
        {displayOfficials.map((official) => (
          <PartyPositionTableTile
            key={official.assignment_id}
            official={official}
            onVacate={handleVacateOfficial}
          />
        ))}
      </div>
    </div>
  );
}
