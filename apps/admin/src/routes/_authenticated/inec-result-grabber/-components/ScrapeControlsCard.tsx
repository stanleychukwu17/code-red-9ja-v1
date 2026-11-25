import { useQuery } from "@tanstack/react-query";
import { previewINECLGAs } from "#/lib/server/inec_grabber";
import { getStates } from "#/lib/server/states";
import { SearchableSelect } from "./SearchableSelect";

type StatePreview = {
  id: number;
  name: string;
};

type INECWardPreview = {
  _id: string;
  name: string;
  code: string;
};

type INECLGAPreview = {
  _id: string;
  name: string;
  wards: INECWardPreview[];
};

export type ScrapeOptions = {
  scopeStateId: string;
  lgaId: string;
  wardId: string;
  maxPUs: string;
  uploadToR2: boolean;
  saveToLocal: boolean;
  aiExtract: boolean;
  force: boolean;
};

type ScrapeControlsCardProps = {
  value: ScrapeOptions;
  selectedInecElectionId: string;
  stateId?: string;
  isRunning: boolean;
  errorMessage: string;
  statusMessage: string;
  onChange: (next: ScrapeOptions) => void;
  onRun: () => void;
};

export function ScrapeControlsCard({
  value,
  selectedInecElectionId,
  stateId,
  isRunning,
  errorMessage,
  statusMessage,
  onChange,
  onRun,
}: ScrapeControlsCardProps) {
  // Nigerian states (cached/shared with DiscoverElectionsCard) for drilling down LGAs
  const { data: statesRes, isLoading: isLoadingStates } = useQuery({
    queryKey: ["states", "for-inec-scrape"],
    queryFn: async () => {
      const res = await getStates({ data: { countryId: 161, limit: 100 } });
      if (res?.success && res.data) {
        return (res.data.states ?? res.data) as StatePreview[];
      }
      return [];
    },
    staleTime: Infinity,
  });

  const effectiveStateId = stateId || value.scopeStateId;

  // Load LGAs and wards for the pinned upstream INEC election (cached per election + state)
  const { data: lgasRes, isFetching: isLoadingLGAs, error: lgasError } = useQuery({
    queryKey: ["inec-lgas", selectedInecElectionId, effectiveStateId],
    queryFn: async () => {
      const res = await previewINECLGAs({
        data: {
          inecElectionId: selectedInecElectionId,
          stateId: effectiveStateId ? Number(effectiveStateId) : undefined,
        },
      });
      if (!res?.success) {
        throw new Error(res?.message || "Failed to fetch LGAs and wards");
      }
      return (res.data?.lgas ?? []) as INECLGAPreview[];
    },
    enabled: !!selectedInecElectionId,
    staleTime: Infinity,
  });

  const states = statesRes ?? [];
  const lgas = lgasRes ?? [];
  const selectedLga = lgas.find((l) => l._id === value.lgaId);
  const wards = selectedLga?.wards ?? [];
  const displayError =
    errorMessage || (lgasError instanceof Error ? lgasError.message : "");

  return (
    <div className="rounded-xl border border-c-15 bg-white p-6 space-y-5">
      <div>
        <h2 className="text-[16px] font-semibold text-c-100">
          3. Scope &amp; Cost Controls
        </h2>
        <p className="text-[13px] text-c-50 mt-0.5">
          Optionally narrow to one LGA/Ward and cap PUs. Matching local
          elections are linked automatically; otherwise results are saved with
          election_id = NULL.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-[13px] font-medium text-c-80 mb-1.5">
            State (LGA Drill-down)
          </label>
          <SearchableSelect
            value={effectiveStateId}
            options={states.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder={isLoadingStates ? "Loading states..." : "All States"}
            searchPlaceholder="Search State..."
            disabled={!!stateId || !selectedInecElectionId || isLoadingStates}
            onChange={(nextStateId) =>
              onChange({
                ...value,
                scopeStateId: nextStateId,
                lgaId: "",
                wardId: "",
              })
            }
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-c-80 mb-1.5">
            LGA (Optional)
          </label>
          <SearchableSelect
            value={value.lgaId}
            options={lgas.map((l) => ({ value: l._id, label: l.name }))}
            placeholder={isLoadingLGAs ? "Loading LGAs..." : lgas.length === 0 ? "All LGAs (pin election first)" : "All LGAs"}
            searchPlaceholder="Search LGA..."
            disabled={lgas.length === 0 || isLoadingLGAs}
            onChange={(lgaId) => onChange({ ...value, lgaId, wardId: "" })}
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-c-80 mb-1.5">
            Ward (Optional)
          </label>
          <SearchableSelect
            value={value.wardId}
            options={wards.map((w) => ({ value: w._id, label: w.name }))}
            placeholder="All Wards"
            searchPlaceholder="Search Ward..."
            disabled={!value.lgaId || wards.length === 0}
            onChange={(wardId) => onChange({ ...value, wardId })}
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-c-80 mb-1.5">
            Max PUs (0 = Unlimited)
          </label>
          <input
            type="number"
            min={0}
            placeholder="e.g. 5"
            value={value.maxPUs}
            onChange={(e) => onChange({ ...value, maxPUs: e.target.value })}
            className="w-full rounded-lg border border-c-20 bg-white px-3 py-2 text-[14px] text-c-100"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 pt-1 text-[14px] text-c-80">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value.uploadToR2}
            onChange={(e) =>
              onChange({ ...value, uploadToR2: e.target.checked })
            }
          />
          Upload sheets to R2
        </label>
        {import.meta.env.DEV && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value.saveToLocal}
              onChange={(e) =>
                onChange({ ...value, saveToLocal: e.target.checked })
              }
            />
            Save sheets to local folder (dev only)
          </label>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value.aiExtract}
            onChange={(e) =>
              onChange({ ...value, aiExtract: e.target.checked })
            }
          />
          Run Gemini AI OCR
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value.force}
            onChange={(e) => onChange({ ...value, force: e.target.checked })}
          />
          Force run (ignore paused/completed)
        </label>
      </div>

      {displayError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {displayError}
        </div>
      )}

      {statusMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-[13px] text-green-800">
          {statusMessage}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onRun}
          disabled={!selectedInecElectionId || isRunning}
          className="rounded-lg bg-c-100 px-5 py-2.5 text-[14px] font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isRunning ? "Running Controlled Scrape..." : "Run Controlled Scrape"}
        </button>
      </div>
    </div>
  );
}
