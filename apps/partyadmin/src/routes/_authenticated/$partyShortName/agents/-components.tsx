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
import { ElectionScopeSelector } from "../home/components/-election-scope-selector";
import { IconInput } from "@repo/ui/components/input";

// ─── Header Right Component (Select Election Group & Election) ───────────────
export function AgentsHeaderRight() {
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

// ─── Filter Bar ──────────────────────────────────────────────────────────────
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
