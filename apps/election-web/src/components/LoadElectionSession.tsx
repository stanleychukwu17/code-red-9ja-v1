import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getElectionsByGroup } from "#/lib/server/elections";
import { useAppDispatch, useAppSelector } from "#/redux/hooks";
import {
  selectSelectedElection,
  selectSelectedElectionGroup,
  setSelectedElection,
  setSelectedElectionGroup,
} from "#/redux/slice/electionSlice";

export default function LoadElectionSession() {
  const dispatch = useAppDispatch();
  const selectedElectionGroup = useAppSelector(selectSelectedElectionGroup);
  const selectedElection = useAppSelector(selectSelectedElection);

  const fetchGroups = useServerFn(getElectionGroups);
  const fetchElections = useServerFn(getElectionsByGroup);

  const { data: groupsData } = useQuery({
    queryKey: ["election-groups"],
    queryFn: () => fetchGroups({ data: { limit: 50 } }),
  });
  const groups = groupsData?.data?.election_groups || [];

  // Auto-select highest ranked group with closest date if none selected
  useEffect(() => {
    if (groups.length > 0 && !selectedElectionGroup) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      let validGroups = groups.filter((g: any) => {
        if (!g.election_date) return false;
        const d = new Date(g.election_date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() >= now.getTime();
      });

      if (validGroups.length === 0) validGroups = groups;

      validGroups.sort((a: any, b: any) => {
        return b.rank - a.rank;
      });

      if (validGroups.length > 0) {
        dispatch(setSelectedElectionGroup(validGroups[0]));
      }
    }
  }, [groups, selectedElectionGroup, dispatch]);

  const { data: electionsData } = useQuery({
    queryKey: ["elections", selectedElectionGroup?.id],
    queryFn: () => fetchElections({ data: selectedElectionGroup?.id }),
    enabled: !!selectedElectionGroup?.id,
  });
  const elections = electionsData?.data?.elections || [];

  // Auto-select highest ranked election if none selected or if group changed
  useEffect(() => {
    if (elections.length > 0 && selectedElectionGroup) {
      if (
        !selectedElection ||
        selectedElection.election_group_id !== selectedElectionGroup.id
      ) {
        const sortedElections = [...elections].sort(
          (a: any, b: any) => b.rank - a.rank,
        );
        dispatch(setSelectedElection(sortedElections[0]));
      }
    }
  }, [elections, selectedElectionGroup, selectedElection, dispatch]);

  return null;
}
