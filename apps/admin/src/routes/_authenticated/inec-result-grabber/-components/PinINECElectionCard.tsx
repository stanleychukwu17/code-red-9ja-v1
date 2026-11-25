import { useState } from "react";

export type INECElectionPreview = {
  _id: string;
  full_name: string;
  election_date: string;
  domain?: { _id: string; name: string };
  state?: { state_id: number; name: string } | null;
};

type PinINECElectionCardProps = {
  elections: INECElectionPreview[];
  selectedElectionId: string;
  onSelect: (electionId: string) => void;
};

export function PinINECElectionCard({ elections, selectedElectionId, onSelect }: PinINECElectionCardProps) {
  const [search, setSearch] = useState<string>("");

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = normalizedSearch
    ? elections.filter(
      (el) =>
        el.full_name.toLowerCase().includes(normalizedSearch) ||
        (el.domain?.name ?? "").toLowerCase().includes(normalizedSearch),
    )
    : elections;

  return (
    <div className="rounded-xl border border-c-15 bg-white p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-c-100">
            2. Pin Exact INEC Election ({normalizedSearch ? `${filtered.length} of ${elections.length}` : `${elections.length} found`})
          </h2>
          <p className="text-[13px] text-c-50 mt-0.5">
            Select the exact upstream INEC election to load its LGAs and Wards.
          </p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or domain..."
          className="w-full sm:w-64 rounded-lg border border-c-20 bg-white px-3 py-1.5 text-[13px] text-c-100"
        />
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-[13px] text-c-50">
            No elections match &ldquo;{search}&rdquo;.
          </div>
        ) : (
          filtered.map((el) => {
            const isSelected = selectedElectionId === el._id;
            return (
              <button
                key={el._id}
                type="button"
                onClick={() => onSelect(el._id)}
                className={`w-full text-left rounded-lg border px-4 py-3 transition ${isSelected
                    ? "border-c-100 bg-c-5"
                    : "border-c-15 hover:border-c-30"
                  }`}
              >
                <div className="text-[14px] font-medium text-c-100">
                  {el.full_name}
                </div>
                <div className="text-[12px] text-c-50 mt-0.5">
                  ID: {el._id} &middot; Date: {el.election_date?.slice(0, 10)}
                  {el.state?.name ? ` · State: ${el.state.name}` : ""}
                  {el.domain?.name ? ` · Domain: ${el.domain.name}` : ""}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
