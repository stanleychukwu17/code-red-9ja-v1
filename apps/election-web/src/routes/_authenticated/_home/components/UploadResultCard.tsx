import { Button } from "@repo/ui/components/button";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import { AlertTriangleIcon } from "lucide-react";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./Shared";
import { useAppContext } from "#/hooks/useAppContext";
import { useQuery } from "@tanstack/react-query";
import {
  getPotentialPayout,
  getEstimatePayout,
} from "#/lib/server/practice_tests";

export function UploadResultCard({ onClick }: { onClick: () => void }) {
  const { selectedAssignment, selectedElectionGroup, party } = useAppContext();
  const assignmentId = selectedAssignment?.id;

  const { data: potentialPayout } = useQuery({
    queryKey: [
      "taskPayout",
      "results",
      assignmentId ?? "no-assignment",
      selectedElectionGroup?.id,
      party?.id,
    ],
    queryFn: async () => {
      if (assignmentId) {
        const res = await getPotentialPayout({
          data: { assignmentId, taskType: "results" },
        });
        if (res?.success && res.data?.payout) {
          return (res.data.payout.potential_payout_kobo ?? 0) / 100;
        }
      }
      const estRes = await getEstimatePayout({
        data: {
          taskType: "results",
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
      <GreyCardTitle label="When election is over. Take a picture & video of the final vote result paper and upload." />

      <Button
        type="button"
        variant="secondary"
        className="rounded-[16px] mt-1 text-lg font-bold h-[52px]"
        onClick={onClick}
      >
        Upload Voting Result
      </Button>

      <div className="mt-1 bg-red-100/60 text-[#E02D3C] rounded-[12px] p-3 text-sm font-semibold flex items-start gap-2 border border-red-100">
        <AlertTriangleIcon className="size-5 shrink-0 mt-0.5" />
        If you miss uploading this, you won't be paid.
      </div>
    </GreyCardWrapper>
  );
}
