import { useMutation } from "@tanstack/react-query";
import { syncINECMongoIDs } from "#/lib/server/inec_grabber";
import type { INECElectionPreview } from "./PinINECElectionCard";

type SyncMongoIDsCardProps = {
  selectedElection?: INECElectionPreview;
};

export function SyncMongoIDsCard({ selectedElection }: SyncMongoIDsCardProps) {
  const syncIDsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedElection?._id) {
        throw new Error("Pin an INEC election in Step 2 first");
      }
      const res = await syncINECMongoIDs({
        data: { inecElectionId: selectedElection._id },
      });
      if (!res?.success) {
        throw new Error(res?.message || "Failed to sync LGA/Ward IDs");
      }
      return res.data as { lgas_synced: number; wards_synced: number };
    },
  });

  return (
    <div className="rounded-xl border border-c-15 bg-white p-6 space-y-4">
      <div>
        <h2 className="text-[16px] font-semibold text-c-100">
          4. Sync All States LGAs &amp; Wards to DB
        </h2>
        <p className="text-[13px] text-c-50 mt-0.5">
          Backfills INEC <code>mongo_id</code> values onto your local{" "}
          <code>lgas</code> and <code>wards</code> tables so future scrapes and
          single-PU checks can jump straight to ward results without re-fetching
          LGA lists.{" "}
          <span className="font-medium text-c-80">
            Best run with a Presidential (nationwide) election pinned
          </span>{" "}
          so all 37 states (36 states + FCT) are synced in one pass.
        </p>
      </div>

      <div className="rounded-lg bg-c-5 px-4 py-3 text-[13px] text-c-70">
        {selectedElection ? (
          <>
            <span className="font-medium text-c-100">Selected Election:</span>{" "}
            {selectedElection.full_name}{" "}
            <span className="text-c-50">({selectedElection._id})</span>
          </>
        ) : (
          "No INEC election pinned yet — select one in Step 2 above to enable syncing."
        )}
      </div>

      {syncIDsMutation.error instanceof Error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {syncIDsMutation.error.message}
        </div>
      )}

      {syncIDsMutation.isSuccess && syncIDsMutation.data && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] text-blue-800">
          Synced {syncIDsMutation.data.lgas_synced} LGA(s) and{" "}
          {syncIDsMutation.data.wards_synced} ward(s) mongo_ids to DB.
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => syncIDsMutation.mutate()}
          disabled={!selectedElection?._id || syncIDsMutation.isPending}
          className="rounded-lg border border-c-20 bg-white px-4 py-2 text-[13px] font-medium text-c-80 hover:bg-c-5 disabled:opacity-50"
        >
          {syncIDsMutation.isPending ? "Syncing All 37 States..." : "Sync All States LGAs/Wards to DB"}
        </button>
      </div>
    </div>
  );
}
