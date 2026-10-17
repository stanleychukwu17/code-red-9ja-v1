/**
 * @file Election Instance Form Dialog
 * @description Modal dialog used in the admin portal to update an existing Election Instance.
 * Displays locked contested office and territory context while allowing edits to the election
 * name, scheduled election date, and parent election group.
 */

import { useState, useMemo, useEffect } from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
  DialogToolbelt,
} from "@repo/ui/components/dialog";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin } from "lucide-react";
import { FancyInput, Input, Label } from "@repo/ui/components/input";
import { Badge } from "@repo/ui/components/badge";
import { SelectDate } from "@repo/ui/components/selects/date-select";
import { ElectionGroupBullet } from "@repo/ui/components/bullets/election-group-bullet";
import { updateElection } from "#/lib/server/elections";
import { QUERY_KEYS } from "#/lib/config";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getStates } from "#/lib/server/states";
import type { ElectionInstanceType } from "../tiles/election-instance-tile";
import { TinyError } from "@repo/ui/components/custom/TinyError";

/** Formats geographic scope identifier into a clean, human-readable label */
const formatScopeLabel = (scope?: string): string => {
  switch (scope?.toLowerCase()) {
    case "nationwide":
      return "Nationwide";
    case "state":
      return "State";
    case "senatorial_district":
      return "Senatorial District";
    case "federal_constituency":
      return "Federal Constituency";
    case "state_constituency":
      return "State Constituency";
    case "lga":
      return "Local Government Area (LGA)";
    case "ward":
      return "Ward";
    default:
      return scope || "General";
  }
};

export type ElectionInstanceFormDialogProps = {
  electionInstance?: ElectionInstanceType;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function ElectionInstanceFormDialog({ electionInstance, open, onClose, onSuccess }: ElectionInstanceFormDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Fetch states of Nigeria if this election instance has an associated state_id
  const { data: statesData } = useQuery({
    queryKey: QUERY_KEYS.states,
    queryFn: async () => {
      const res = await getStates({ data: { countryId: 161 } });
      if (res && res.success && res.data?.states) {
        return res.data.states;
      }
      return [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: open && Boolean(electionInstance?.state_id),
  });

  // Resolve readable state name for geographic context banner
  const stateName = useMemo(() => {
    if (!electionInstance?.state_id || !statesData) return null;
    const match = statesData.find((s: any) => s.id === electionInstance.state_id);
    return match ? match.name : null;
  }, [electionInstance?.state_id, statesData]);

  // Configure TanStack Form for instance updates
  const form = useForm({
    defaultValues: {
      name: "",
      electionDate: "",
      electionGroupId: undefined as number | undefined,
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  // Synchronize form values whenever dialog opens or election instance changes
  useEffect(() => {
    if (open && electionInstance) {
      const cleanDate: string = electionInstance.election_date
        ? (electionInstance.election_date.split("T")[0] ?? "")
        : "";
      form.setFieldValue("name", electionInstance.name || "");
      form.setFieldValue("electionDate", cleanDate);
      form.setFieldValue(
        "electionGroupId",
        (electionInstance.election_group_id || undefined) as number | undefined,
      );
      setError(null);
    }
  }, [open, electionInstance]);

  // Mutation to persist updated election instance data
  const saveMutation = useMutation({
    mutationFn: async (values: {
      name: string;
      electionDate: string;
      electionGroupId: number | undefined;
    }) => {
      if (!electionInstance?.id) {
        throw new Error("Missing ID for update");
      }
      if (!values.electionDate) {
        throw new Error("Election date is required");
      }
      if (!values.electionGroupId) {
        throw new Error("Election group is required");
      }

      // Delegate update to server function (office and territory mappings remain immutable)
      const res = await updateElection({
        data: {
          id: electionInstance.id,
          name: values.name.trim(),
          election_date: values.electionDate,
          election_group_id: values.electionGroupId,
        },
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to update election");
      }
      return res.data;
    },
    onSuccess: () => {
      // Invalidate cached election queries to refresh lists and tables
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.elections.all });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-145 p-0 rounded-2xl border-none shadow-2xl overflow-visible">
        <DialogHeader title="Update Election Instance" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogPadding className="space-y-6 pb-6">
            {/* Server & Validation Error Message Display */}
            <TinyError error={error} />

            {/* Geographic Scope & Office Context Banner (Read-only territory metadata) */}
            {electionInstance && (
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                  <MapPin className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {electionInstance.office_name && (
                      <Badge variant="purple" className="text-[11px] font-medium py-0">
                        {electionInstance.office_name}
                      </Badge>
                    )}
                    <Badge variant="info" className="text-[11px] font-medium py-0">
                      {formatScopeLabel(electionInstance.scope)}
                    </Badge>
                    {stateName && (
                      <Badge variant="secondary" className="text-[11px] font-medium py-0">
                        {stateName}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    This election is permanently locked to this contested office and territory. Election name, date, and group can be modified below.
                  </p>
                </div>
              </div>
            )}

            {/* Election Title / Name Input */}
            <div className="w-full">
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Election name is required" : undefined,
                }}
                children={(field) => (
                  <div className="w-full">
                    <FancyInput
                      type="text"
                      placeholder="Election name"
                      errorMsg={field.state.meta.errors?.join(", ")}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              />
            </div>

            {/* Scheduled Election Date Selector */}
            <div className="flex flex-col gap-1.5 w-full">
              <Label title="Election Date" />
              <form.Field
                name="electionDate"
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
          </DialogPadding>

          {/* Bottom Toolbelt: Umbrella Election Group Selector */}
          <DialogToolbelt>
            <form.Field
              name="electionGroupId"
              validators={{
                onChange: ({ value }) =>
                  !value ? "Election group is required" : undefined,
              }}
              children={(field) => (
                <ElectionGroupBullet
                  selectedId={field.state.value}
                  variant="bullet"
                  errorMsg={field.state.meta.errors?.join(", ")}
                  update={(item) => {
                    field.handleChange(item.id);
                  }}
                  fetchElectionGroups={getElectionGroups}
                />
              )}
            />
          </DialogToolbelt>

          {/* Dialog Action Buttons */}
          <DialogFooter>
            <Button
              type="submit"
              variant="secondary"
              size="xl"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Update
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
