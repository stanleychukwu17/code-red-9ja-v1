import * as React from "react";
import { useAppContext } from "#/hooks/useAppContext";
import {
  SelectElectionGroupAndElection,
  type Election,
  type ElectionGroup,
} from "@repo/ui/components/selects/election-group-and-election-select";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getElectionsByGroup } from "#/lib/server/elections";
import { useServerFn } from "@tanstack/react-start";

export function CoverageHeaderRight() {
  const {
    party,
    selectedElectionGroup,
    setSelectedElectionGroup,
    setSelectedElection,
  } = useAppContext();
  const partyId = party?.id;

  const fetchGroups = useServerFn(getElectionGroups);
  const fetchElectionsByGroup = useServerFn(getElectionsByGroup);

  return (
    <SelectElectionGroupAndElection
      fetchElectionGroups={fetchGroups}
      fetchElectionsByGroup={fetchElectionsByGroup}
      selectedId={selectedElectionGroup?.id}
      update={(group) => setSelectedElectionGroup(group)}
      className="w-fit"
      onElectionSelect={(group: ElectionGroup, election: Election) => {
        setSelectedElectionGroup(group);
        setSelectedElection(election);
      }}
      partyId={partyId}
    />
  );
}
