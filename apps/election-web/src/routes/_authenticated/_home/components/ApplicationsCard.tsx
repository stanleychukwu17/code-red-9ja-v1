import { Button } from "@repo/ui/components/button";
import PollingUnitIcon from "@repo/ui/icons/polling-unit-icon";
import { useNavigate } from "@tanstack/react-router";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./Shared";

import { useQuery } from "@tanstack/react-query";
import { getApplications } from "#/lib/server/applications";
import { useUser } from "#/hooks/useUser";
import { useAssignments } from "#/hooks/useAssignments";
import MapPinIcon from "@repo/ui/icons/map-pin-icon";
import { TitleText } from "@repo/ui/components/custom/Texts";
import { Target } from "lucide-react";

/**
 * Checks whether an election date is strictly in the past (before today at 00:00:00).
 * Supports ISO string dates and SQL timestamp objects (`{ Time: string }`).
 *
 * @param val - Raw date string or timestamp object
 * @returns True if the election date occurred before today, false otherwise
 */
const isElectionInPast = (val: any) => {
  const dateStr = val?.Time || val;
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const electionDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = new Date();
    const currentDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    return electionDay.getTime() < currentDay.getTime();
  } catch (e) {
    return false;
  }
};

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
  const { selectedAssignment } = useAssignments();

  // Query polling agent applications submitted by the current user
  const { data: applicationsData } = useQuery({
    queryKey: ["pollingAgentApplications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await getApplications({ data: { user_id: user?.id } });
      if (!res || !res.success || !res.data?.applications) {
        return [];
      }
      return res.data.applications;
    },
  });

  // Filter applications that are currently active (not rejected/cancelled) and for future elections
  const activeApps = (applicationsData || []).filter((app: any) => {
    const isActiveStatus =
      app.status === "pending" ||
      app.status === "approved" ||
      app.status === "success" ||
      app.status === "accepted";
    return isActiveStatus && !isElectionInPast(app.election_date);
  });

  const appCount = activeApps.length;

  // Location hierarchy labels from active assignment
  const pollingUnit =
    selectedAssignment?.polling_unit_name ||
    selectedAssignment?.polling_unit?.name ||
    "Pick Your Polling Unit";

  const state = selectedAssignment?.state_name || "State";
  const lga = selectedAssignment?.lga_name || "LGA";
  const ward = selectedAssignment?.ward_name || "Ward";

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
          className="rounded-[16px] mt-3 text-lg"
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
        className="rounded-[16px] mt-3 text-lg"
        size="4xl"
        onClick={() => navigate({ to: "/applications/apply" })}
      >
        Apply for Free
      </Button>
    </GreyCardWrapper>
  );
}
