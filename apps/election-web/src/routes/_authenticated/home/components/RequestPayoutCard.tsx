import { Button } from "@repo/ui/components/button";
import { GreyCardTitle, GreyCardWrapper } from "./Shared";

export function RequestPayoutCard() {
  return (
    <GreyCardWrapper>
      <GreyCardTitle label="Request Payout. We will review your work and ensure you completed ur objectives before granting payout." />

      <Button
        type="button"
        variant="black"
        className="rounded-[16px] mt-1 text-lg font-bold h-[52px]"
        onClick={() => {}}
      >
        Request Payout
      </Button>
    </GreyCardWrapper>
  );
}
