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
import { getAutoSelectedSession } from "#/hooks/useAuth";

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

  // Auto-select group with closest date if none selected or if the selected one is invalid
  useEffect(() => {
    if (groups.length > 0) {
      const isGroupValid =
        selectedElectionGroup &&
        groups.some((g: any) => g.id === selectedElectionGroup.id);

      if (!isGroupValid) {
        const { selectedGroup } = getAutoSelectedSession(groups, []);
        if (selectedGroup) {
          dispatch(setSelectedElectionGroup(selectedGroup));
        }
      }
    }
  }, [groups, selectedElectionGroup, dispatch]);

  const { data: electionsData } = useQuery({
    queryKey: ["elections", selectedElectionGroup?.id],
    queryFn: () => fetchElections({ data: selectedElectionGroup?.id }),
    enabled: !!selectedElectionGroup?.id,
  });
  const elections = electionsData?.data?.elections || [];

  // Auto-select highest ranked election if none selected or if group changed or if the selected one is invalid
  useEffect(() => {
    if (elections.length > 0 && selectedElectionGroup) {
      const isElectionValid =
        selectedElection &&
        elections.some((e: any) => e.id === selectedElection.id);

      if (
        !isElectionValid ||
        selectedElection.election_group_id !== selectedElectionGroup.id
      ) {
        const { selectedElection: newSelection } = getAutoSelectedSession(
          [selectedElectionGroup],
          elections,
        );
        if (newSelection) {
          dispatch(setSelectedElection(newSelection));
        }
      }
    }
  }, [elections, selectedElectionGroup, selectedElection, dispatch]);

  return null;
}
