import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import FancyAgentIcon from "@repo/ui/icons/fancy-agent-icon";

type RequiredActionsSectionProps = {
  hasSlots: boolean;
  hasAgentPaymentBalance: boolean;
  hasPaymentAllocation: boolean;
  hasMarketingSetup: boolean;
  onBuySlots: () => void;
  onDepositPayment: () => void;
  onDepositMarketing: () => void;
  onPaymentAllocation: () => void;
};

type ActionBannerProps = {
  title: string;
  description: string;
  buttonLabel: string;
  bgClass: string;
  onClick?: () => void;
};

/**
 * ActionBanner Component
 *
 * Colored call-to-action banner card displaying an onboarding task with an actionable trigger button.
 */
export function ActionBanner({
  title,
  description,
  buttonLabel,
  bgClass,
  onClick,
}: ActionBannerProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-start justify-between p-5 rounded-[20px] gap-4",
        bgClass,
      )}
    >
      <FancyAgentIcon className="shrink-0 size-6" />
      <div className="space-y-1 w-full">
        <h3 className="font-semibold text-lg text-c-90">{title}</h3>
        <p className="text-c-70 text-sm">{description}</p>
      </div>
      <Button onClick={onClick} variant="black" size="lg" className="px-4">
        {buttonLabel}
      </Button>
    </div>
  );
}

/**
 * RequiredActionsSection Component
 *
 * Urgent operational checklist showing pending onboarding tasks for the party:
 * - Buy Slots: Licenses needed to accept agent application requests.
 * - Deposit Payment: Escrow account funding for agent stipends.
 * - Set Payment Allocation: Specifying NGN stipend amounts per state and role.
 * - Setup Marketing: Outbound SMS/Email recruitment campaigns.
 * Disappears automatically once all 4 requirements are fulfilled.
 */
export function RequiredActionsSection({
  hasSlots,
  hasAgentPaymentBalance,
  hasPaymentAllocation,
  hasMarketingSetup,
  onBuySlots,
  onDepositPayment,
  onDepositMarketing,
  onPaymentAllocation,
}: RequiredActionsSectionProps) {
  const allCompleted =
    hasSlots &&
    hasAgentPaymentBalance &&
    hasPaymentAllocation &&
    hasMarketingSetup;

  if (allCompleted) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-c-90">Required Actions</h2>
      <div className="space-y-4">
        {!hasSlots && (
          <ActionBanner
            title="Buy Slots for Election Agents"
            description="Slots allow you accept agent requests for upcoming elections."
            buttonLabel="Buy Slots"
            bgClass="bg-[#FFDAAA]/50"
            onClick={onBuySlots}
          />
        )}
        {!hasAgentPaymentBalance && (
          <ActionBanner
            title="Deposit Agent Payment"
            description="Deposit party agent election day payment."
            buttonLabel="Deposit Agent Payment"
            bgClass="bg-purple/20"
            onClick={onDepositPayment}
          />
        )}
        {!hasPaymentAllocation && (
          <ActionBanner
            title="Set Agent Payment Allocation"
            description="Configure how much each agent role gets paid per state."
            buttonLabel="Set Agent Payment Allocation"
            bgClass="bg-[#2ecc71]/20"
            onClick={onPaymentAllocation}
          />
        )}
        {!hasMarketingSetup && (
          <ActionBanner
            title="Setup Agent Marketing"
            description="Acquire agents for the upcoming election. This is the fastest way to get agents for your party (Highly Recommended)."
            buttonLabel="Setup Agent Marketing"
            bgClass="bg-[#0984E3]/20"
            onClick={onDepositMarketing}
          />
        )}
      </div>
    </div>
  );
}
