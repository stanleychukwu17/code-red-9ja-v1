import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getPartyById, getParties } from "#/lib/server/parties";
import { getElectionCandidates } from "#/lib/server/elections";
import { getElectionScopedFinalResult } from "#/lib/server/final-results";
import { getFinalResult as getPollingUnitFinalResult } from "#/lib/server/polling_unit_results";
import { getPollingUnitAssignments } from "#/lib/server/polling_unit_assignments";
import { getSupervisorAssignments } from "#/lib/server/supervisor_assignments";
import { useAppDispatch, useAppSelector } from "#/redux/hooks";
import {
  selectSelectedElection,
  selectSelectedElectionGroup,
  selectIsLive,
  setIsLive,
  selectIsLocked,
  setIsLocked,
  setSelectedElection as setSelectedElectionAction,
  setSelectedElectionGroup as setSelectedElectionGroupAction,
} from "#/redux/slice/electionSlice";

export interface PartyDetails {
  id?: number;
  shortName: string;
  name: string;
  logo?: string;
  slots?: number;
  agentPaymentBalanceKobo?: number;
  agentPaymentAllocation?: Record<string, number>;
}

export interface BackendParty {
  id: number;
  short_name: string;
  name: string;
  logo?: string;
  slots?: number;
  agent_payment_balance_kobo?: number;
  agent_payment_allocation?: Record<string, number>;
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
    agent_payment_balance_kobo?: number;
    agent_payment_allocation?: Record<string, number>;
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
  const isLive = useAppSelector(selectIsLive);
  const isLock = useAppSelector(selectIsLocked);

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

  console.log({ selectedElectionGroup, selectedElection });

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
        agentPaymentBalanceKobo: fetchedParty.agent_payment_balance_kobo || 0,
        agentPaymentAllocation: fetchedParty.agent_payment_allocation || {},
      }
    : user?.party?.short_name
      ? {
          id: user.party.id ?? user.party_id,
          shortName: user.party.short_name,
          name: user.party.name || "",
          logo: user.party.logo,
          slots: user.party.slots || 0,
          agentPaymentBalanceKobo: user.party.agent_payment_balance_kobo || 0,
          agentPaymentAllocation: user.party.agent_payment_allocation || {},
        }
      : user?.party_id
        ? {
            id: user.party_id,
            shortName: "",
            name: "",
            slots: 0,
            agentPaymentBalanceKobo: 0,
            agentPaymentAllocation: {},
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

  const fetchPublicParties = useServerFn(getParties);
  const { data: publicPartiesData } = useQuery({
    queryKey: ["public-parties"],
    queryFn: () => fetchPublicParties(),
  });
  const activeParties = publicPartiesData?.data?.parties || [];

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

  const fetchScopedFinalResultFn = useServerFn(getElectionScopedFinalResult);
  const fetchPollingUnitFinalResultFn = useServerFn(getPollingUnitFinalResult);

  const { data: scopedResultData, isLoading: isResultLoading } = useQuery({
    queryKey: [
      "election-scoped-final-result",
      selectedElection?.id,
      isLock,
      selectedSupervisorAssignment?.type,
      selectedSupervisorAssignment?.data?.state_id,
      selectedSupervisorAssignment?.data?.lga_id,
      selectedSupervisorAssignment?.data?.ward_id,
      pollingUnitId,
    ],
    queryFn: async () => {
      if (!isLock) {
        return fetchScopedFinalResultFn({
          data: {
            electionId: selectedElection?.id as number,
          },
        });
      }

      if (selectedSupervisorAssignment) {
        if (selectedSupervisorAssignment.type === "state") {
          return fetchScopedFinalResultFn({
            data: {
              electionId: selectedElection?.id as number,
              stateId: selectedSupervisorAssignment.data.state_id,
            },
          });
        }
        if (selectedSupervisorAssignment.type === "lga") {
          return fetchScopedFinalResultFn({
            data: {
              electionId: selectedElection?.id as number,
              lgaId: selectedSupervisorAssignment.data.lga_id,
            },
          });
        }
        if (selectedSupervisorAssignment.type === "ward") {
          return fetchScopedFinalResultFn({
            data: {
              electionId: selectedElection?.id as number,
              wardId: selectedSupervisorAssignment.data.ward_id,
            },
          });
        }
      }

      if (pollingUnitId) {
        return fetchPollingUnitFinalResultFn({
          data: {
            election_id: selectedElection?.id as number,
            polling_unit_id: pollingUnitId,
          },
        });
      }

      return fetchScopedFinalResultFn({
        data: {
          electionId: selectedElection?.id as number,
        },
      });
    },
    enabled: !!selectedElection?.id,
  });

  const finalResultObj = scopedResultData?.data?.final_result || null;

  console.log("🙌🥂 Final Result Obj:", {
    scopedResultData,
    finalResultObj,
  });

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
    activeParties,
    electionCandidates,
    finalResultObj,
    isResultLoading,
    isLive,
    setIsLive: (v: boolean) => dispatch(setIsLive(v)),
    isLock,
    setIsLocked: (v: boolean) => dispatch(setIsLocked(v)),
    electionDay,
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

export const getAutoSelectedSession = (groups: any[], elections: any[]) => {
  let selectedGroup = null;
  let selectedElection = null;

  if (groups.length > 0) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // 1. Prioritize upcoming or today's elections
    let validGroups = groups.filter((g: any) => {
      if (!g.election_date) return false;
      const d = new Date(g.election_date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() >= now.getTime();
    });

    if (validGroups.length === 0) validGroups = [...groups];

    validGroups.sort((a: any, b: any) => {
      // 2. Closeness of election date to date
      if (a.election_date && b.election_date) {
        const dA = new Date(a.election_date);
        dA.setHours(0, 0, 0, 0);
        const dB = new Date(b.election_date);
        dB.setHours(0, 0, 0, 0);

        const diffA = Math.abs(dA.getTime() - now.getTime());
        const diffB = Math.abs(dB.getTime() - now.getTime());

        if (diffA !== diffB) {
          return diffA - diffB;
        }
      }

      // 3. Fallback to rank (lower value = better rank, e.g., 1 over 2)
      return (a.rank ?? 999) - (b.rank ?? 999);
    });

    selectedGroup = validGroups[0] || null;
  }

  if (elections.length > 0 && selectedGroup) {
    const sortedElections = [...elections].sort((a: any, b: any) => {
      return (a.rank ?? 999) - (b.rank ?? 999);
    });
    selectedElection = sortedElections[0] || null;
  }

  return { selectedGroup, selectedElection };
};
