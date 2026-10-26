import { SpiralNotebook } from "./shared/SpiralNotebook";
import { StepHeader } from "./shared/StepHeader";

/** Step 10: Election day duty agreement — Result sheet upload pledge */
export const Step10 = () => (
  <div className="flex flex-col gap-4 w-full px-4 h-full">
    <StepHeader title="Do You Agree To Carry Out the Below Duties On Election Day?" />
    <SpiralNotebook
      text="I agree to snap and upload my polling unit result sheet form (EC8 Form) at the end of voting else I may not get paid."
      color="darkblue"
    />
  </div>
);
