import { SpiralNotebook } from "./shared/SpiralNotebook";
import { StepHeader } from "./shared/StepHeader";

/** Step 9: Election day duty agreement — Malpractice reporting pledge */
export const Step9 = () => (
  <div className="flex flex-col gap-4 w-full px-4 h-full">
    <StepHeader title="Do You Agree To Carry Out the Below Duties On Election Day?" />
    <SpiralNotebook
      text="I agree to report any irregularities that take place at my polling unit (e.g., Vote Buying, Ballot Box Snatching, & more)"
      color="red"
    />
  </div>
);
