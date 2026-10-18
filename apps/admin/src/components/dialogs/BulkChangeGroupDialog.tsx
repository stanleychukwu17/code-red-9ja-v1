import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ElectionGroupBullet } from "@repo/ui/components/bullets/election-group-bullet";
import { getElectionGroups } from "#/lib/server/election_groups";
import { bulkUpdateElectionGroup } from "#/lib/server/elections";
import { TinyError } from "@repo/ui/components/custom/TinyError";
import type { ElectionInstanceType } from "../tiles/election-instance-tile";
import { toast } from "sonner";
import { QUERY_KEYS } from "#/lib/config";

// Props for the dialog handling bulk reassignment of election instances to a new group
export type BulkChangeGroupDialogProps = {
  open: boolean;
  onClose: () => void;
  selectedElections: ElectionInstanceType[];
  onSuccess?: () => void;
};

// Modal dialog allowing administrators to reassign multiple selected elections to a target election group
export function BulkChangeGroupDialog({ open, onClose, selectedElections, onSuccess }: BulkChangeGroupDialogProps) {
  // Target election group selected by the admin
  const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>(
    undefined,
  );
  // Submission or validation error message
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Determine if all selected elections share a common current election group
  const commonGroupId =
    selectedElections.length > 0 &&
    selectedElections.every(
      (e) => e.election_group_id === selectedElections[0]?.election_group_id,
    )
      ? selectedElections[0]?.election_group_id
      : undefined;

  // Mutation to batch-reassign selected elections to the new election group
  const updateMutation = useMutation({
    mutationFn: async () => {
      // Validate that an election group and at least one election are selected
      if (!selectedGroupId) {
        throw new Error("Please select an election group");
      }
      if (selectedElections.length === 0) {
        throw new Error("No elections selected");
      }
      if (commonGroupId && selectedGroupId === commonGroupId) {
        throw new Error(
          "Selected elections are already assigned to this election group",
        );
      }

      // Send the bulk update payload to the backend
      const res = await bulkUpdateElectionGroup({
        data: {
          election_ids: selectedElections.map((e) => e.id),
          election_group_id: selectedGroupId,
          from_election_group_id: commonGroupId,
        },
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to update election group");
      }
      return res;
    },
    onSuccess: (res) => {
      // Notify admin and invalidate relevant TanStack Query caches
      toast.success(
        res.message ||
        `Successfully reassigned ${selectedElections.length} elections.`,
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.elections.all });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      // Display error banner on failure
      setError(err?.message || "Something went wrong. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-120 p-0 rounded-2xl border-none shadow-2xl overflow-visible">
        {/* Modal title */}
        <DialogHeader title="Change Election Group" />

        <DialogPadding className="space-y-4 pb-6">
          {/* Error alert banner */}
          <TinyError error={error} />

          {/* Description summary of selected items */}
          <p className="text-sm text-c-60 leading-relaxed">
            Reassign{" "}
            <span className="font-bold text-c-90">
              {selectedElections.length}
            </span>{" "}
            selected election{selectedElections.length === 1 ? "" : "s"} to a
            different Election Group.
          </p>

          {/* Target election group picker */}
          <div className="pt-2 flex flex-col gap-2">
            <span className="text-xs font-semibold text-c-70 uppercase tracking-wide">
              Target Election Group
            </span>
            <div className="flex items-center">
              <ElectionGroupBullet
                selectedId={selectedGroupId}
                variant="bullet"
                update={(item) => {
                  setSelectedGroupId(item.id);
                  setError(null);
                }}
                fetchElectionGroups={getElectionGroups}
              />
            </div>
          </div>
        </DialogPadding>

        {/* Modal actions */}
        <DialogFooter className="flex items-center justify-end gap-3 px-6 pb-6">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => updateMutation.mutate()}
            disabled={
              !selectedGroupId ||
              selectedGroupId === commonGroupId ||
              updateMutation.isPending
            }
            className="h-11 px-6 bg-success hover:bg-success-hover text-[16px] font-bold text-white rounded-xl cursor-pointer flex items-center gap-2"
          >
            {updateMutation.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Update {selectedElections.length} Elections
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
