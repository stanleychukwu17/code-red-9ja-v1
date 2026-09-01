import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { FancyInput, Label } from "@repo/ui/components/input";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { SelectLga } from "@repo/ui/components/selects/lga-select";
import { getLGAs } from "#/lib/server/countries";
import { getStates } from "#/lib/server/states";
import { createWard, updateWard } from "#/lib/server/wards";
import { TinyError } from "@repo/ui/components/custom/TinyError";

export interface Ward {
  id: number;
  name: string;
  code: string;
  lga_id: number;
  lga_name: string;
  state_id: number;
  state_name: string;
}

export function WardFormDialog({
  ward,
  open,
  onClose,
  mode = "create",
  onSuccess,
}: {
  ward?: Ward;
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
      code: "",
      stateId: undefined as number | undefined,
      lgaId: undefined as number | undefined,
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  const selectedStateId = useStore(form.store, (state) => state.values.stateId);

  // Watch stateId changes to reset lgaId
  React.useEffect(() => {
    form.setFieldValue("lgaId", undefined);
  }, [selectedStateId]);

  React.useEffect(() => {
    if (open) {
      if (mode === "update" && ward) {
        form.setFieldValue("name", ward.name || "");
        form.setFieldValue("code", ward.code || "");
        form.setFieldValue("stateId", ward.state_id);
        // We defer lgaId setup slightly so stateId change reset doesn't overwrite it
        setTimeout(() => {
          form.setFieldValue("lgaId", ward.lga_id);
        }, 0);
      } else {
        form.setFieldValue("name", "");
        form.setFieldValue("code", "");
        form.setFieldValue("stateId", undefined);
        form.setFieldValue("lgaId", undefined);
      }
      setError(null);
    }
  }, [open, mode, ward]);

  const saveMutation = useMutation({
    mutationFn: async (values: {
      name: string;
      code: string;
      stateId: number | undefined;
      lgaId: number | undefined;
    }) => {
      if (!values.stateId) {
        throw new Error("State is required");
      }
      if (!values.lgaId) {
        throw new Error("LGA is required");
      }

      const payload = {
        name: values.name.trim(),
        code: values.code.trim().toUpperCase(),
        state_id: values.stateId,
        lga_id: values.lgaId,
      };

      let res;
      if (mode === "update") {
        if (!ward?.id) {
          throw new Error("Missing ID for update");
        }
        res = await updateWard({
          data: {
            id: ward.id,
            ...payload,
          },
        });
      } else {
        res = await createWard({
          data: payload,
        });
      }

      if (!res.success) {
        throw new Error(res.message || "Failed to save ward");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl   overflow-visible">
        <DialogHeader
          title={mode === "update" ? "Update Ward" : "Create Ward"}
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

            {/* Ward Name */}
            <div className="w-full">
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Ward name is required" : undefined,
                }}
                children={(field) => (
                  <div className="w-full">
                    <FancyInput
                      type="text"
                      placeholder="Ward name"
                      errorMsg={field.state.meta.errors?.join(", ")}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              />
            </div>

            {/* Code */}
            <div className="w-full">
              <form.Field
                name="code"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Code is required" : undefined,
                }}
                children={(field) => (
                  <div className="w-full">
                    <FancyInput
                      type="text"
                      placeholder="Code (e.g., 01)"
                      errorMsg={field.state.meta.errors?.join(", ")}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              />
            </div>

            {/* State Select */}
            <div className="flex flex-col gap-1.5">
              <Label title="State" />
              <form.Field
                name="stateId"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "State is required" : undefined,
                }}
                children={(field) => (
                  <SelectState
                    selectedId={
                      field.state.value !== undefined
                        ? String(field.state.value)
                        : undefined
                    }
                    countryOriginalId={161} // Nigeria
                    update={(item) => {
                      field.handleChange(item.id);
                    }}
                    fetchStates={getStates}
                    errorMsg={field.state.meta.errors?.join(", ")}
                  />
                )}
              />
            </div>

            {/* LGA Select */}
            <div className="flex flex-col gap-1.5">
              <Label title="LGA" />
              <form.Field
                name="lgaId"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "LGA is required" : undefined,
                }}
                children={(field) => (
                  <SelectLga
                    selectedId={
                      field.state.value !== undefined
                        ? String(field.state.value)
                        : undefined
                    }
                    stateId={selectedStateId}
                    disabled={!selectedStateId}
                    update={(item) => {
                      field.handleChange(item.id);
                    }}
                    fetchLGAs={getLGAs}
                    errorMsg={field.state.meta.errors?.join(", ")}
                  />
                )}
              />
            </div>
          </DialogPadding>

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
              {mode === "update" ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
