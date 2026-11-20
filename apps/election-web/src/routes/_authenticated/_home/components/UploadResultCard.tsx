import { Button } from "@repo/ui/components/button";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import { AlertTriangleIcon } from "lucide-react";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./Shared";
import { useAgentAllocations } from "#/hooks/useAgentAllocations";

/**
 * Props for `UploadResultCard`.
 */
interface UploadResultCardProps {
  /** Callback triggered to navigate to the result sheet upload flow */
  onClick: () => void;
}

/**
 * Dashboard card prompting polling unit agents to photograph, record, and upload
 * the official polling unit result sheet (Form EC8A) once counting has completed.
 *
 * Displays the potential payout reward and a strict warning that uploading the
 * official result sheet is mandatory for agent payout.
 */
export function UploadResultCard({ onClick }: UploadResultCardProps) {
  // Query potential payout reward from the shared allocations cache
  const { getPayoutNaira } = useAgentAllocations();
  const potentialPayout = getPayoutNaira("results");

  // Format payout as currency (defaulting to ₦1,200 placeholder if un-configured)
  const formattedPayout =
    potentialPayout !== undefined
      ? `₦${potentialPayout.toLocaleString()}`
      : "₦1,200";

  return (
    <GreyCardWrapper>
      {/* Incentive header showing potential payout */}
      <GreyCardTopRow
        title={"Potential payout"}
        subtitle={formattedPayout}
        icon={<FancyMoneyBagIcon className="size-5" />}
      />

      {/* Instructions for photographing and recording the result sheet */}
      <GreyCardTitle label="When election is over. Take a picture & video of the final vote result paper and upload." />

      {/* Action button navigating to the result upload flow */}
      <Button
        type="button"
        variant="secondary"
        className="rounded-2xl mt-1 text-lg font-bold h-[52px]"
        onClick={onClick}
      >
        Upload Voting Result
      </Button>

      {/* Mandatory task warning banner */}
      <div className="mt-1 bg-red-100/60 text-[#E02D3C] rounded-12 p-3 text-sm font-semibold flex items-start gap-2 border border-red-100">
        <AlertTriangleIcon className="size-5 shrink-0 mt-0.5" />
        If you miss uploading this, you won't be paid.
      </div>
    </GreyCardWrapper>
  );
}
