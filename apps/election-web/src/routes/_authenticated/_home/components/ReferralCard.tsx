import { useAuth } from "#/hooks/useAuth";
import { AppAvatar } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import { GreyCardWrapper } from "./Shared";
import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "sonner";

export function ReferralCard({ onClick }: { onClick: () => void }) {
  const { party } = useAuth();
  const referralCode = "DAN-40";
  const [_, copy] = useCopyToClipboard();

  return (
    <GreyCardWrapper>
      <div className="flex items-center justify-between gap-5">
        <AppAvatar src={party?.logo} alt="Party Logo" className="size-5" />
        <p className="text-sm text-c-50 w-full">{party.shortName}</p>
        <p className="text-sm text-c-50 shrink-0 font-semibold">
          Start Making Money
        </p>
      </div>
      <h3 className="text-[26px] leading-8 tracking-tight text-c-80 font-bold">
        Earn up to <span className="text-purple">500k</span> referring people to
        become polling unit agents for Accord
      </h3>

      <div className="py-2 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-c-50 w-full">Referral Code:</p>

          <FancyMoneyBagIcon className="shrink-0 size-4" />
          <p className="text-sm text-c-50 shrink-0 font-semibold">
            1k per agent
          </p>
        </div>
        <div
          className="h-14 rounded-2xl border border-c-90 bg-white flex items-center justify-center font-bold cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => {
            copy(referralCode);
            toast.success("Copied to clipboard", { position: "top-center" });
          }}
        >
          <span>{referralCode}</span>
        </div>
      </div>

      <Button
        type="button"
        variant="purple"
        className="rounded-[16px] mt-1 text-lg font-bold h-[52px]"
        onClick={onClick}
      >
        View Referrals
      </Button>
    </GreyCardWrapper>
  );
}
