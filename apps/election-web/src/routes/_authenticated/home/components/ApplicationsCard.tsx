import { Button } from "@repo/ui/components/button";
import PollingUnitIcon from "@repo/ui/icons/polling-unit-icon";
import { useNavigate } from "@tanstack/react-router";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./Shared";

import { useQuery } from "@tanstack/react-query";
import { getApplications } from "#/lib/server/applications";
import { useAuth } from "#/hooks/useAuth";
import MapPinIcon from "@repo/ui/icons/map-pin-icon";

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

export function ApplicationsCard() {
  const navigate = useNavigate();
  const { user, selectedAssignment } = useAuth();

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
  console.log({ applicationsData });

  const activeApps = (applicationsData || []).filter((app: any) => {
    const isActiveStatus =
      app.status === "pending" ||
      app.status === "approved" ||
      app.status === "success" ||
      app.status === "accepted";
    return isActiveStatus && !isElectionInPast(app.election_date);
  });

  const appCount = activeApps.length;

  const pollingUnit =
    selectedAssignment?.polling_unit_name ||
    selectedAssignment?.polling_unit?.name ||
    "Pick Your Polling Unit";

  const state = selectedAssignment?.state_name || "State";
  const lga = selectedAssignment?.lga_name || "LGA";
  const ward = selectedAssignment?.ward_name || "Ward";

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

  return (
    <GreyCardWrapper>
      <GreyCardTitle
        label="Become a Polling Unit Agent and earn up to ₦20,000 naira on Election
        Day."
      />
      <Button
        type="button"
        variant="secondary"
        className="rounded-[16px] mt-3 text-lg"
        size="4xl"
        onClick={() => navigate({ to: "/applications/apply" })}
      >
        Apply for Free
      </Button>
    </GreyCardWrapper>
  );
}
