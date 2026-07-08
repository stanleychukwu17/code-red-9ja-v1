import React, { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@repo/ui/components/drawer";
import { Button } from "@repo/ui/components/button";
import { Loader2, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getElectionsByGroup } from "#/lib/server/elections";
import { useServerFn } from "@tanstack/react-start";

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

interface ElectionSelectorDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onElectionSelect: (group: any, election: any) => void;
}

export function ElectionSelectorDrawer({ isOpen, onOpenChange, onElectionSelect }: ElectionSelectorDrawerProps) {
  const fetchGroups = useServerFn(getElectionGroups);
  const fetchElections = useServerFn(getElectionsByGroup);
  
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: ["election-groups"],
    queryFn: () => fetchGroups({ data: { limit: 50 } }),
  });

  const { data: electionsData, isLoading: isLoadingElections } = useQuery({
    queryKey: ["elections", selectedGroup?.id],
    queryFn: () => fetchElections({ data: selectedGroup?.id }),
    enabled: !!selectedGroup?.id,
  });

  const groups = groupsData?.election_groups || [];
  const elections = electionsData?.elections || [];

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcomingGroups = groups.filter((group: any) => {
    if (!group.election_date) return false;
    const d = new Date(group.election_date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() >= now.getTime();
  });

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setSelectedGroup(null), 300);
    }
  }, [isOpen]);

  const handleGroupSelect = (group: any) => {
    setSelectedGroup(group);
  };

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
