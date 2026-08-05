import { Button } from "@repo/ui/components/button";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./Shared";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";

interface ElectionStatusCardProps {
  hasStarted?: boolean;
  onStartClick?: () => void;
  onEndClick?: () => void;
}

export function ElectionStatusCard({
  hasStarted = false,
  onStartClick,
  onEndClick,
}: ElectionStatusCardProps) {
  return (
    <GreyCardWrapper>
      <GreyCardTopRow
        title={"Potential payout"}
        subtitle={"₦1,200"}
        icon={<FancyMoneyBagIcon className="size-5" />}
      />
      <GreyCardTitle
        label={
          hasStarted
            ? "Has election ended at your polling unit?"
            : "Has election started at your polling unit?"
        }
      />

      <Button
        type="button"
        variant="secondary"
        className="rounded-[16px] mt-1 text-lg font-bold h-[52px]"
        onClick={hasStarted ? onEndClick : onStartClick}
      >
        {hasStarted ? "Yes, it has ended" : "Yes, it has started"}
      </Button>
    </GreyCardWrapper>
  );
}
