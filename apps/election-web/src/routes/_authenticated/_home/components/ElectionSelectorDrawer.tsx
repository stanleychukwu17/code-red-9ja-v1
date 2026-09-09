import React, { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@repo/ui/components/drawer";
import { Button } from "@repo/ui/components/button";
import { Loader2, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getElectionsByGroup } from "#/lib/server/elections";
import { useServerFn } from "@tanstack/react-start";

/** Formats an ISO date string to a concise display format (e.g. 'Feb 25') */
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

interface ElectionSelectorDrawerProps {
  /** Controls visibility of the election switcher bottom sheet */
  isOpen: boolean;
  /** Callback fired when drawer open state toggles */
  onOpenChange: (open: boolean) => void;
  /** Callback fired when user selects an active election group and ballot */
  onElectionSelect: (group: any, election: any) => void;
}

/**
 * Election & Ballot Selection Bottom Drawer.
 *
 * Provides a two-tier drill-down modal for switching active election context:
 * 1. Tier 1: Lists upcoming election groups (e.g., "2027 General Elections", "Edo Governorship").
 * 2. Tier 2: Lists specific ballots under the selected group (e.g., "Presidential", "Senatorial").
 *
 * Dispatches selection back to parent components to update Redux session state.
 */
export function ElectionSelectorDrawer({ isOpen, onOpenChange, onElectionSelect }: ElectionSelectorDrawerProps) {
  // Server function wrappers for TanStack Start data fetching
  const fetchGroups = useServerFn(getElectionGroups);
  const fetchElections = useServerFn(getElectionsByGroup);
  
  // Currently drilled-down election group
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  // Query top-level election groups
  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: ["election-groups"],
    queryFn: () => fetchGroups({ data: { limit: 50 } }),
  });

  // Query specific election ballots under the drilled-down group
  const { data: electionsData, isLoading: isLoadingElections } = useQuery({
    queryKey: ["elections", selectedGroup?.id],
    queryFn: () => fetchElections({ data: selectedGroup?.id }),
    enabled: !!selectedGroup?.id,
  });

  const groups = groupsData?.election_groups || [];
  const elections = electionsData?.elections || [];

  // Filter groups scheduled for today or in the future
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcomingGroups = groups.filter((group: any) => {
    if (!group.election_date) return false;
    const d = new Date(group.election_date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() >= now.getTime();
  });

  // Reset drill-down group state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setSelectedGroup(null), 300);
    }
  }, [isOpen]);

  // Drill down into group ballots
  const handleGroupSelect = (group: any) => {
    setSelectedGroup(group);
  };

  // Finalize ballot selection and close drawer
  const handleElectionSelect = (election: any) => {
    onElectionSelect(selectedGroup, election);
    onOpenChange(false);
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] bg-white text-black border-none rounded-t-3xl">
        <DrawerHeader className="pb-2 pt-6 flex flex-col items-center">
          <div className="w-10 h-1 bg-neutral-200 rounded-full mb-4" />
          <div className="relative w-full flex items-center justify-center">
            {/* Back button to return from Tier 2 to Tier 1 */}
            {selectedGroup && (
              <button 
                className="absolute left-0 p-2 -ml-2" 
                onClick={() => setSelectedGroup(null)}
              >
                <ChevronLeft className="h-5 w-5 text-neutral-500" />
              </button>
            )}
            <h2 className="text-[17px] font-semibold text-center">
              {selectedGroup ? selectedGroup.name : "Select Election"}
            </h2>
          </div>
        </DrawerHeader>
        
        <div className="px-6 pb-8 overflow-y-auto mt-4">
          {!selectedGroup ? (
            /* TIER 1: Upcoming Election Groups */
            <div className="space-y-6">
              {isLoadingGroups ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                </div>
              ) : upcomingGroups.length === 0 ? (
                <div className="text-center p-8 text-neutral-500">No upcoming elections</div>
              ) : (
                upcomingGroups.map((group: any) => (
                  <button
                    key={group.id}
                    onClick={() => handleGroupSelect(group)}
                    className="w-full flex items-center justify-between group transition-colors text-left"
                  >
                    <span className="font-medium text-[15px] text-neutral-900">{group.name}</span>
                    <span className="text-[14px] text-neutral-400">
                      {group.election_date ? formatDate(group.election_date) : ''}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : (
            /* TIER 2: Specific Election Ballots under selected group */
            <div className="space-y-6">
              {isLoadingElections ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                </div>
              ) : elections.length === 0 ? (
                <div className="text-center p-8 text-neutral-500">No elections found for this group</div>
              ) : (
                elections.map((election: any) => (
                  <button
                    key={election.id}
                    onClick={() => handleElectionSelect(election)}
                    className="w-full flex items-center justify-between group transition-colors text-left"
                  >
                    <span className="font-medium text-[15px] text-neutral-900">{election.name}</span>
                    <span className="text-[14px] text-neutral-400">
                      {election.election_date ? formatDate(election.election_date) : (selectedGroup.election_date ? formatDate(selectedGroup.election_date) : '')}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
