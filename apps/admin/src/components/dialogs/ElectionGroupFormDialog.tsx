/**
 * @file Election Group Form Dialog
 * @description Modal dialog used in the admin portal to create or update an Election Group
 * (e.g. "2027 General Elections"), managing its display name and cycle year.
 */

import { useState, useEffect } from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "#/lib/config";
import {
  createElectionGroup,
  updateElectionGroup,
} from "#/lib/server/election_groups";
import { Loader2 } from "lucide-react";
import { FancyInput } from "@repo/ui/components/input";
import { SelectDate } from "@repo/ui/components/selects/date-select";
import type { ElectionGroupType } from "../tiles/election-group-tile";
import { TinyError } from "@repo/ui/components/custom/TinyError";

export type ElectionGroupFormDialogProps = {
  electionGroup?: ElectionGroupType;
  open: boolean;
  onClose: () => void;
  mode?: "create" | "update";
  onSuccess?: (groupId: number, date?: string) => void;
};

export function ElectionGroupFormDialog({ electionGroup, open, onClose, mode = "create", onSuccess }: ElectionGroupFormDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // TanStack Form configuration with default values and submit handler
  const form = useForm({
    defaultValues: {
      name: "",
      election_date: "",
      active: true,
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  // Synchronize form fields whenever the modal opens or the target group changes
  useEffect(() => {
    if (open) {
      if (mode === "update" && electionGroup) {
        const rawDate = electionGroup.election_date
          ? electionGroup.election_date.split("T")[0]
          : "";

        form.setFieldValue("name", electionGroup.name || "");
        form.setFieldValue("election_date", rawDate || "");
        form.setFieldValue("active", electionGroup.active !== false);
      } else {
        form.setFieldValue("name", "");
        form.setFieldValue("election_date", "");
        form.setFieldValue("active", true);
      }
      setError(null);
    }
  }, [open, mode, electionGroup]);

  // Mutation handling group creation and updates
  const saveMutation = useMutation({
    mutationFn: async (values: { name: string; election_date: string; active: boolean }) => {
      if (!values.election_date) {
        throw new Error("Election date is required");
      }

      let res;
      if (mode === "update") {
        if (!electionGroup?.id) {
          throw new Error("Missing ID for update");
        }
        res = await updateElectionGroup({
          data: {
            id: electionGroup.id,
            name: values.name.trim(),
            election_date: values.election_date,
            active: values.active,
          },
        });
      } else {
        res = await createElectionGroup({
          data: {
            name: values.name.trim(),
            election_date: values.election_date,
          },
        });
      }

      if (!res.success) {
        throw new Error(res.message || `Failed to ${mode} election group`);
      }
      return res.data;
    },

    onSuccess: (data, variables) => {
      // Invalidate relevant caches to refresh tables and dropdowns across the portal
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.electionGroups.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.electionGroups.select });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.elections.all });
      onSuccess?.(data.id, variables.election_date);
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-145 p-0 rounded-2xl border-none shadow-2xl overflow-visible">
        {/* Dynamic dialog title based on current operation mode */}
        <DialogHeader
          title={
            mode === "update"
              ? "Update Election Group"
              : "Create Election Group"
          }
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogPadding className="space-y-6 pb-6">
            {/* Server / validation error display banner */}
            <TinyError error={error} />

            {/* Large title input for election group name */}
            <div className="w-full">
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Election group name is required" : undefined,
                }}
                children={(field) => (
                  <div className="w-full">
                    <FancyInput
                      type="text"
                      placeholder="Election group name"
                      errorMsg={field.state.meta.errors?.join(", ")}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full text-[28px] font-semibold text-c-80 placeholder:text-c-30 outline-none bg-transparent"
                    />
                  </div>
                )}
              />
            </div>

            {/* Election Date input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-c-50">
                Election Date
              </label>
              <form.Field
                name="election_date"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Election date is required" : undefined,
                }}
                children={(field) => (
                  <SelectDate
                    selectedId={field.state.value}
                    update={(value) => {
                      const cleanVal = value ? (value.split("T")[0] ?? "") : "";
                      field.handleChange(cleanVal);
                    }}
                    errorMsg={field.state.meta.errors?.join(", ")}
                  />
                )}
              />
            </div>

            {/* Active Status toggle (when updating) */}
            {mode === "update" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-c-50">
                  Status
                </label>
                <form.Field
                  name="active"
                  children={(field) => (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => field.handleChange(true)}
                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${field.state.value
                            ? "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400 font-semibold"
                            : "border-c-20 text-c-50 hover:bg-c-10"
                          }`}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() => field.handleChange(false)}
                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${!field.state.value
                            ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                            : "border-c-20 text-c-50 hover:bg-c-10"
                          }`}
                      >
                        Inactive
                      </button>
                    </div>
                  )}
                />
                <p className="text-[12px] text-c-40">
                  Inactive election groups are excluded from creation dropdown menus.
                </p>
              </div>
            )}
          </DialogPadding>

          {/* Form submit button with loading spinner */}
          <DialogFooter>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="h-11 px-6 bg-success hover:bg-success-hover text-[16px] font-bold text-white rounded-xl cursor-pointer flex items-center gap-2"
            >
              {saveMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {mode === "update" ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
