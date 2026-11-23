import { MapPin } from "lucide-react";
import { SectionTitle } from "#/components/separator/SectionTitle";
import { useAssignments } from "#/hooks/useAssignments";

/**
 * Displays the user's assigned geographic designation (State, LGA, Ward, PU)
 * for the active election duty.
 */
export function DesignationCard() {
  const { pollingUnitAssignment, supervisorAssignment } = useAssignments();
  const assignment = supervisorAssignment?.data ?? pollingUnitAssignment;

  const items = [
    { label: "State:", value: assignment?.state_name },
    { label: "Lga:", value: assignment?.lga_name },
    { label: "Ward:", value: assignment?.ward_name },
    { label: "PU:", value: assignment?.polling_unit_name },
  ].filter((item) => Boolean(item.value));

  if (items.length === 0) return null;

  return (
    <section className="w-full py-2 flex flex-col gap-4">
      <SectionTitle>Your Designation for today</SectionTitle>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5 min-w-0">
            <MapPin
              className="size-5 text-[#5B21B6] shrink-0"
              strokeWidth={1.75}
            />
            <span className="text-sm font-bold text-c-90 shrink-0">
              {item.label}
            </span>
            <span className="text-sm font-bold text-c-90 truncate">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
