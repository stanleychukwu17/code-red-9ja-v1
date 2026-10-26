import { SpiralNotebook } from "./shared/SpiralNotebook";
import { StepHeader } from "./shared/StepHeader";

/** Step 8: Election day duty agreement — Hourly situation updates pledge */
export const Step8 = () => (
  <div className="flex flex-col gap-4 w-full px-4 h-full">
    <StepHeader title="Do You Agree To Carry Out the Below Duties On Election Day?" />
    <SpiralNotebook
      text="I agree to use Free9ja on election day to give hourly updates about ongoing election at my assigned polling unit."
      color="orange"
    />
  </div>
);
