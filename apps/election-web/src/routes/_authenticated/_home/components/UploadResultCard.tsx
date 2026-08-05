import { Button } from "@repo/ui/components/button";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import { AlertTriangleIcon } from "lucide-react";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./Shared";

export function UploadResultCard({ onClick }: { onClick: () => void }) {
  return (
    <GreyCardWrapper>
      <GreyCardTopRow
        title={"Potential payout"}
        subtitle={"₦1,200"}
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
