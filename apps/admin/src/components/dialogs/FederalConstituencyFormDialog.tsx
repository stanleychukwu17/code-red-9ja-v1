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
import { SelectSenatorialDistrict } from "@repo/ui/components/selects/senatorial-district-select";
import { getStates } from "#/lib/server/states";
import { getSenatorialDistricts } from "#/lib/server/senatorial_districts";
import {
  createFederalConstituency,
  updateFederalConstituency,
} from "#/lib/server/federal_constituencies";
import { TinyError } from "@repo/ui/components/custom/TinyError";


export interface FederalConstituency {
  id: number;
  name: string;
  state_id: number;
  state_name: string;
  senatorial_district_id: number;
  senatorial_district_name: string;
}

export function FederalConstituencyFormDialog({
  federalConstituency,
  open,
  onClose,
  mode = "create",
  onSuccess,
}: {
  federalConstituency?: FederalConstituency;
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
      stateId: undefined as number | undefined,
      senatorialDistrictId: undefined as number | undefined,
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  // Watch stateId to reset senatorialDistrictId if stateId changes
  const selectedStateId = useStore(form.store, (state) => state.values.stateId);

  React.useEffect(() => {
    if (open) {
      if (mode === "update" && federalConstituency) {
        form.setFieldValue("name", federalConstituency.name || "");
        form.setFieldValue("stateId", federalConstituency.state_id);
        form.setFieldValue(
          "senatorialDistrictId",
          federalConstituency.senatorial_district_id,
        );
      } else {
        form.setFieldValue("name", "");
        form.setFieldValue("stateId", undefined);
        form.setFieldValue("senatorialDistrictId", undefined);
      }
      setError(null);
    }
  }, [open, mode, federalConstituency]);

  const saveMutation = useMutation({
    mutationFn: async (values: {
      name: string;
      stateId: number | undefined;
      senatorialDistrictId: number | undefined;
    }) => {
      if (!values.stateId) {
        throw new Error("State is required");
      }
      if (!values.senatorialDistrictId) {
        throw new Error("Senatorial district is required");
      }

      const payload = {
        name: values.name.trim(),
        state_id: values.stateId,
        senatorial_district_id: values.senatorialDistrictId,
      };

      let res;
      if (mode === "update") {
        if (!federalConstituency?.id) {
          throw new Error("Missing ID for update");
        }
        res = await updateFederalConstituency({
          data: {
            id: federalConstituency.id,
            ...payload,
          },
        });
      } else {
        res = await createFederalConstituency({
          data: payload,
        });
      }

      if (!res.success) {
        throw new Error(res.message || "Failed to save federal constituency");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["federal-constituencies"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-visible">
        <DialogHeader
          title={
            mode === "update"
              ? "Update Federal Constituency"
              : "Create Federal Constituency"
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

            {/* Federal Constituency Name */}
            <div className="w-full">
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value
                      ? "Federal constituency name is required"
                      : undefined,
                }}
                children={(field) => (
                  <div className="w-full">
                    <FancyInput
                      type="text"
                      placeholder="Federal constituency name"
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
                      form.setFieldValue("senatorialDistrictId", undefined); // Reset district when state changes
                    }}
                    fetchStates={getStates}
                    errorMsg={field.state.meta.errors?.join(", ")}
                  />
                )}
              />
            </div>

            {/* Senatorial District Select */}
            <div className="flex flex-col gap-1.5">
              <Label title="Senatorial District" />
              <form.Field
                name="senatorialDistrictId"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Senatorial district is required" : undefined,
                }}
                children={(field) => (
                  <SelectSenatorialDistrict
                    selectedId={field.state.value}
                    stateId={selectedStateId}
                    disabled={!selectedStateId}
                    update={(item) => {
                      field.handleChange(item.id);
                    }}
                    fetchSenatorialDistricts={getSenatorialDistricts}
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
