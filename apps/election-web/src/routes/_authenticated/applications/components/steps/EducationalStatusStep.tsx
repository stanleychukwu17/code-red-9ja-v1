import { SelectableCard } from "@repo/ui/components/cards/Rewards";
import { StepHeader } from "./shared/StepHeader";

/**
 * EducationalStatusStep
 * Screens the applicant's current educational standing (graduate, student, none)
 * to evaluate role eligibility (e.g., supervisor roles often require tertiary completion).
 */
export const EducationalStatusStep = ({
  educationalStatus,
  setEducationalStatus,
}: any) => {
  const options = [
    { label: "I am a graduate", value: "graduate" },
    { label: "I'm a student", value: "student" },
    { label: "None of the above", value: "none" },
  ];
  return (
    <div className="flex flex-col gap-4 w-full px-4">
      <StepHeader
        title="Which option best describes you?"
        subtitle="Increase your acceptance and assignment opportunity."
      />
      <div className="space-y-3 mt-2">
        {options.map((opt) => (
          <SelectableCard
            key={opt.value}
            title={opt.label}
            subtitle=""
            isSelected={educationalStatus === opt.value}
            onClick={() => setEducationalStatus(opt.value)}
          />
        ))}
      </div>
    </div>
  );
};
