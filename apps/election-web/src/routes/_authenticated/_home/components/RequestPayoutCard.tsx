import { Button } from "@repo/ui/components/button";
import { GreyCardTitle, GreyCardWrapper } from "./Shared";

/**
 * Duty Payout Request Card.
 *
 * Rendered after election operations conclude (election ended & results uploaded):
 * Prompts polling unit agents or supervisors to submit their duty log for party
 * administration review to disburse their accrued task earnings.
 */
export function RequestPayoutCard({ onClick }: { onClick: () => void }) {
  return (
    <GreyCardWrapper>
      {/* Payout review requirement advisory */}
      <GreyCardTitle label="Request Payout. We will review your work and ensure you completed ur objectives before granting payout." />

      {/* Submission action button */}
      <Button
        type="button"
        variant="black"
        className="rounded-[16px] mt-1 text-lg font-bold h-[52px]"
        onClick={onClick}
      >
        Request Payout
      </Button>
    </GreyCardWrapper>
  );
}
