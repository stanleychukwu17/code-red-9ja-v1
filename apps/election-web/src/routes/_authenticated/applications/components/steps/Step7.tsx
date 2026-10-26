import { SpiralNotebook } from "./shared/SpiralNotebook";
import { StepHeader } from "./shared/StepHeader";

/** Step 7: Election day duty agreement — 7:00 AM arrival pledge */
export const Step7 = () => (
  <div className="flex flex-col gap-4 w-full px-4 h-full">
    <StepHeader title="Do You Agree To Carry Out the Below Duties On Election Day?" />
    <SpiralNotebook
      text="I agree to arrive at my assigned polling unit on election day before 7:00 AM."
      color="purple"
    />
  </div>
);
