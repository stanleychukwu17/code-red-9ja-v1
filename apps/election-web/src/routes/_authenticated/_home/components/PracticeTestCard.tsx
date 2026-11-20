import { Button } from "@repo/ui/components/button";
import { useNavigate } from "@tanstack/react-router";
import { GreyCardTopRow, GreyCardWrapper } from "./Shared";
import { Target } from "lucide-react";

/**
 * Practice Test & Training Drill Card.
 *
 * Prompts agents and citizens to complete election day simulator drills
 * under `/_authenticated/practice/`. Repeated drills reinforce compliance
 * and maximize reward multipliers.
 */
export function PracticeTestCard() {
  const navigate = useNavigate();

  return (
    <GreyCardWrapper>
      {/* Header with target icon */}
      <GreyCardTopRow
        title={`Take Practice Test`}
        icon={<Target className="size-4 text-c-60" />}
      />

      {/* Motivational incentive and learning copy */}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[26px] leading-8 tracking-tight text-c-80 font-bold">
          Take Election Day Practice Test 10 Times To Make The Most Amount Of
          Money
        </h3>

        <p className="text-c-50 text-[15px] font-medium leading-6">
          This helps you know the things you must do come election day.
        </p>
      </div>

      {/* Launcher action button */}
      <Button
        onClick={() => navigate({ to: "/practice" })}
        className="w-full rounded-2xl h-[52px] text-[17px] font-bold mt-1"
        variant="black"
      >
        Take test
      </Button>
    </GreyCardWrapper>
  );
}

/**
 * Practice Test Coming Soon Card.
 *
 * Displays a lightweight placeholder on home dashboards while the
 * practice test simulator is being refined.
 */
export function PracticeTestComingSoonCard() {
  return (
    <GreyCardWrapper>
      <GreyCardTopRow
        title="Practice Test"
        icon={<Target className="size-4 text-c-60" />}
      />

      <div className="flex flex-col gap-1.5 py-1">
        <h3 className="text-[20px] leading-7 tracking-tight text-c-80 font-bold">
          Practice test coming soon
        </h3>
        <p className="text-c-50 text-[14px] font-medium leading-5">
          Interactive simulation drills will be available soon.
        </p>
      </div>
    </GreyCardWrapper>
  );
}

