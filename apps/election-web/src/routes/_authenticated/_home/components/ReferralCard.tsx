import { useUser } from "#/hooks/useUser";
import { useUserParty } from "#/hooks/useUserParty";
import { AppAvatar } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import { GreyCardWrapper } from "./Shared";
import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "sonner";

/**
 * Props for `ReferralCard`.
 */
interface ReferralCardProps {
  /** Callback triggered when clicking "View Referrals" to navigate to the referrals management page */
  onClick: () => void;
  /** Optional callback invoked when the user copies their referral code to the clipboard */
  onCopyClick?: () => void;
}

/**
 * Dashboard card promoting the agent referral incentive program.
 *
 * Features:
 * - Party branding (logo and localized party title).
 * - Marketing headline displaying maximum potential earnings.
 * - Interactive copy-to-clipboard box displaying the user's personal referral code.
 * - Call-to-action button navigating to the user's referrals overview.
 */
export function ReferralCard({ onClick, onCopyClick }: ReferralCardProps) {
  // Retrieve current user details to get their unique referral code
  const user = useUser();

  // Retrieve the user's political party branding
  const { party } = useUserParty();

  // Clipboard hook for copying text to device clipboard
  const [_, copy] = useCopyToClipboard();

  // Fall back gracefully across shortName, full name, or default party name
  const partyName = party?.shortName || party?.name || "Accord";

  return (
    <GreyCardWrapper>
      {/* Party identity header with callout */}
      <div className="flex items-center justify-between gap-5">
        <AppAvatar src={party?.logo} alt="Party Logo" className="size-5" />
        <p className="text-sm text-c-50 w-full">{partyName}</p>
        <p className="text-sm text-c-50 shrink-0 font-semibold">
          Start Making Money
        </p>
      </div>

      {/* Primary promotional headline */}
      <h3 className="text-[26px] leading-8 tracking-tight text-c-80 font-bold">
        Earn up to <span className="text-purple">500k</span> referring people to
        become polling unit agents for {partyName}
      </h3>

      {/* Referral code display and click-to-copy trigger */}
      <div className="py-2 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-c-50 w-full">Referral Code:</p>

          <FancyMoneyBagIcon className="shrink-0 size-4" />
          <p className="text-sm text-c-50 shrink-0 font-semibold">
            1k per agent referred
          </p>
        </div>

        {/* Copyable referral code container */}
        <div
          className="h-14 rounded-2xl border border-c-90 bg-white flex items-center justify-center font-bold cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => {
            copy(user?.referral_code || "None yet");
            toast.success("Copied to clipboard", { position: "top-center" });
            onCopyClick?.();
          }}
        >
          <span>{user?.referral_code || "None yet"}</span>
        </div>
      </div>

      {/* Navigation action button */}
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
