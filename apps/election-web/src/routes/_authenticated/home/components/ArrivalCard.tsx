import { Button } from "@repo/ui/components/button";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./Shared";
import PollingUnitIcon from "@repo/ui/icons/polling-unit-icon";
import { useAuth } from "#/hooks/useAuth";

interface ArrivalCardProps {
  onArrivedClick: () => void;
}

export function ArrivalCard({ onArrivedClick }: ArrivalCardProps) {
  const { selectedAssignment } = useAuth();

  const pollingUnit = selectedAssignment?.polling_unit_name || "Polling Unit";
  const state = selectedAssignment?.state_name || "State";
  const lga = selectedAssignment?.lga_name || "LGA";
  const ward = selectedAssignment?.ward_name || "Ward";
  return (
    <GreyCardWrapper>
      <GreyCardTopRow
        title={"Potential payout"}
        subtitle={"₦1,200"}
        icon={<FancyMoneyBagIcon className="size-5" />}
      />
      <GreyCardTitle label="Have you arrived at your polling unit?" />

      <div className="flex flex-col">
        <div className="flex items-center gap-3 ">
          <p className="text-c-50 w-full">
            Polling Unit:
            <span className="ml-1 font-semibold text-c-80">{pollingUnit}</span>
          </p>
          <PollingUnitIcon className="size-10 text-c-60" />
        </div>
        <p className="text-sm text-c-50">
          {state}, {lga}, {ward}
        </p>
      </div>

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
