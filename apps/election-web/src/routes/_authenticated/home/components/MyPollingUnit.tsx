import { Button } from "@repo/ui/components/button";
import PollingUnitIcon from "@repo/ui/icons/polling-unit-icon";
import PlusIcon from "@repo/ui/icons/plus-icon";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "#/hooks/useAuth";
import LockedIcon from "@repo/ui/icons/locked-icon";
import UnLockedIcon from "@repo/ui/icons/unlocked-icon";
import { cn } from "@repo/ui/lib/utils";

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

export function MyPollingUnit() {
  const navigate = useNavigate();
  const { selectedAssignment, isLive, setIsLive, isLock, setIsLocked } =
    useAuth();

  const pollingUnitName =
    selectedAssignment?.polling_unit_name ||
    selectedAssignment?.polling_unit?.name;
  const hasNoPollingUnit = !pollingUnitName;

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
          onClick={() => navigate({ to: "/update-polling-unit" })}
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

  return (
    <div className="px-4 mb-3 flex items-center justify-between gap-3">
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
      <div
        onClick={() => setIsLive(!isLive)}
        className={cn(
          "size-11 bg-c-10 rounded-full flex items-center justify-center shrink-0 font-extrabold text-sm cursor-pointer",
          isLive && "bg-[#54a0ff]/15 text-[#54a0ff]",
        )}
      >
        <p className="text-lg">{isLive ? "L" : "F"}</p>
      </div>
      <div
        onClick={() => setIsLocked(!isLock)}
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
