import { Button } from "@repo/ui/components/button";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./Shared";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import { useAppContext } from "#/hooks/useAppContext";
import { useQuery } from "@tanstack/react-query";
import {
  getPotentialPayout,
  getEstimatePayout,
} from "#/lib/server/practice_tests";

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
  const { selectedAssignment, selectedElectionGroup, party } = useAppContext();
  const assignmentId = selectedAssignment?.id;
  const taskType = hasStarted ? "election_end" : "election_start";

  const { data: potentialPayout } = useQuery({
    queryKey: [
      "taskPayout",
      taskType,
      assignmentId ?? "no-assignment",
      selectedElectionGroup?.id,
      party?.id,
    ],
    queryFn: async () => {
      if (assignmentId) {
        const res = await getPotentialPayout({
          data: { assignmentId, taskType },
        });
        if (res?.success && res.data?.payout) {
          return (res.data.payout.potential_payout_kobo ?? 0) / 100;
        }
      }
      const estRes = await getEstimatePayout({
        data: {
          taskType,
          role: "polling_agent",
          electionGroupId: selectedElectionGroup?.id ?? undefined,
          partyId: party?.id ?? undefined,
        },
      });
      if (estRes?.success && estRes.data?.payout) {
        return (estRes.data.payout.potential_payout_kobo ?? 0) / 100;
      }
      return undefined;
    },
  });

  const formattedPayout =
    potentialPayout !== undefined
      ? `₦${potentialPayout.toLocaleString()}`
      : "₦1,200";

  return (
    <GreyCardWrapper>
      <GreyCardTopRow
        title={"Potential payout"}
        subtitle={formattedPayout}
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
