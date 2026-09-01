import { Button } from "@repo/ui/components/button";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./Shared";
import PollingUnitIcon from "@repo/ui/icons/polling-unit-icon";
import { useAppContext } from "#/hooks/useAppContext";
import { useQuery } from "@tanstack/react-query";
import {
  getPotentialPayout,
  getEstimatePayout,
} from "#/lib/server/practice_tests";

interface ArrivalCardProps {
  onArrivedClick: () => void;
}

export function ArrivalCard({ onArrivedClick }: ArrivalCardProps) {
  const { selectedAssignment, selectedElectionGroup, party } = useAppContext();
  const assignmentId = selectedAssignment?.id;

  const { data: potentialPayout } = useQuery({
    queryKey: [
      "taskPayout",
      "attendance",
      assignmentId ?? "no-assignment",
      selectedElectionGroup?.id,
      party?.id,
    ],
    queryFn: async () => {
      if (assignmentId) {
        const res = await getPotentialPayout({
          data: { assignmentId, taskType: "attendance" },
        });
        if (res?.success && res.data?.payout) {
          return (res.data.payout.potential_payout_kobo ?? 0) / 100;
        }
      }
      const estRes = await getEstimatePayout({
        data: {
          taskType: "attendance",
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

  const pollingUnit = selectedAssignment?.polling_unit_name || "Polling Unit";
  const state = selectedAssignment?.state_name || "State";
  const lga = selectedAssignment?.lga_name || "LGA";
  const ward = selectedAssignment?.ward_name || "Ward";
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
      <GreyCardTitle label="Have you arrived at your polling unit?" />

      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <PollingUnitIcon className="shrink-0 size-7 text-c-60" />
          <span className="text-c-50">Your Polling Unit</span>
        </div>
        <p className="w-full font-semibold text-c-80 leading-6">
          {pollingUnit}
        </p>
        <p className="text-sm text-c-50 mt-1">
          State: {state} | LGA: {lga} | Ward: {ward}
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
