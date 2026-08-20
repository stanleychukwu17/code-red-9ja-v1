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
import { Loader2 } from "lucide-react";
import { FancyInput, Input, Label } from "@repo/ui/components/input";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { getStates } from "#/lib/server/states";
import {
  createSenatorialDistrict,
  updateSenatorialDistrict,
} from "#/lib/server/senatorial_districts";
import { TinyError } from "@repo/ui/components/custom/TinyError";

export interface SenatorialDistrict {
  id: number;
  name: string;
  code?: string;
  description: string;
  coalition_center: string;
  state_id: number;
  state_name: string;
}

export function SenatorialDistrictFormDialog({
  senatorialDistrict,
  open,
  onClose,
  mode = "create",
  onSuccess,
}: {
  senatorialDistrict?: SenatorialDistrict;
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
      description: "",
      coalitionCenter: "",
      stateId: undefined as number | undefined,
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  React.useEffect(() => {
    if (open) {
      if (mode === "update" && senatorialDistrict) {
        form.setFieldValue("name", senatorialDistrict.name || "");
        form.setFieldValue("code", senatorialDistrict.code || "");
        form.setFieldValue("description", senatorialDistrict.description || "");
        form.setFieldValue(
          "coalitionCenter",
          senatorialDistrict.coalition_center || "",
        );
        form.setFieldValue("stateId", senatorialDistrict.state_id);
      } else {
        form.setFieldValue("name", "");
        form.setFieldValue("code", "");
        form.setFieldValue("description", "");
        form.setFieldValue("coalitionCenter", "");
        form.setFieldValue("stateId", undefined);
      }
      setError(null);
    }
  }, [open, mode, senatorialDistrict]);

  const saveMutation = useMutation({
    mutationFn: async (values: {
      name: string;
      code: string;
      description: string;
      coalitionCenter: string;
      stateId: number | undefined;
    }) => {
      if (!values.stateId) {
        throw new Error("State is required");
      }

      const payload = {
        name: values.name.trim(),
        code: values.code.trim() || undefined,
        description: values.description.trim(),
        coalition_center: values.coalitionCenter.trim(),
        state_id: values.stateId,
      };

      let res;
      if (mode === "update") {
        if (!senatorialDistrict?.id) {
          throw new Error("Missing ID for update");
        }
        res = await updateSenatorialDistrict({
          data: {
            id: senatorialDistrict.id,
            ...payload,
          },
        });
      } else {
        res = await createSenatorialDistrict({
          data: payload,
        });
      }

      if (!res.success) {
        throw new Error(res.message || "Failed to save senatorial district");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["senatorial-districts"] });
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
          title={
            mode === "update"
              ? "Update Senatorial District"
              : "Create Senatorial District"
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
            <TinyError error={error} />

            {/* Senatorial District Name */}
            <div className="w-full">
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Senatorial district name is required" : undefined,
                }}
                children={(field) => (
                  <div className="w-full">
                    <FancyInput
                      type="text"
                      placeholder="Senatorial district name"
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
                children={(field) => (
                  <div className="w-full">
                    <FancyInput
                      type="text"
                      placeholder="Code (e.g. sd/095/rv)"
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

            {/* Coalition Center */}
            <div className="flex flex-col gap-1.5">
              <Label title="Coalition center" />
              <form.Field
                name="coalitionCenter"
                children={(field) => (
                  <div>
                    <Input
                      type="text"
                      placeholder="E.g., Coalition HQ, City Hall"
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

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <Label title="Description" />
              <form.Field
                name="description"
                children={(field) => (
                  <div>
                    <Input
                      type="text"
                      placeholder="E.g., Senatorial District description"
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
