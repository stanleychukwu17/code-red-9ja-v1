import { Button } from "@repo/ui/components/button";
import PollingUnitIcon from "@repo/ui/icons/polling-unit-icon";
import { useNavigate } from "@tanstack/react-router";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./-Shared";

interface AgentCardProps {
  appCount: number;
  pollingUnit?: string;
  state?: string;
}

export function AgentCard({
  appCount,
  pollingUnit = "Pick Your Polling Unit",
  state = "State",
}: AgentCardProps) {
  const navigate = useNavigate();

  if (appCount > 0) {
    return (
      <GreyCardWrapper>
        <GreyCardTopRow title={pollingUnit} subtitle={state} />
        <GreyCardTitle label={`${appCount} Active Applications`} />
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
      <GreyCardTopRow title={pollingUnit} subtitle={state} />
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
