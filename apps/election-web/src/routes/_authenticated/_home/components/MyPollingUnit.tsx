import { Button } from "@repo/ui/components/button";
import PollingUnitIcon from "@repo/ui/icons/polling-unit-icon";
import PlusIcon from "@repo/ui/icons/plus-icon";
import { useNavigate } from "@tanstack/react-router";
import { useElection } from "#/hooks/useElection";
import { useAssignments } from "#/hooks/useAssignments";
import LockedIcon from "@repo/ui/icons/locked-icon";
import UnLockedIcon from "@repo/ui/icons/unlocked-icon";
import { cn } from "@repo/ui/lib/utils";

/**
 * Fallback padlock SVG icon used for locking state visualization.
 */
const LockIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 2C9.243 2 7 4.243 7 7v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7c0-2.757-2.243-5-5-5zm-3 5c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7zm3 11.5c-1.103 0-2-.897-2-2s.897-2 2-2 2 .897 2 2-.897 2-2 2z" />
  </svg>
);

interface MyPollingUnitProps {
  /** Optional interceptor callback fired during practice simulation sessions */
  onPracticeClick?: () => void;
}

/**
 * Dashboard Polling Unit Banner.
 *
 * Displays the agent's assigned polling unit name and geographic details.
 * If no polling unit is associated with the user's assignment, renders a CTA
 * button redirecting to the polling unit setup flow (`/update-polling-unit`).
 *
 * Also provides quick developer/admin toggle indicators for Live election mode
 * and assignment lock status.
 */
export function MyPollingUnit({ onPracticeClick }: MyPollingUnitProps) {
  const navigate = useNavigate();
  const { isLive, setIsLive, isLock, setIsLocked } = useElection();
  const { selectedAssignment } = useAssignments();

  // Intercepts user interactions when inside a practice/training flow
  const interceptClick = (e: React.MouseEvent, action: () => void) => {
    if (onPracticeClick) {
      e.preventDefault();
      e.stopPropagation();
      onPracticeClick();
      return;
    }
    action();
  };

  // Derive polling unit name from assignment record
  const pollingUnitName =
    selectedAssignment?.polling_unit_name ||
    selectedAssignment?.polling_unit?.name;
  const hasNoPollingUnit = !pollingUnitName;

  // Unconfigured state: Show call-to-action to select/add a polling unit
  if (hasNoPollingUnit) {
    return (
      <div className="px-4 mb-3 flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <PollingUnitIcon className="size-8 shrink-0" />
          <h3 className="text-[#A4863A] font-semibold text-base">
            Add Your Polling Unit
          </h3>
        </div>
        <Button
          onClick={(e) =>
            interceptClick(e, () => navigate({ to: "/update-polling-unit" }))
          }
          variant="secondary"
          size="sm"
          className="rounded-full px-3"
        >
          <PlusIcon className="size-5" />
          Add
        </Button>
      </div>
    );
  }

  // Assigned state: Show polling unit details, live mode toggle, and lock indicator
  return (
    <div className="px-4 mb-3 flex items-center justify-between gap-3">
      {/* Polling unit icon and geographic location tags */}
      <div className="flex items-center space-x-1">
        <PollingUnitIcon className="size-8 shrink-0" />
        <div className="">
          <h3 className="text-[#1D3A2F] font-semibold text-sm line-clamp-1">
            {pollingUnitName}
          </h3>
          <div className="text-c-50 text-sm line-clamp-1">
            LGA: EGOR | Ward: OTUBO | State: Federal Capital Territory
          </div>
        </div>
      </div>

      {/* Live / Simulated toggle button (L = Live, F = False/Simulated) */}
      <div
        onClick={(e) => interceptClick(e, () => setIsLive(!isLive))}
        className={cn(
          "size-11 bg-c-10 rounded-full flex items-center justify-center shrink-0 font-extrabold text-sm cursor-pointer",
          isLive && "bg-[#54a0ff]/15 text-[#54a0ff]",
        )}
      >
        <p className="text-lg">{isLive ? "L" : "F"}</p>
      </div>

      {/* Lock / Unlock assignment status toggle badge */}
      <div
        onClick={(e) => interceptClick(e, () => setIsLocked(!isLock))}
        className={cn(
          "size-11 bg-[#4A2D1B]/15 text-[#4A2D1B] rounded-full flex items-center justify-center shrink-0 font-semibold text-sm cursor-pointer",
          !isLock && "bg-purple/15 text-purple",
        )}
      >
        {isLock && <LockedIcon className="w-4 h-4" />}
        {!isLock && <UnLockedIcon className="w-4 h-4" />}
      </div>
    </div>
  );
}
