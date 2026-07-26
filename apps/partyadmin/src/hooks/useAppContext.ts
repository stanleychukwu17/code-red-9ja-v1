import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouteContext } from "@tanstack/react-router";
import { getParty, getPublicParties } from "#/lib/server/parties";
import {
  getElectionCandidates,
  getElectionsByGroup,
} from "#/lib/server/elections";
import { getElectionGroups } from "#/lib/server/election_groups";
import { useAppDispatch, useAppSelector } from "#/redux/hooks";
import {
  selectSelectedElectionGroup,
  selectSelectedElection,
  selectSelectedCountryId,
  selectSelectedStateId,
  selectSelectedDistrictId,
  selectSelectedFederalConstituencyId,
  selectSelectedStateConstituencyId,
  selectSelectedLGAId,
  selectSelectedWardId,
  setSelectedElectionGroup,
  setSelectedElection,
  setSelectedCountryId,
  setSelectedStateId,
  setSelectedDistrictId,
  setSelectedFederalConstituencyId,
  setSelectedStateConstituencyId,
  setSelectedLGAId,
  setSelectedWardId,
  selectIsLive,
  setIsLive,
} from "#/redux/slice/electionSlice";

export interface PartyDetails {
  id?: number;
  shortName: string;
  name: string;
  logo?: string;
  slots?: number;
  allowanceBalanceKobo?: number;
  stateAllowances?: Record<string, number>;
}

export interface BackendParty {
  id: number;
  short_name: string;
  name: string;
  logo?: string;
  slots?: number;
  allowance_balance_kobo?: number;
  state_allowances?: Record<string, number>;
  created_at?: string;
  updated_at?: string;
}

export interface GetPartyResponse {
  success: boolean;
  message: string;
  data?: {
    party: BackendParty;
  };
}

export interface UserDetails {
  fake_id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url?: string;
  account_status: string;
  party_id?: number;
  party?: {
    id?: number;
    short_name?: string;
    name?: string;
    logo?: string;
    slots?: number;
    allowance_balance_kobo?: number;
    state_allowances?: Record<string, number>;
    created_at?: string;
    updated_at?: string;
  };
}

export const usePartyDetails = (): PartyDetails | null => {
  const reduxUser = useAppSelector((state) => state.auth.user);
  let routeUser: any = null;
  try {
    const context = useRouteContext({ from: "__root__" }) as any;
    routeUser = context?.userDetails;
  } catch (e) {
    // router context may not be available outside routing tree
  }
  const user = reduxUser || routeUser;
  const partyId = user?.party?.id ?? user?.party_id;

  const { data: fetchedParty } = useQuery<BackendParty | null, Error>({
    queryKey: ["party", partyId],
    queryFn: async () => {
      if (!partyId) return null;
      const res = (await getParty({ data: partyId })) as GetPartyResponse;
      if (res && res.success && res.data?.party) {
        return res.data.party;
      }
      throw new Error(res?.message || "Failed to fetch party details");
    },
    enabled: !!partyId,
  });

  const party = fetchedParty
    ? {
        id: fetchedParty.id,
        shortName: fetchedParty.short_name,
        name: fetchedParty.name || "",
        logo: fetchedParty.logo,
        slots: fetchedParty.slots || 0,
        allowanceBalanceKobo: fetchedParty.allowance_balance_kobo || 0,
        stateAllowances: fetchedParty.state_allowances || {},
      }
    : user?.party?.short_name
      ? {
          id: user.party.id ?? user.party_id,
          shortName: user.party.short_name,
          name: user.party.name || "",
          logo: user.party.logo,
          slots: user.party.slots || 0,
          allowanceBalanceKobo: user.party.allowance_balance_kobo || 0,
          stateAllowances: user.party.state_allowances || {},
        }
      : user?.party_id
        ? {
            id: user.party_id,
            shortName: "",
            name: "",
            slots: 0,
            allowanceBalanceKobo: 0,
            stateAllowances: {},
          }
        : null;

  return party;
};

export const useElectionCandidates = () => {
  const selectedElection = useAppSelector(selectSelectedElection);
  const fetchElectionCandidates = useServerFn(getElectionCandidates);

  const { data: candidatesData } = useQuery({
    queryKey: ["election-candidates", selectedElection?.id],
    queryFn: () =>
      fetchElectionCandidates({
        data: { electionId: selectedElection?.id as number },
      }),
    enabled: !!selectedElection?.id,
  });

  return candidatesData?.data?.candidates || candidatesData?.candidates || [];
};

export const useAppContext = () => {
  const dispatch = useAppDispatch();
  const reduxUser = useAppSelector((state) => state.auth.user);
  let routeUser: any = null;
  try {
    const context = useRouteContext({ from: "__root__" }) as any;
    routeUser = context?.userDetails;
  } catch (e) {
    // context not available
  }
  const user = reduxUser || routeUser;
  const party = usePartyDetails();

  const selectedElectionGroup = useAppSelector(selectSelectedElectionGroup);
  const selectedElection = useAppSelector(selectSelectedElection);
  const selectedCountryId = useAppSelector(selectSelectedCountryId);
  const selectedStateId = useAppSelector(selectSelectedStateId);
  const selectedDistrictId = useAppSelector(selectSelectedDistrictId);
  const selectedFederalConstituencyId = useAppSelector(
    selectSelectedFederalConstituencyId,
  );
  const selectedStateConstituencyId = useAppSelector(
    selectSelectedStateConstituencyId,
  );
  const selectedLGAId = useAppSelector(selectSelectedLGAId);
  const selectedWardId = useAppSelector(selectSelectedWardId);
  const electionCandidates = useElectionCandidates();
  const isLive = useAppSelector(selectIsLive);

  // Returns true if today matches electionDate (YYYY-MM-DD)
  const isElectionDay = (electionDate?: string | null): boolean => {
    if (!electionDate) return false;
    const today = new Date().toISOString().split("T")[0];
    const d = new Date(electionDate).toISOString().split("T")[0];
    return today === d;
  };

  // Returns true if current time is before 4pm local time
  const isBeforeEndOfDay = (): boolean => {
    return new Date().getHours() < 16;
  };

  const electionDay = isElectionDay(selectedElectionGroup?.election_date);

  // Auto-switch to false after 4pm (check on mount and whenever tab gains focus)
  useEffect(() => {
    if (!electionDay) return;
    const checkTime = () => {
      if (!isBeforeEndOfDay()) dispatch(setIsLive(false));
    };
    checkTime();
    window.addEventListener("focus", checkTime);
    const interval = setInterval(checkTime, 60_000); // re-check every minute
    return () => {
      window.removeEventListener("focus", checkTime);
      clearInterval(interval);
    };
  }, [electionDay, dispatch]);

  const fetchGroups = useServerFn(getElectionGroups);
  const fetchElections = useServerFn(getElectionsByGroup);
  const fetchPublicParties = useServerFn(getPublicParties);

  const { data: publicPartiesData } = useQuery({
    queryKey: ["public-parties"],
    queryFn: () => fetchPublicParties(),
  });
  const activeParties = publicPartiesData?.data?.parties || [];

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

  return {
    user,
    party,
    selectedElectionGroup,
    selectedElection,
    setSelectedElectionGroup: (group: any | null) =>
      dispatch(setSelectedElectionGroup(group)),
    setSelectedElection: (election: any | null) =>
      dispatch(setSelectedElection(election)),
    selectedCountryId,
    setSelectedCountryId: (id: number | undefined) =>
      dispatch(setSelectedCountryId(id)),
    selectedStateId,
    setSelectedStateId: (id: number | undefined) =>
      dispatch(setSelectedStateId(id)),
    selectedDistrictId,
    setSelectedDistrictId: (id: number | undefined) =>
      dispatch(setSelectedDistrictId(id)),
    selectedFederalConstituencyId,
    setSelectedFederalConstituencyId: (id: number | undefined) =>
      dispatch(setSelectedFederalConstituencyId(id)),
    selectedStateConstituencyId,
    setSelectedStateConstituencyId: (id: number | undefined) =>
      dispatch(setSelectedStateConstituencyId(id)),
    selectedLGAId,
    setSelectedLGAId: (id: number | undefined) =>
      dispatch(setSelectedLGAId(id)),
    selectedWardId,
    setSelectedWardId: (id: number | undefined) =>
      dispatch(setSelectedWardId(id)),
    electionCandidates,
    activeParties,
    isLive,
    setIsLive: (v: boolean) => dispatch(setIsLive(v)),
    electionDay,
  };
};

export const useAuth = () => {
  const context = useAppContext();
  return {
    user: context.user,
    party: context.party || {
      id: undefined,
      shortName: "",
      name: "",
      logo: undefined,
    },
    selectedElectionGroup: context.selectedElectionGroup,
    selectedElection: context.selectedElection,
    setSelectedElectionGroup: context.setSelectedElectionGroup,
    setSelectedElection: context.setSelectedElection,
    selectedCountryId: context.selectedCountryId,
    setSelectedCountryId: context.setSelectedCountryId,
    selectedStateId: context.selectedStateId,
    setSelectedStateId: context.setSelectedStateId,
    selectedDistrictId: context.selectedDistrictId,
    setSelectedDistrictId: context.setSelectedDistrictId,
    selectedFederalConstituencyId: context.selectedFederalConstituencyId,
    setSelectedFederalConstituencyId: context.setSelectedFederalConstituencyId,
    selectedStateConstituencyId: context.selectedStateConstituencyId,
    setSelectedStateConstituencyId: context.setSelectedStateConstituencyId,
    selectedLGAId: context.selectedLGAId,
    setSelectedLGAId: context.setSelectedLGAId,
    selectedWardId: context.selectedWardId,
    setSelectedWardId: context.setSelectedWardId,
    electionCandidates: context.electionCandidates,
  };
};
