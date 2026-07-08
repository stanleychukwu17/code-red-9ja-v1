import PollingUnitIcon from "@repo/ui/icons/polling-unit-icon";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./-Shared";
import { Button } from "@repo/ui/components/button";

interface ArrivalCardProps {
  pollingUnit?: string;
  state?: string;
  onArrivedClick: () => void;
}

export function ArrivalCard({
  pollingUnit = "Polling Unit",
  state = "State",
  onArrivedClick,
}: ArrivalCardProps) {
  return (
    <GreyCardWrapper>
      <GreyCardTopRow title={pollingUnit} subtitle={state} />
      <GreyCardTitle label="Have you arrived at your polling unit?" />

      <Button
        type="button"
        variant="purple"
        className="rounded-[16px] mt-3 text-lg"
        size="4xl"
        onClick={onArrivedClick}
      >
        Yes, I've arrived
      </Button>
    </GreyCardWrapper>
  );
}
