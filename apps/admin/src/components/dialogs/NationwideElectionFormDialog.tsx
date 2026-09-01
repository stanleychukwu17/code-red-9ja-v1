import { getElectionGroups } from "#/lib/server/election_groups";
import { createNationwideElection } from "#/lib/server/elections";
import { getOffices } from "#/lib/server/offices";
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
import { Loader2, Plus } from "lucide-react";
import * as React from "react";
import type { UserResult } from "./UserFormDialog";
import { UserFormDialog } from "./UserFormDialog";
import { ElectionGroupFormDialog } from "./ElectionGroupFormDialog";
import { Label } from "@repo/ui/components/input";
import { CandidateRow } from "./CandidateRow";
import { UserFinderCommand } from "@repo/ui/components/custom/UserFinderCommand";
import { getUsersList } from "#/lib/server/users";
import { TinyError } from "@repo/ui/components/custom/TinyError";

export function NationwideElectionFormDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = React.useState(false);
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] =
    React.useState(false);
  const [isExistingDialogOpen, setIsExistingDialogOpen] = React.useState(false);
  const [candidates, setCandidates] = React.useState<any[]>([]);
  const [selectedOfficeName, setSelectedOfficeName] = React.useState<
    string | null
  >(null);
  const [selectedElectionDate, setSelectedElectionDate] = React.useState<
    string | null
  >(null);
  const [selectedGroupDate, setSelectedGroupDate] = React.useState<
    string | null
  >(null);

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

  const selectedOfficeId = useStore(
    form.store,
    (state) => state.values.officeId,
  );

  const { data: officesData } = useQuery({
    queryKey: ["election-types", "list"],
    queryFn: async () => {
      const res = await getOffices();
      if (res && res.success && res.data?.offices) {
        return res.data.offices;
      }
      return [];
    },
    enabled: open,
  });

  React.useEffect(() => {
    if (open) {
      form.setFieldValue("electionGroupId", undefined);
      form.setFieldValue("electionDate", "");
      form.setFieldValue("officeId", undefined);
      setCandidates([]);
      setError(null);
      setSelectedOfficeName(null);
      setSelectedElectionDate(null);
      setSelectedGroupDate(null);
    }
  }, [open]);

  // Auto-select matching Nationwide office (President) when offices data loads
  React.useEffect(() => {
    if (open && officesData && officesData.length > 0 && !selectedOfficeId) {
      const matching = officesData.find((o: any) => o.scope === "nationwide");
      if (matching) {
        form.setFieldValue("officeId", matching.id);
        setSelectedOfficeName(matching.name);
      }
    }
  }, [open, officesData, selectedOfficeId]);

  const electionGroupButtonText = React.useMemo(() => {
    const year = selectedElectionDate
      ? new Date(selectedElectionDate).getFullYear()
      : null;
    if (year && selectedOfficeName) {
      return `${year} ${selectedOfficeName} Election`;
    }
    return undefined;
  }, [selectedElectionDate, selectedOfficeName]);

  const saveMutation = useMutation({
    mutationFn: async (values: {
      electionGroupId: number | undefined;
      electionDate: string;
      officeId: number | undefined;
    }) => {
      if (!values.electionDate) {
        throw new Error("Election date is required");
      }
      if (!values.officeId) {
        throw new Error("Office is required");
      }

      const missingPartyIndex = candidates.findIndex((c) => !c.party_id);
      if (missingPartyIndex !== -1) {
        throw new Error(
          `Please select a party for candidate: ${candidates[missingPartyIndex].first_name}`,
        );
      }

      const res = await createNationwideElection({
        data: {
          office_id: values.officeId,
          election_date: values.electionDate,
          election_group_id: values.electionGroupId,
          candidates: candidates.map((c) => ({
            candidate_id: c.id,
            party_id: c.party_id!,
            party_short_name: c.party_short_name,
          })),
        },
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to create nationwide election");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elections"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  const handleAddNewCandidateSuccess = (newCand: UserResult) => {
    setCandidates((prev) => [...prev, newCand]);
  };

  const handleRemoveCandidate = (index: number) => {
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddMultipleExistingCandidates = (selectedUsers: any[]) => {
    setCandidates((prev) => {
      const updated = [...prev];
      selectedUsers.forEach((userItem) => {
        if (!updated.some((c) => c.id === userItem.id)) {
          updated.push({
            id: userItem.id,
            first_name: `${userItem.first_name} ${userItem.last_name}`,
            avatar_url: userItem.avatar || undefined,
            party_id: userItem.party_id || undefined,
          });
        }
      });
      return updated;
    });
  };

  const handleUpdateCandidateParty = async (index: number, newParty: any) => {
    setCandidates((prev) =>
      prev.map((c, i) =>
        i === index
          ? {
              ...c,
              party_id: newParty.id,
              party_short_name: newParty.short_name,
              party_logo: newParty.logo,
            }
          : c,
      ),
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl   overflow-visible">
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
                        fetchOffices={getOffices}
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
                          setSelectedElectionDate(value);
                          if (value !== selectedGroupDate) {
                            form.setFieldValue("electionGroupId", undefined);
                            setSelectedGroupDate(null);
                          }
                        }}
                        errorMsg={field.state.meta.errors?.join(", ")}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Candidates Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[15px] font-semibold text-c-70">
                    Candidates
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="black"
                      size="lg"
                      className="px-4"
                      onClick={() => setIsExistingDialogOpen(true)}
                    >
                      <Plus className="size-4" />
                      <span>Existing</span>
                    </Button>
                    <Button
                      type="button"
                      variant="black"
                      size="lg"
                      className="px-4"
                      onClick={() => setIsCandidateDialogOpen(true)}
                    >
                      <Plus className="size-4" />
                      <span>New</span>
                    </Button>
                  </div>
                </div>

                {candidates.length === 0 ? (
                  <div className="h-32 rounded-xl bg-[#f7f7f7] border border-dashed border-[#e2e8f0] flex items-center justify-center">
                    <span className="text-[15px] text-c-40 font-semibold">
                      0 candidates
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                    {candidates.map((cand, idx) => (
                      <CandidateRow
                        key={cand.id}
                        candidate={cand}
                        index={idx}
                        onUpdateParty={handleUpdateCandidateParty}
                        onRemove={handleRemoveCandidate}
                      />
                    ))}
                  </div>
                )}
              </div>
            </DialogPadding>
            {/* Election Group & Election Date dropdowns side by side */}
            <DialogToolbelt>
              {/* Election Group */}
              <form.Field
                name="electionGroupId"
                children={(field) => (
                  <ElectionGroupBullet
                    selectedId={field.state.value}
                    variant="bullet"
                    buttonText={electionGroupButtonText}
                    update={(item) => {
                      field.handleChange(item.id);
                      setSelectedGroupDate(item.election_date || null);
                      if (item.election_date) {
                        form.setFieldValue("electionDate", item.election_date);
                        setSelectedElectionDate(item.election_date);
                      }
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

      <ElectionGroupFormDialog
        open={isGroupDialogOpen}
        onClose={() => setIsGroupDialogOpen(false)}
        onSuccess={(newGroupId, electionDate) => {
          form.setFieldValue("electionGroupId", newGroupId);
          if (electionDate) {
            setSelectedGroupDate(electionDate);
            form.setFieldValue("electionDate", electionDate);
            setSelectedElectionDate(electionDate);
          }
        }}
      />

      <UserFormDialog
        open={isCandidateDialogOpen}
        onClose={() => setIsCandidateDialogOpen(false)}
        onSuccess={handleAddNewCandidateSuccess}
      />

      <UserFinderCommand
        open={isExistingDialogOpen}
        onClose={() => setIsExistingDialogOpen(false)}
        onAddUsers={handleAddMultipleExistingCandidates}
        alreadySelectedIds={candidates.map((c) => c.id)}
        fetchUsers={async ({ cursor, search }) => {
          const res = await getUsersList({
            data: { cursor, search, limit: 20 },
          });
          if (res && res.success && res.data?.users) {
            return {
              users: res.data.users,
              nextCursor: res.data.meta?.next_cursor,
            };
          }
          return { users: [] };
        }}
        title="Search Candidates"
        placeholder="Search candidates to add"
        selectMode="multiple"
      />
    </>
  );
}
