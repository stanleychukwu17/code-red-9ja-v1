import React, { createContext, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getParty } from "#/lib/server/parties";
import { useLocalStorage } from "usehooks-ts";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getElectionsByGroup, getElectionCandidates } from "#/lib/server/elections";
import { useServerFn } from "@tanstack/react-start";

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

export interface ElectionSelections {
  stateId?: number;
  districtId?: number;
  federalConstituencyId?: number;
  stateConstituencyId?: number;
  lgaId?: number;
  wardId?: number;
}

interface AppContextType {
  user: UserDetails | null;
  party: PartyDetails | null;
  selectedElectionGroup: any | null;
  selectedElection: any | null;
  setSelectedElectionGroup: (group: any | null) => void;
  setSelectedElection: (election: any | null) => void;

  selectedCountryId: number | undefined;
  setSelectedCountryId: (id: number | undefined) => void;
  selectedStateId: number | undefined;
  setSelectedStateId: (id: number | undefined) => void;
  selectedDistrictId: number | undefined;
  setSelectedDistrictId: (id: number | undefined) => void;
  selectedFederalConstituencyId: number | undefined;
  setSelectedFederalConstituencyId: (id: number | undefined) => void;
  selectedStateConstituencyId: number | undefined;
  setSelectedStateConstituencyId: (id: number | undefined) => void;
  selectedLGAId: number | undefined;
  setSelectedLGAId: (id: number | undefined) => void;
  selectedWardId: number | undefined;
  setSelectedWardId: (id: number | undefined) => void;
  electionCandidates: any[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{
  user: UserDetails | null;
  children: React.ReactNode;
}> = ({ user, children }) => {
  const partyId = user?.party?.id ?? user?.party_id;
  console.log("AUTH USER", user);

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

  // Global Election Selection State using local storage
  const [selectedElectionGroup, setSelectedElectionGroup] = useLocalStorage<
    any | null
  >("partyadmin-selected-election-group", null);
  const [selectedElection, setSelectedElection] = useLocalStorage<any | null>(
    "partyadmin-selected-election",
    null,
  );

  const [selectedCountryId, setSelectedCountryId] = useLocalStorage<
    number | undefined
  >("partyadmin-selected-country-id", 161);

  const [electionScopes, setElectionScopes] = useLocalStorage<
    Record<number, ElectionSelections>
  >("partyadmin-election-scopes", {});

  const currentElectionId = selectedElection?.id;
  const currentSelections = currentElectionId
    ? electionScopes[currentElectionId] || {}
    : {};

  const selectedStateId = currentSelections.stateId;
  const setSelectedStateId = (id: number | undefined) => {
    if (currentElectionId) {
      setElectionScopes((prev) => ({
        ...prev,
        [currentElectionId]: { ...prev[currentElectionId], stateId: id },
      }));
    }
  };

  const selectedDistrictId = currentSelections.districtId;
  const setSelectedDistrictId = (id: number | undefined) => {
    if (currentElectionId) {
      setElectionScopes((prev) => ({
        ...prev,
        [currentElectionId]: { ...prev[currentElectionId], districtId: id },
      }));
    }
  };

  const selectedFederalConstituencyId = currentSelections.federalConstituencyId;
  const setSelectedFederalConstituencyId = (id: number | undefined) => {
    if (currentElectionId) {
      setElectionScopes((prev) => ({
        ...prev,
        [currentElectionId]: {
          ...prev[currentElectionId],
          federalConstituencyId: id,
        },
      }));
    }
  };

  const selectedStateConstituencyId = currentSelections.stateConstituencyId;
  const setSelectedStateConstituencyId = (id: number | undefined) => {
    if (currentElectionId) {
      setElectionScopes((prev) => ({
        ...prev,
        [currentElectionId]: {
          ...prev[currentElectionId],
          stateConstituencyId: id,
        },
      }));
    }
  };

  const selectedLGAId = currentSelections.lgaId;
  const setSelectedLGAId = (id: number | undefined) => {
    if (currentElectionId) {
      setElectionScopes((prev) => ({
        ...prev,
        [currentElectionId]: { ...prev[currentElectionId], lgaId: id },
      }));
    }
  };

  const selectedWardId = currentSelections.wardId;
  const setSelectedWardId = (id: number | undefined) => {
    if (currentElectionId) {
      setElectionScopes((prev) => ({
        ...prev,
        [currentElectionId]: { ...prev[currentElectionId], wardId: id },
      }));
    }
  };

  const fetchGroups = useServerFn(getElectionGroups);
  const fetchElections = useServerFn(getElectionsByGroup);

  const { data: groupsData } = useQuery({
    queryKey: ["election-groups"],
    queryFn: () => fetchGroups({ data: { limit: 50 } }),
  });
  const groups = groupsData?.election_groups || [];

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
        const dateA = new Date(a.election_date || 0).getTime();
        const dateB = new Date(b.election_date || 0).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return b.rank - a.rank;
      });

      if (validGroups.length > 0) {
        setSelectedElectionGroup(validGroups[0]);
      }
    }
  }, [groups, selectedElectionGroup, setSelectedElectionGroup]);

  const { data: electionsData } = useQuery({
    queryKey: ["elections", selectedElectionGroup?.id],
    queryFn: () => fetchElections({ data: selectedElectionGroup?.id }),
    enabled: !!selectedElectionGroup?.id,
  });
  const elections = electionsData?.elections || [];

  const fetchElectionCandidates = useServerFn(getElectionCandidates);
  const { data: candidatesData } = useQuery({
    queryKey: ["election-candidates", selectedElection?.id],
    queryFn: () =>
      fetchElectionCandidates({
        data: { electionId: selectedElection?.id as number },
      }),
    enabled: !!selectedElection?.id,
  });
  const electionCandidates =
    candidatesData?.data?.candidates || candidatesData?.candidates || [];

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
        setSelectedElection(sortedElections[0]);
      }
    }
  }, [elections, selectedElectionGroup, selectedElection, setSelectedElection]);

  return (
    <AppContext.Provider
      value={{
        user,
        party,
        selectedElectionGroup,
        selectedElection,
        setSelectedElectionGroup,
        setSelectedElection,
        selectedCountryId,
        setSelectedCountryId,
        selectedStateId,
        setSelectedStateId,
        selectedDistrictId,
        setSelectedDistrictId,
        selectedFederalConstituencyId,
        setSelectedFederalConstituencyId,
        selectedStateConstituencyId,
        setSelectedStateConstituencyId,
        selectedLGAId,
        setSelectedLGAId,
        selectedWardId,
        setSelectedWardId,
        electionCandidates,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};

export const useAuth = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AppProvider");
  }
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
