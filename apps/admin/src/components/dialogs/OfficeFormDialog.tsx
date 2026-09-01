import * as React from "react";
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
import { SelectElectionScope } from "@repo/ui/components/selects/election-scope-select";
import { SelectRank } from "@repo/ui/components/selects/rank-select";
import { createOffice, updateOffice } from "#/lib/server/offices";
import { Loader2 } from "lucide-react";
import { FancyInput, Input } from "@repo/ui/components/input";
import { TinyError } from "@repo/ui/components/custom/TinyError";

export interface Office {
  id: number;
  name: string;
  election: string;
  scope: string;
  rank: number;
  inec_election_type_id?: string;
  instances_count?: number;
  created_at?: string;
  updated_at?: string;
}

export function OfficeFormDialog({
  office,
  open,
  onClose,
  mode = "create",
  onSuccess,
}: {
  office?: Office;
  open: boolean;
  onClose: () => void;
  mode?: "create" | "update";
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      scope: "nationwide",
      rank: "1",
      election: "",
      inec_election_type_id: "",
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  React.useEffect(() => {
    if (open) {
      if (mode === "update" && office) {
        form.setFieldValue("name", office.name || "");
        form.setFieldValue("scope", office.scope || "nationwide");
        form.setFieldValue("rank", String(office.rank || 1));
        form.setFieldValue("election", office.election || "");
        form.setFieldValue("inec_election_type_id", office.inec_election_type_id || "");
      } else {
        form.setFieldValue("name", "");
        form.setFieldValue("scope", "nationwide");
        form.setFieldValue("rank", "1");
        form.setFieldValue("election", "");
        form.setFieldValue("inec_election_type_id", "");
      }
      setError(null);
    }
  }, [open, mode, office]);

  const saveMutation = useMutation({
    mutationFn: async (values: {
      name: string;
      scope: string;
      rank: string;
      election: string;
      inec_election_type_id?: string;
    }) => {
      let res;
      const rankNum = Number(values.rank) || 1;
      const inecTypeId = values.inec_election_type_id?.trim() || undefined;

      if (mode === "update") {
        if (!office?.id) {
          throw new Error("Missing ID for update");
        }
        res = await updateOffice({
          data: {
            id: office.id,
            name: values.name.trim(),
            scope: values.scope,
            rank: rankNum,
            election: values.election.trim(),
            inec_election_type_id: inecTypeId,
          },
        });
      } else {
        res = await createOffice({
          data: {
            name: values.name.trim(),
            scope: values.scope,
            rank: rankNum,
            election: values.election.trim(),
            inec_election_type_id: inecTypeId,
          },
        });
      }

      if (!res.success) {
        throw new Error(res.message || "Failed to save office");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offices"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl overflow-visible">
        <DialogHeader
          title={mode === "update" ? "Update Office" : "Create Office"}
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogPadding className="space-y-6 pb-6">
            <TinyError error={error} />

            {/* Office name input */}
            <div className="w-full">
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Office name is required" : undefined,
                }}
                children={(field) => (
                  <div className="w-full">
                    <FancyInput
                      type="text"
                      placeholder="Office name"
                      errorMsg={field.state.meta.errors?.join(", ")}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              />
            </div>

            {/* Target and Rank layout grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Target/Scope select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] text-c-50">Scope</label>
                <form.Field
                  name="scope"
                  children={(field) => (
                    <SelectElectionScope
                      selectedId={field.state.value}
                      update={(val) => field.handleChange(val)}
                    />
                  )}
                />
              </div>

              {/* Rank select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] text-c-50">Rank</label>
                <form.Field
                  name="rank"
                  children={(field) => (
                    <SelectRank
                      selectedId={field.state.value}
                      update={(val) => field.handleChange(val)}
                    />
                  )}
                />
              </div>
            </div>

            {/* Election */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] text-c-50">Election</label>
              <form.Field
                name="election"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Election is required" : undefined,
                }}
                children={(field) => (
                  <div>
                    <Input
                      type="text"
                      placeholder="E.g., Presidential"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors && (
                      <p className="text-red-500 text-xs mt-1">
                        {field.state.meta.errors.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>

            {/* INEC Election Type ID */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] text-c-50">INEC Election Type ID (Optional)</label>
              <form.Field
                name="inec_election_type_id"
                children={(field) => (
                  <div>
                    <Input
                      type="text"
                      placeholder="E.g., 5f129a04df41d910dcdc1d50"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              />
            </div>
          </DialogPadding>
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
