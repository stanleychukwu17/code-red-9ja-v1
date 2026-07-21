import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getPartyById } from "#/lib/server/parties";
import { getPollingUnitAssignments } from "#/lib/server/polling_unit_assignments";
import { getSupervisorAssignments } from "#/lib/server/supervisor_assignments";
import { useAppDispatch, useAppSelector } from "#/redux/hooks";
import {
  selectSelectedElection,
  selectSelectedElectionGroup,
  setSelectedElection as setSelectedElectionAction,
  setSelectedElectionGroup as setSelectedElectionGroupAction,
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
  current_state?: number;
  current_lga?: number;
  current_ward?: number;
  whatsapp_phone?: string;
  data_phone?: string;
  educational_status?: string;
  highest_degree?: string;
  graduation_year?: string;
  school_name?: string;
  voters_card_image?: string;
  address?: string;
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

export const useAuth = () => {
  const dispatch = useAppDispatch();

  // Try getting user from Router context (SSR or pre-hydration) and Redux (active client session)
  const routerContext = useRouteContext({ strict: false }) as any;
  const reduxUser = useAppSelector(
    (state) => state.auth.user,
  ) as UserDetails | null;
  const user =
    reduxUser || (routerContext?.userDetails as UserDetails | null) || null;

  const selectedElectionGroup = useAppSelector(selectSelectedElectionGroup);
  const selectedElection = useAppSelector(selectSelectedElection);

  // 1. Fetch party details
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

  // 2. Fetch Assignments details
  const fetchAssignments = useServerFn(getPollingUnitAssignments);
  const { data: assignmentsData } = useQuery({
    queryKey: ["pollingAgentAssignments", user?.id, selectedElectionGroup?.id],
    enabled: !!user?.id && !!selectedElectionGroup?.id,
    queryFn: async () => {
      const res = await fetchAssignments({
        data: {
          user_id: user?.id,
          election_group_id: selectedElectionGroup?.id,
        },
      });
      if (!res?.success || !res.data?.assignments) return [];
      return res.data.assignments;
    },
  });

  const selectedAssignment =
    assignmentsData && assignmentsData.length > 0 ? assignmentsData[0] : null;

  // 3. Fetch Supervisor Assignments
  const fetchSupervisorAssignments = useServerFn(getSupervisorAssignments);
  const { data: supervisorAssignmentsData } = useQuery({
    queryKey: ["supervisorAssignments", user?.id, selectedElectionGroup?.id],
    enabled: !!user?.id && !!selectedElectionGroup?.id,
    queryFn: async () => {
      const res = await fetchSupervisorAssignments({
        data: {
          user_id: user?.id,
          election_group_id: selectedElectionGroup?.id,
        },
      });
      if (!res?.success || !res.data?.assignments) return null;
      return res.data.assignments;
    },
  });

  let selectedSupervisorAssignment = null;
  if (supervisorAssignmentsData) {
    if (supervisorAssignmentsData.state_supervisor) {
      selectedSupervisorAssignment = {
        type: "state",
        data: supervisorAssignmentsData.state_supervisor,
      };
    } else if (supervisorAssignmentsData.lga_supervisor) {
      selectedSupervisorAssignment = {
        type: "lga",
        data: supervisorAssignmentsData.lga_supervisor,
      };
    } else if (supervisorAssignmentsData.ward_supervisor) {
      selectedSupervisorAssignment = {
        type: "ward",
        data: supervisorAssignmentsData.ward_supervisor,
      };
    }
  }

  const pollingUnitId =
    selectedAssignment?.polling_unit_id ?? user?.polling_unit_id ?? null;

  return {
    user,
    party: party || {
      id: undefined,
      shortName: "",
      name: "",
      logo: undefined,
    },
    selectedElectionGroup,
    selectedElection,
    selectedAssignment,
    selectedSupervisorAssignment,
    pollingUnitId,
    setSelectedElectionGroup: (group: any | null) => {
      dispatch(setSelectedElectionGroupAction(group));
    },
    setSelectedElection: (election: any | null) => {
      dispatch(setSelectedElectionAction(election));
    },
  };
};

export const useParty = () => {
  const auth = useAuth();
  return auth.party;
};
