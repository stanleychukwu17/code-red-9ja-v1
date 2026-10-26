import { Input, Label } from "@repo/ui/components/input";
import { SelectDropdown } from "./shared/SelectDropdown";
import { StepHeader } from "./shared/StepHeader";

/**
 * EducationalDetailsStep
 * Collects academic credentials with dynamic labels and graduation year ranges
 * tailored to whether the candidate is an enrolled student or an alumnus.
 */
export const EducationalDetailsStep = ({
  educationalStatus,
  highestDegree,
  setHighestDegree,
  graduationYear,
  setGraduationYear,
  schoolName,
  setSchoolName,
}: any) => {
  // Dynamically tailor text and choices for active students vs graduates
  const isStudent = educationalStatus === "student";
  const title = isStudent
    ? "Current Educational Details"
    : "Educational Qualification";
  const subtitle = isStudent
    ? "Tell us about your current studies."
    : "Verify your highest qualification.";

  return (
    <div className="flex flex-col gap-4 w-full px-4">
      <StepHeader title={title} subtitle={subtitle} />
      <div className="space-y-7 mt-2">
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
        {/* Graduation Year - prospective years for students, retrospective for grads */}
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
    </div>
  );
};
