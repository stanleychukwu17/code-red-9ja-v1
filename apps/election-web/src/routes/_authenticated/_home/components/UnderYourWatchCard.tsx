import { CircleCheck } from "lucide-react";
import { useAssignments } from "#/hooks/useAssignments";

/**
 * Lists the elections under the active assignment's watch.
 */
export function UnderYourWatchCard() {
  const { elections } = useAssignments();

  if (elections.length === 0) return null;

  return (
    <section className="w-full max-w-110 px-5 py-2 flex flex-col gap-4">
      <div className="bg-sidebar-mobile px-4 py-2.5 rounded-md w-fit">
        <h3 className="text-sm font-bold text-c-90">Under your watch today</h3>
      </div>

      <ul className="flex flex-col gap-4">
        {elections.map((election: any) => (
          <li key={election.id} className="flex items-center gap-3.5">
            <CircleCheck
              className="size-6 text-[#5B21B6] shrink-0"
              strokeWidth={1.75}
            />
            <span className="text-base font-bold text-c-90">
              {election.name}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
