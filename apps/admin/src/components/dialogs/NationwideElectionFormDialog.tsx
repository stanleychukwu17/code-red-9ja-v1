import { useEffect, useMemo, useState } from "react";
import { getElectionGroups } from "#/lib/server/election_groups";
import { createNationwideElection } from "#/lib/server/elections";
import { getContestedOffices } from "#/lib/server/offices";
import { ElectionGroupBullet } from "@repo/ui/components/bullets/election-group-bullet";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
  DialogToolbelt,
} from "@repo/ui/components/dialog";
import { SelectDate } from "@repo/ui/components/selects/date-select";
import { SelectOffice } from "@repo/ui/components/selects/office-select";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Label } from "@repo/ui/components/input";
import { TinyError } from "@repo/ui/components/custom/TinyError";
import { QUERY_KEYS } from "#/lib/config";

export type NationwideElectionFormDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export type NationwideElectionFormValues = {
  electionGroupId: number | undefined;
  electionDate: string;
  officeId: number | undefined;
};

/**
 * Modal dialog for creating a nationwide election (e.g. Presidential election)
 * with office selection, election date, and optional election group.
 * Candidates are managed separately via ManageCandidatesDialog.
 */
export function NationwideElectionFormDialog({
  open,
  onClose,
  onSuccess,
}: NationwideElectionFormDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Form display metadata
  const [selectedOfficeName, setSelectedOfficeName] = useState<string | null>(null);

  // Form management
  const form = useForm({
    defaultValues: {
      electionGroupId: undefined as number | undefined,
      electionDate: "",
      officeId: undefined as number | undefined,
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  // Track currently selected office ID from form store
  const selectedOfficeId = useStore(form.store, (state) => state.values.officeId);

  // Fetch available contested offices
  const { data: officesData } = useQuery({
    queryKey: QUERY_KEYS.offices.contested,
    queryFn: async () => {
      const res = await getContestedOffices({ data: { limit: 100 } });
      if (res && res.success && res.data?.offices) {
        return res.data.offices;
      }
      return [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: open,
  });

  // Reset all state when the dialog is opened
  useEffect(() => {
    if (open) {
      form.setFieldValue("electionGroupId", undefined);
      form.setFieldValue("electionDate", "");
      form.setFieldValue("officeId", undefined);
      setError(null);
      setSelectedOfficeName(null);
    }
  }, [open]);

  // Auto-select matching Nationwide office (e.g. President) when offices data loads
  useEffect(() => {
    if (open && officesData && officesData.length > 0 && !selectedOfficeId) {
      const matching = officesData.find((o: any) => o.scope === "nationwide");
      if (matching) {
        form.setFieldValue("officeId", matching.id);
        setSelectedOfficeName(matching.name);
      }
    }
  }, [open, officesData, selectedOfficeId]);

  // Submit mutation to create the nationwide election
  const saveMutation = useMutation({
    mutationFn: async ({ electionGroupId, electionDate, officeId }: NationwideElectionFormValues) => {
      if (!electionDate) {
        throw new Error("Election date is required");
      }
      if (!officeId) {
        throw new Error("Office is required");
      }

      const res = await createNationwideElection({
        data: {
          office_id: officeId,
          election_date: electionDate,
          election_group_id: electionGroupId,
        },
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to create nationwide election");
      }
      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.elections.all });
      onSuccess?.();
      onClose();
    },

    onError: (err: any) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-145 p-0 rounded-2xl border-none shadow-2xl overflow-visible">
          <DialogHeader title="Nationwide Election" />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <DialogPadding className="space-y-6 pb-6">
              <TinyError error={error} />

              <div className="flex items-center gap-4">
                {/* Office */}
                <div className="w-full flex flex-col gap-1.5">
                  <Label title="Office" />
                  <form.Field
                    name="officeId"
                    validators={{
                      onChange: ({ value }) =>
                        !value ? "Office is required" : undefined,
                    }}
                    children={(field) => (
                      <SelectOffice
                        selectedId={field.state.value}
                        update={(item) => {
                          field.handleChange(item.id);
                          setSelectedOfficeName(item.name);
                        }}
                        fetchOffices={getContestedOffices}
                        filterScope="nationwide"
                        errorMsg={field.state.meta.errors?.join(", ")}
                      />
                    )}
                  />
                </div>

                {/* Election date only (full-width) */}
                <div className="w-full flex flex-col gap-1.5">
                  <Label title="Election date" />
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
                          field.handleChange(value);
                        }}
                        errorMsg={field.state.meta.errors?.join(", ")}
                      />
                    )}
                  />
                </div>
              </div>
            </DialogPadding>

            {/* Election Group selector */}
            <DialogToolbelt>
              <form.Field
                name="electionGroupId"
                children={(field) => (
                  <ElectionGroupBullet
                    selectedId={field.state.value}
                    variant="bullet"
                    update={(item) => {
                      field.handleChange(item.id);
                    }}
                    fetchElectionGroups={getElectionGroups}
                    errorMsg={field.state.meta.errors?.join(", ")}
                  />
                )}
              />
            </DialogToolbelt>

            <DialogFooter>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="h-11 px-6 bg-success hover:bg-success-hover text-[16px] font-bold text-white rounded-xl cursor-pointer flex items-center gap-2"
              >
                {saveMutation.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
