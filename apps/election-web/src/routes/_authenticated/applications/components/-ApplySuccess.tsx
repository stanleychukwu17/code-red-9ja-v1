import { useNavigate } from "@tanstack/react-router";
import { PageWrapper } from "#/components/Wrappers";
import { PageHeader } from "#/components/Headers";
import { StickyFooter } from "#/components/Footers";
import { Button } from "@repo/ui/components/button";
import { TitleText, DescriptiveText } from "@repo/ui/components/custom/Texts";
import { BossIllustration } from "./-ApplySteps";

export function ApplySuccess() {
  const navigate = useNavigate();
  return (
    <PageWrapper>
      <PageHeader />
      <div className="w-full flex flex-col justify-between px-4 pt-4 pb-20 min-h-screen">
        <div className="flex flex-col gap-5 w-full">
          <div className="space-y-1">
            <TitleText text="Congrats, Your Application Submitted Successfully!" />
            <DescriptiveText text="If qualified, you'll be accepted shortly." />
          </div>
          <div className="mt-4"><BossIllustration /></div>
        </div>
      </div>
      <StickyFooter>
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          onClick={() => navigate({ to: "/home" })}
        >
          Go to Home
        </Button>
      </StickyFooter>
    </PageWrapper>
  );
}
