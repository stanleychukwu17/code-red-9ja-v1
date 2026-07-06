import React, { createContext, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPartyById } from "#/lib/server/parties";
import { useLocalStorage } from "usehooks-ts";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getElectionsByGroup } from "#/lib/server/elections";
import { getPollingUnitAssignments } from "#/lib/server/polling_unit_assignments";
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
  id: number;
  fake_id?: number;
  email?: string;
  avatar?: string;
  phone?: string;
  username?: string;
  last_name?: string;
  first_name?: string;
  middle_name?: string;
  gender?: string;
  role?: string;
  role_level?: string;
  account_status?: string;
  party_id?: number;
  polling_unit_id?: number;
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

interface AppContextType {
  user: UserDetails | null;
  party: PartyDetails | null;
  selectedElectionGroup: any | null;
  selectedElection: any | null;
  selectedAssignment: any | null;
  pollingUnitId: number | null;
  setSelectedElectionGroup: (group: any | null) => void;
  setSelectedElection: (election: any | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{
  user: UserDetails | null;
  children: React.ReactNode;
}> = ({ user, children }) => {
  const partyId = user?.party?.id ?? user?.party_id;

  const { data: fetchedParty } = useQuery<BackendParty | null, Error>({
    queryKey: ["party", partyId],
    queryFn: async () => {
      if (!partyId) return null;
      const res = (await getPartyById({ data: partyId })) as GetPartyResponse;
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
  >("selected-election-group", null);
  const [selectedElection, setSelectedElection] = useLocalStorage<any | null>(
    "selected-election",
    null,
  );

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

  // ── Agent assignment (optional – general users have none) ──
  const fetchAssignments = useServerFn(getPollingUnitAssignments);
  const { data: assignmentsData } = useQuery({
    queryKey: ["pollingAgentAssignments", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await fetchAssignments({
        data: { user_id: user?.id },
      });
      if (!res?.success || !res.data?.assignments) return [];
      return res.data.assignments;
    },
  });

  const selectedAssignment =
    selectedElectionGroup && assignmentsData
      ? assignmentsData.find(
          (a: any) => a.election_group_id === selectedElectionGroup?.id,
        )
      : null;

  const pollingUnitId =
    selectedAssignment?.polling_unit_id ?? user?.polling_unit_id ?? null;

  return (
    <AppContext.Provider
      value={{
        user,
        party,
        selectedElectionGroup,
        selectedElection,
        selectedAssignment,
        pollingUnitId,
        setSelectedElectionGroup,
        setSelectedElection,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useParty = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useParty must be used within an AppProvider");
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
    selectedAssignment: context.selectedAssignment,
    pollingUnitId: context.pollingUnitId,
    setSelectedElectionGroup: context.setSelectedElectionGroup,
    setSelectedElection: context.setSelectedElection,
  };
};
