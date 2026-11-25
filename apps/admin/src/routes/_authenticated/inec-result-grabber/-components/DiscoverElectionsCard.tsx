import { useQuery } from "@tanstack/react-query";
import { getOffices } from "#/lib/server/offices";
import { getStates } from "#/lib/server/states";

type DiscoverOfficeItem = {
  id: number;
  name: string;
  scope: string;
  inec_election_type_id?: string | null;
};

type DiscoverStateItem = {
  id: number;
  name: string;
};

export type DiscoverFilter = {
  officeId: string;
  stateId: string;
  year: string;
};

type DiscoverElectionsCardProps = {
  value: DiscoverFilter;
  isFetching: boolean;
  onChange: (next: DiscoverFilter) => void;
  onDiscover: () => void;
};

export function DiscoverElectionsCard({
  value,
  isFetching,
  onChange,
  onDiscover,
}: DiscoverElectionsCardProps) {
  // Contested offices (used to map local election type -> inec_election_type_id)
  const { data: officesRes, isLoading: isLoadingOffices } = useQuery({
    queryKey: ["offices", "for-inec-scrape"],
    queryFn: async () => {
      const res = await getOffices({ data: { limit: 100, contested: true } });
      if (res?.success && res.data) {
        return (res.data.offices ?? res.data) as DiscoverOfficeItem[];
      }
      return [];
    },
    staleTime: Infinity,
  });

  // Nigerian states (countryId 161) for optional state-level INEC election filtering
  const { data: statesRes, isLoading: isLoadingStates } = useQuery({
    queryKey: ["states", "for-inec-scrape"],
    queryFn: async () => {
      const res = await getStates({ data: { countryId: 161, limit: 100 } });
      if (res?.success && res.data) {
        return (res.data.states ?? res.data) as DiscoverStateItem[];
      }
      return [];
    },
    staleTime: Infinity,
  });

  // Only show offices that map to an upstream INEC election type ID
  const offices = (officesRes ?? []).filter((o) => !!o.inec_election_type_id);
  const states = statesRes ?? [];

  return (
    <div className="rounded-xl border border-c-15 bg-white p-6 space-y-5">
      <div>
        <h2 className="text-[16px] font-semibold text-c-100">
          1. Discover INEC Elections (Past or Live)
        </h2>
        <p className="text-[13px] text-c-50 mt-0.5">
          Query INEC IReV directly by Office, State (optional), and Year — no
          local election required to browse.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[13px] font-medium text-c-80 mb-1.5">
            Election Type (Office)
          </label>
          <select
            value={value.officeId}
            onChange={(e) => onChange({ ...value, officeId: e.target.value })}
            disabled={isLoadingOffices}
            className="w-full rounded-lg border border-c-20 bg-white px-3 py-2 text-[14px] text-c-100"
          >
            <option value="">
              {isLoadingOffices ? "Loading offices..." : "Select office..."}
            </option>
            {offices.map((o) => (
              <option key={o.id} value={String(o.id)}>
                {o.name} ({o.scope})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-c-80 mb-1.5">
            State (Optional)
          </label>
          <select
            value={value.stateId}
            onChange={(e) => onChange({ ...value, stateId: e.target.value })}
            disabled={isLoadingStates}
            className="w-full rounded-lg border border-c-20 bg-white px-3 py-2 text-[14px] text-c-100"
          >
            <option value="">
              {isLoadingStates ? "Loading states..." : "All / Nationwide"}
            </option>
            {states.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-c-80 mb-1.5">
            Target Year
          </label>
          <input
            type="number"
            min={1999}
            max={2100}
            placeholder="e.g. 2023"
            value={value.year}
            onChange={(e) => onChange({ ...value, year: e.target.value })}
            className="w-full rounded-lg border border-c-20 bg-white px-3 py-2 text-[14px] text-c-100"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onDiscover}
          disabled={!value.officeId || isFetching}
          className="rounded-lg bg-c-100 px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isFetching ? "Searching INEC IReV..." : "Discover INEC Elections"}
        </button>
      </div>
    </div>
  );
}
