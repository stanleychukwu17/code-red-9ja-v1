import { Input, Label } from "@repo/ui/components/input";
import { SelectableCard } from "@repo/ui/components/cards/Rewards";
import { useApplyContext } from "../../context/ApplyContext";
import { SelectDropdown } from "./shared/SelectDropdown";
import { StepHeader } from "./shared/StepHeader";

/**
 * EducationalStep
 * Combines applicant educational status screening (graduate, student, none)
 * and degree/credential details into a single cohesive step.
 * All state is derived directly from ApplyContext.
 */
export const EducationalStep = () => {
  const {
    educationalStatus,
    setEducationalStatus,
    highestDegree,
    setHighestDegree,
    graduationYear,
    setGraduationYear,
    schoolName,
    setSchoolName,
  } = useApplyContext();

  const options = [
    { label: "I am a graduate", value: "graduate" },
    { label: "I'm a student", value: "student" },
    { label: "None of the above", value: "none" },
  ];

  const isStudent = educationalStatus === "student";
  const showDetails = educationalStatus && educationalStatus !== "none";

  return (
    <div className="flex flex-col gap-6 w-full px-4">
      <div className="space-y-4">
        <StepHeader
          title="Which option best describes you?"
          subtitle="Increase your acceptance and assignment opportunity."
        />
        <div className="space-y-3">
          {options.map((opt) => (
            <SelectableCard
              key={opt.value}
              title={opt.label}
              subtitle=""
              isSelected={educationalStatus === opt.value}
              onClick={() => {
                setEducationalStatus(opt.value);
                if (opt.value === "none") {
                  setHighestDegree("");
                  setGraduationYear("");
                  setSchoolName("");
                }
              }}
            />
          ))}
        </div>
      </div>

      {showDetails && (
        <div className="space-y-7 pt-2">
          {/* Degree Certificate Level */}
          <div className="flex flex-col gap-2">
            <Label
              title={
                isStudent ? "Degree to be obtained?" : "Highest Academic degree?"
              }
            />
            <SelectDropdown
              value={highestDegree}
              update={setHighestDegree}
              placeholder="Select Degree"
              options={[
                {
                  label: "Primary School Certificate",
                  value: "primary",
                },
                {
                  label: "Secondary School Certificate",
                  value: "secondary",
                },
                {
                  label: "Polytechnic (OND / HND)",
                  value: "polytechnic",
                },
                { label: "Bachelors", value: "bachelors" },
                { label: "Masters", value: "masters" },
                { label: "PhD", value: "phd" },
              ]}
            />
          </div>

          {/* Graduation Year */}
          <div className="flex flex-col gap-2">
            <Label
              title={
                isStudent
                  ? "Which year will you be graduating?"
                  : "Which year did you graduate?"
              }
            />
            <SelectDropdown
              value={graduationYear}
              update={setGraduationYear}
              placeholder="Select Year"
              options={
                isStudent
                  ? Array.from({ length: 11 }, (_, i) => {
                    const year = String(new Date().getFullYear() + i);
                    return { label: year, value: year };
                  })
                  : Array.from({ length: 71 }, (_, i) => {
                    const year = String(new Date().getFullYear() - i);
                    return { label: year, value: year };
                  })
              }
            />
          </div>

          {/* Institution / College Name */}
          <div className="flex flex-col gap-2">
            <Label
              title={
                isStudent
                  ? "What is the name of your school?"
                  : "What is the name of the school?"
              }
            />
            <Input
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Enter school name"
              className="h-14 rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
