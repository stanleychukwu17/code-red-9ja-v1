import * as React from "react";
import { useParams } from "@tanstack/react-router";
import { useAppContext } from "#/providers/providers";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getElectionsByGroup } from "#/lib/server/elections";
import { useServerFn } from "@tanstack/react-start";
import {
  SelectElectionGroupAndElection,
  type Election,
  type ElectionGroup,
} from "@repo/ui/components/selects/election-group-and-election-select";
import { HeaderTabs } from "@repo/ui/components/custom/AdminLayouts";

export function HomePageHeader({
  activeTab,
}: {
  activeTab: "main" | "election-day";
}) {
  const { partyShortName } = useParams({ strict: false });
  const {
    party,
    selectedElectionGroup,
    setSelectedElectionGroup,
    setSelectedElection,
  } = useAppContext();
  const partyId = party?.id;

  const fetchGroups = useServerFn(getElectionGroups);
  const fetchElectionsByGroup = useServerFn(getElectionsByGroup);

  const tabs = [
    { id: "main", label: "Main", href: `/${partyShortName}/home` },
    {
      id: "election-day",
      label: "Election day",
      href: `/${partyShortName}/home/election-day`,
    },
  ];

  return (
    <div className="flex items-center justify-between gap-4 pt-5">
      <HeaderTabs activeTab={activeTab} tabs={tabs} />

      <div className="">
        <SelectElectionGroupAndElection
          fetchElectionGroups={fetchGroups}
          fetchElectionsByGroup={fetchElectionsByGroup}
          selectedId={selectedElectionGroup?.id}
          update={(group) => setSelectedElectionGroup(group)}
          onElectionSelect={(group: ElectionGroup, election: Election) => {
            setSelectedElectionGroup(group);
            setSelectedElection(election);
          }}
          partyId={partyId}
          // className="h-12 rounded-[12px] bg-c-20 border-0 hover:bg-c-10 ring-0 hover:ring-0 shadow-none hover:shadow-none focus:ring-0 focus-visible:ring-0 px-5 text-[18px] text-c-80"
        />
      </div>
    </div>
  );
}
