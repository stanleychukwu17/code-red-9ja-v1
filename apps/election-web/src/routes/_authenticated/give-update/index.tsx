import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import { cn } from "@repo/ui/lib/utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RewardCard, RewardSumCard } from "@repo/ui/components/cards/Rewards";
import { Button } from "@repo/ui/components/button";
import { DescriptiveText, TitleText } from "@repo/ui/components/custom/Texts";
import { PageHeader } from "#/components/Headers";
import { StickyFooter } from "#/components/Footers";
import { PageWrapper } from "#/components/Wrappers";

export const Route = createFileRoute("/_authenticated/give-update/")({
  component: GiveUpdateIntro,
});

function GiveUpdateIntro() {
  const navigate = useNavigate();

  return (
    <PageWrapper>
      <PageHeader />

      <div className="px-4 space-y-8">
        <TitleText
          text="Give us an update on what's happening at your polling unit"
          size="lg"
        />

        <div className="flex flex-col gap-4">
          {[
            {
              label: "Take video evidence reward",
              value: "+₦1,200",
              bg: "bg-[#FDF2D4]",
            },
            {
              label: "Take picture evidence reward",
              value: "+₦300",
              bg: "bg-[#FDF2D4]",
            },
            { label: "Give update reward", value: "+₦500", bg: "bg-[#FDF2D4]" },
          ].map((item, i) => (
            <RewardCard
              key={i}
              label={item.label}
              value={item.value}
              variant="yellow"
            />
          ))}

          <RewardSumCard
            label="Potential pay"
            subtext="Pay so far"
            value="+₦2,000"
            subValue="₦3,829.00 total"
            variant="purple"
          />
        </div>

        <DescriptiveText
          text="Please take quality video or picture to ensure you qualify for the
        maximum payment. Falsified video or picture uploads will disqualify you
        from payout"
        />
      </div>

      <StickyFooter>
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="deepGrey"
            size="4xl"
            className="w-full"
            onClick={() => navigate({ to: "/give-update/report" })}
          >
            Take Picture
          </Button>
          <Button
            type="button"
            variant="deepGrey"
            size="4xl"
            className="w-full"
            onClick={() => navigate({ to: "/give-update/report" })}
          >
            Take Video
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="4xl"
          className="w-full"
          onClick={() => navigate({ to: "/give-update/report" })}
        >
          Skip
        </Button>
      </StickyFooter>
    </PageWrapper>
  );
}
