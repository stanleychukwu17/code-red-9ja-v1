import { useAssignments } from "#/hooks/useAssignments";
import { useParties } from "#/hooks/useParties";

type AssignmentRoleCardProps = {
  roleLabel: string;
};

/**
 * Displays the authenticated user's active election role and party affiliation.
 */
export function AssignmentRoleCard({ roleLabel }: AssignmentRoleCardProps) {
  const { partyId } = useAssignments();
  const { data: parties } = useParties({ enabled: !!partyId });
  const party = parties?.find((p) => p.id === partyId);

  return (
    <div className="w-full max-w-110 px-4 my-3">
      <section className="bg-sidebar-softer/60 rounded-[20px] px-5 py-6 flex flex-col gap-3">
        <h2 className="text-[26px] leading-tight font-bold text-c-90 text-center tracking-tight">
          {roleLabel}
        </h2>

        {party && (
          <>
            <div className="mx-auto inline-flex items-center gap-2.5 bg-sidebar-mobile rounded-xl px-5 py-2.5 mt-2">
              {party.logo && (
                <img
                  src={party.logo}
                  alt={party.short_name}
                  className="size-6 object-contain rounded-full"
                />
              )}
              <span className="text-xl font-bold text-c-90 tracking-tight">
                {party.short_name}
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
