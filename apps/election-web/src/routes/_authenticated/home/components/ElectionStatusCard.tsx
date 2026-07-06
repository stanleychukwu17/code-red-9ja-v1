import { Button } from "@repo/ui/components/button";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./Shared";

interface ElectionStatusCardProps {
  pollingUnit?: string;
  state?: string;
  hasStarted?: boolean;
  onStartClick?: () => void;
  onEndClick?: () => void;
}

export function ElectionStatusCard({
  pollingUnit = "Polling Unit",
  state = "State",
  hasStarted = false,
  onStartClick,
  onEndClick,
}: ElectionStatusCardProps) {
  return (
    <GreyCardWrapper>
      <GreyCardTopRow title={pollingUnit} subtitle={state} />
      <GreyCardTitle 
        label={hasStarted ? "When election ends here, tap the button below." : "When election starts here, tap the button below."} 
      />

      <Button
        type="button"
        variant="secondary"
        className="rounded-[16px] mt-3 text-lg"
        size="4xl"
        onClick={hasStarted ? onEndClick : onStartClick}
      >
        {hasStarted ? "Election has ended" : "Election has started"}
      </Button>
    </GreyCardWrapper>
  );
}
