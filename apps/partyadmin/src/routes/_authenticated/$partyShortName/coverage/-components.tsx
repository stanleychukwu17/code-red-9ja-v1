/**
 * @file Coverage Page Header Component
 * @description Provides action components and filters for the agent coverage page header,
 * primarily housing the dual election-group and election selector to switch context.
 */

import * as React from "react";
import { useUserParty } from "#/hooks/useUserParty";
import { useElection } from "#/hooks/useElection";
import {
  SelectElectionGroupAndElection,
  type Election,
  type ElectionGroup,
} from "@repo/ui/components/selects/election-group-and-election-select";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getElectionsByGroup } from "#/lib/server/elections";
import { useServerFn } from "@tanstack/react-start";

/**
 * CoverageHeaderRight Component
 * Mounts in the PageHeader's right slot to allow party admins to quickly switch
 * between election groups (e.g. General Elections 2023) and specific election races (e.g. Presidential, Gubernatorial).
 */
export function CoverageHeaderRight() {
  const { party } = useUserParty();
  const {
    selectedElectionGroup,
    setSelectedElectionGroup,
    setSelectedElection,
  } = useElection();
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
