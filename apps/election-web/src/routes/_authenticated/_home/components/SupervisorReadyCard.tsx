import { useAppContext } from "#/hooks/useAppContext";
import { Button } from "@repo/ui/components/button";
import MapPinIcon from "@repo/ui/icons/map-pin-icon";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./Shared";

interface SupervisorReadyCardProps {
  onReadyClick: () => void;
}

export function SupervisorStartDutyCard({
  onReadyClick,
}: SupervisorReadyCardProps) {
  const { selectedSupervisorAssignment } = useAppContext();

  const data = selectedSupervisorAssignment?.data;
  const type = selectedSupervisorAssignment?.type;

  // Build the location label depending on the supervisor level
  const locationLabel = (() => {
    if (!data) return "Your Area";
    if (type === "state") {
      return [data.state_name].filter(Boolean).join(", ") || "Your State";
    }
    if (type === "lga") {
      return (
        [data.state_name, data.lga_name].filter(Boolean).join(", ") ||
        "Your LGA"
      );
    }
    if (type === "ward") {
      return (
        [data.state_name, data.lga_name, data.ward_name]
          .filter(Boolean)
          .join(", ") || "Your Ward"
      );
    }
    return "Your Area";
  })();

  return (
    <GreyCardWrapper>
      <GreyCardTopRow
        title={locationLabel}
        subtitle={"It's Election Day"}
        icon={<MapPinIcon className="size-5 text-c-60" />}
      />
      <GreyCardTitle label="Are you ready to start your Election Duties?" />

      <Button
        type="button"
        variant="purple"
        className="rounded-[16px] mt-3 text-lg"
        size="4xl"
        onClick={onReadyClick}
      >
        Yes, I am
      </Button>
    </GreyCardWrapper>
  );
}
