import { BossIllustration } from "./shared/BossIllustration";
import { StepHeader } from "./shared/StepHeader";

/** Step 1: Agent role welcome splash */
export const Step1 = () => (
  <div className="flex flex-col gap-2 px-4">
    <StepHeader
      title="Become a Party agent"
      subtitle="Ensure your polling unit's vote counts."
    />
    <BossIllustration />
  </div>
);
