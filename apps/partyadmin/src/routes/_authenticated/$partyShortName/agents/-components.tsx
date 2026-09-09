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
import { ElectionScopeSelector } from "../home/components/-election-scope-selector";
import { IconInput } from "@repo/ui/components/input";

/**
 * Shared Agent Roster Header Controls
 *
 * Provides reusable header tools and search filtering for all agent roster tabs
 * (Polling Agents, Ward Supervisors, LGA Supervisors, State Supervisors):
 * - `AgentsHeaderRight`: Dropdown switcher for election group & contest.
 * - `AgentsFilterBar`: Mounts `ElectionScopeSelector` alongside live text search input.
 */

/**
 * AgentsHeaderRight Component
 *
 * Mounts the election group & instance selector in the header toolbar of the agent directory.
 */
export function AgentsHeaderRight() {
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

/**
 * AgentsFilterBar Component
 *
 * Filter toolbar mounting the geographic cascade `ElectionScopeSelector` alongside
 * a real-time text search input for filtering agents by name, username, or phone.
 */
export function AgentsFilterBar({
  search,
  setSearch,
}: {
  search: string;
  setSearch: (val: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <ElectionScopeSelector />
      <IconInput
        type="text"
        placeholder="Search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-[320px]"
      />
    </div>
  );
}
