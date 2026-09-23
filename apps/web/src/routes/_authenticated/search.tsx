import { createFileRoute } from "@tanstack/react-router";
import { UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { PageSearchLayer } from "@repo/ui/components/custom/AdminLayouts";
import { SEARCH_PEOPLE_RESULTS } from "#/data/dashboard";

export const Route = createFileRoute("/_authenticated/search")({
  component: RouteComponent,
});

function RouteComponent() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return SEARCH_PEOPLE_RESULTS;

    return SEARCH_PEOPLE_RESULTS.filter((item) =>
      [item.name, item.subtitle].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [query]);

  return (
    <div className="flex-1 px-4 pb-8 pt-6 md:px-12 md:pt-7">
      <div className="mx-auto flex w-full max-w-155 flex-col gap-6">
        <h1 className="text-[34px] font-bold tracking-[-0.04em] text-[#232124] dark:text-neutral-100">
          Search Users
        </h1>

        <PageSearchLayer
          placeholder="Search by name or location..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          inputClassName="max-w-none w-full"
        />

        <section className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
          {results.length > 0 ? (
            results.map((person) => (
              <button
                key={person.name}
                type="button"
                className="flex h-16 w-full items-center gap-4 text-left transition hover:bg-black/5 dark:hover:bg-white/5 px-2 rounded-xl"
              >
                <img
                  src={person.image}
                  alt={person.name}
                  className="size-11 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-medium text-[#161315] dark:text-neutral-100 truncate">
                    {person.name}
                  </p>
                  <p className="text-[12px] text-[#8b8589] dark:text-neutral-400 truncate">
                    {person.subtitle}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center text-gray-500 dark:text-neutral-400 gap-2">
              <UserX className="size-8 text-[#8e898b] dark:text-neutral-500" />
              <p className="text-[15px] font-medium text-neutral-800 dark:text-neutral-200">
                No users found
              </p>
              <p className="text-[13px] text-[#8e898b] dark:text-neutral-400">
                Try adjusting your search terms
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
