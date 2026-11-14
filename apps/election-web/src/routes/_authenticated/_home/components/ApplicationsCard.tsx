import { Button } from "@repo/ui/components/button";
import PollingUnitIcon from "@repo/ui/icons/polling-unit-icon";
import { useNavigate } from "@tanstack/react-router";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./Shared";

import { useQuery } from "@tanstack/react-query";
import { getApplications } from "#/lib/server/applications";
import { QUERY_KEYS } from "#/lib/config";
import { useUser } from "#/hooks/useUser";
import { useAssignments } from "#/hooks/useAssignments";
import MapPinIcon from "@repo/ui/icons/map-pin-icon";
import { TitleText } from "@repo/ui/components/custom/Texts";
import { Target } from "lucide-react";


/**
 * Dashboard card displaying polling unit agent application status.
 *
 * Renders in two distinct states:
 * 1. Active Applications State: If the user has one or more pending/approved applications
 *    for upcoming elections, displays the count, assigned location, and a preview button.
 * 2. Recruitment Pitch State: If the user has no active applications, displays an earnings
 *    incentive ("Earn ₦20k to ₦150k") and prompts them to apply for an agent role.
 */
export function ApplicationsCard() {
  const navigate = useNavigate();
  const user = useUser();
  const { pollingUnitAssignment, supervisorAssignment, isLoading: isAssignmentsLoading } = useAssignments();
  const hasAssignedRole = Boolean(pollingUnitAssignment || supervisorAssignment);

  // Query polling agent applications submitted by the current user
  const { data: applicationsData } = useQuery({
    queryKey: QUERY_KEYS.pollingAgentApplications(user?.id),
    enabled: !!user?.id && !hasAssignedRole && !isAssignmentsLoading,
    staleTime: Infinity,
    queryFn: async () => {
      const res = await getApplications({
        data: { user_id: user?.id, status: "pending", active_election_only: true },
      });
      if (!res || !res.success || !res.data?.applications) {
        return [];
      }
      return res.data.applications;
    },
  });

  // If the user already has an active duty assignment as an agent or supervisor, do not render application card
  if (hasAssignedRole) {
    return null;
  }

  // Filter applications that are currently active (not rejected/cancelled).
  // Note: Past / ended elections are filtered directly at the DB level via active_election_only: true.
  const activeApps = (applicationsData || []).filter((app: any) => {
    return (
      app.status === "pending" ||
      app.status === "approved" ||
      app.status === "success" ||
      app.status === "accepted"
    );
  });

  const appCount = activeApps.length;

  // Location hierarchy labels from active application or assignment fallback
  const firstApp = activeApps[0];
  const state = firstApp?.state_name || pollingUnitAssignment?.state_name || "State";
  const lga = firstApp?.lga_name || pollingUnitAssignment?.lga_name || "LGA";
  const ward = firstApp?.ward_name || pollingUnitAssignment?.ward_name || "Ward";

  // STATE 1: User has existing active applications -> Show summary and preview CTA
  if (appCount > 0) {
    return (
      <GreyCardWrapper>
        <div className="space-y-2">
          <GreyCardTopRow
            title={`${state}, ${lga}, ${ward}`}
            icon={<MapPinIcon className="size-4 text-c-60" />}
          />
          <GreyCardTitle label={`${appCount} Active Applications`} />
        </div>
        <Button
          type="button"
          variant="outline"
          className="rounded-2xl mt-3 text-lg"
          size="4xl"
          onClick={() => navigate({ to: "/applications" })}
        >
          Preview Applications
        </Button>
      </GreyCardWrapper>
    );
  }

  // STATE 2: User has no active applications -> Show recruitment invitation CTA
  return (
    <GreyCardWrapper>
      <div className="space-y-2">
        <GreyCardTopRow
          title={`Apply now`}
          icon={<Target className="size-4 text-c-60" />}
        />
      </div>
      <TitleText
        text={
          <>
            Earn <span className="text-purple">₦20k to ₦150k</span> on election
            day as a polling unit agent.
          </>
        }
        className="text-c-80"
        size="lg"
      />
      <Button
        type="button"
        variant="purple"
        className="rounded-2xl mt-3 text-lg"
        size="4xl"
        onClick={() => navigate({ to: "/applications/apply" })}
      >
        Apply for Free
      </Button>
    </GreyCardWrapper>
  );
}
