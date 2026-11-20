interface AssignmentRoleCardProps {
  roleLabel: string;
  partyShortName?: string;
  partyLogo?: string;
}

/**
 * Displays the authenticated user's active election role and party affiliation.
 */
export function AssignmentRoleCard({
  roleLabel,
  partyShortName,
  partyLogo,
}: AssignmentRoleCardProps) {
  return (
    <div className="w-full max-w-[440px] px-4 mt-2">
      <section className="bg-c-5 rounded-[20px] px-5 py-6 flex flex-col gap-3">
        <span className="text-sm font-semibold text-c-50">You&apos;re a</span>

        <h2 className="text-[26px] leading-tight font-bold text-c-90 text-center tracking-tight">
          {roleLabel}
        </h2>

        {partyShortName && (
          <>
            <span className="text-sm font-semibold text-c-50 text-center">
              For
            </span>

            <div className="mx-auto inline-flex items-center gap-2.5 bg-c-10 rounded-xl px-5 py-2.5">
              {partyLogo && (
                <img
                  src={partyLogo}
                  alt={partyShortName}
                  className="size-6 object-contain rounded-sm"
                />
              )}
              <span className="text-xl font-bold text-c-90 tracking-tight">
                {partyShortName}
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
