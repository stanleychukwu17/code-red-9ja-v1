import { useAssignments } from "#/hooks/useAssignments";
import { Button } from "@repo/ui/components/button";
import MapPinIcon from "@repo/ui/icons/map-pin-icon";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./Shared";

/**
 * Props for `SupervisorStartDutyCard`.
 */
interface SupervisorReadyCardProps {
  /** Callback invoked when the supervisor confirms they are ready to commence duties */
  onReadyClick: () => void;
}

/**
 * Dashboard card prompting election supervisors (State, LGA, or Ward level)
 * to begin their supervisory duties on election day.
 */
export function SupervisorStartDutyCard({
  onReadyClick,
}: SupervisorReadyCardProps) {
  // Retrieve active supervisor assignment details from useAssignments hook
  const { selectedSupervisorAssignment } = useAssignments();

  const data = selectedSupervisorAssignment?.data;
  const type = selectedSupervisorAssignment?.type;

  // Dynamically construct jurisdictional label based on supervisor hierarchy level
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
      {/* Top row with geographic area and election day badge */}
      <GreyCardTopRow
        title={locationLabel}
        subtitle={"It's Election Day"}
        icon={<MapPinIcon className="size-5 text-c-60" />}
      />

      {/* Callout prompt */}
      <GreyCardTitle label="Are you ready to start your Election Duties?" />

      {/* Action button confirming readiness to begin duties */}
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
