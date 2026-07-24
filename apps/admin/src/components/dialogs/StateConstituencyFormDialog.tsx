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
import { SelectFederalConstituency } from "@repo/ui/components/selects/federal-constituency-select";
import { SelectLga } from "@repo/ui/components/selects/lga-select";
import { getLGAs } from "#/lib/server/countries";
import { getStates } from "#/lib/server/states";
import { getSenatorialDistricts } from "#/lib/server/senatorial_districts";
import { getFederalConstituencies } from "#/lib/server/federal_constituencies";
import {
  createStateAssemblyConstituency,
  updateStateAssemblyConstituency,
} from "#/lib/server/state_assembly_constituencies";
import { TinyError } from "@repo/ui/components/custom/TinyError";

export interface StateAssemblyConstituency {
  id: number;
  name: string;
  lga_id: number;
  lga_name: string;
  state_id: number;
  state_name: string;
  senatorial_district_id: number;
  senatorial_district_name: string;
  federal_constituency_id: number;
  federal_constituency_name: string;
}

export function StateConstituencyFormDialog({
  stateConstituency,
  open,
  onClose,
  mode = "create",
  onSuccess,
}: {
  stateConstituency?: StateAssemblyConstituency;
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
      federalConstituencyId: undefined as number | undefined,
      lgaId: undefined as number | undefined,
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  // Watch stateId and other values for clearing/filtering dependent select dropdowns
  const selectedStateId = useStore(form.store, (state) => state.values.stateId);
  const selectedDistrictId = useStore(form.store, (state) => state.values.senatorialDistrictId);

  React.useEffect(() => {
    if (open) {
      if (mode === "update" && stateConstituency) {
        form.setFieldValue("name", stateConstituency.name || "");
        form.setFieldValue("stateId", stateConstituency.state_id);
        form.setFieldValue("senatorialDistrictId", stateConstituency.senatorial_district_id);
        form.setFieldValue("federalConstituencyId", stateConstituency.federal_constituency_id);
        form.setFieldValue("lgaId", stateConstituency.lga_id);
      } else {
        form.setFieldValue("name", "");
        form.setFieldValue("stateId", undefined);
        form.setFieldValue("senatorialDistrictId", undefined);
        form.setFieldValue("federalConstituencyId", undefined);
        form.setFieldValue("lgaId", undefined);
      }
      setError(null);
    }
  }, [open, mode, stateConstituency]);

  const saveMutation = useMutation({
    mutationFn: async (values: {
      name: string;
      stateId: number | undefined;
      senatorialDistrictId: number | undefined;
      federalConstituencyId: number | undefined;
      lgaId: number | undefined;
    }) => {
      if (!values.stateId) {
        throw new Error("State is required");
      }
      if (!values.senatorialDistrictId) {
        throw new Error("Senatorial district is required");
      }
      if (!values.federalConstituencyId) {
        throw new Error("Federal constituency is required");
      }
      if (!values.lgaId) {
        throw new Error("LGA is required");
      }

      const payload = {
        name: values.name.trim(),
        state_id: values.stateId,
        senatorial_district_id: values.senatorialDistrictId,
        federal_constituency_id: values.federalConstituencyId,
        lga_id: values.lgaId,
      };

      let res;
      if (mode === "update") {
        if (!stateConstituency?.id) {
          throw new Error("Missing ID for update");
        }
        res = await updateStateAssemblyConstituency({
          data: {
            id: stateConstituency.id,
            ...payload,
          },
        });
      } else {
        res = await createStateAssemblyConstituency({
          data: payload,
        });
      }

      if (!res.success) {
        throw new Error(res.message || "Failed to save state constituency");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["state-constituencies"] });
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
              ? "Update State Constituency"
              : "Create State Constituency"
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

            {/* State Constituency Name */}
            <div className="w-full">
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value
                      ? "State constituency name is required"
                      : undefined,
                }}
                children={(field) => (
                  <div className="w-full">
                    <FancyInput
                      type="text"
                      placeholder="State constituency name"
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
                      // Reset child dropdowns when state changes
                      form.setFieldValue("senatorialDistrictId", undefined);
                      form.setFieldValue("federalConstituencyId", undefined);
                      form.setFieldValue("lgaId", undefined);
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
                      // Clear federal constituency since it depends on district
                      form.setFieldValue("federalConstituencyId", undefined);
                    }}
                    fetchSenatorialDistricts={getSenatorialDistricts}
                    errorMsg={field.state.meta.errors?.join(", ")}
                  />
                )}
              />
            </div>

            {/* Federal Constituency Select */}
            <div className="flex flex-col gap-1.5">
              <Label title="Federal Constituency" />
              <form.Field
                name="federalConstituencyId"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Federal constituency is required" : undefined,
                }}
                children={(field) => (
                  <SelectFederalConstituency
                    selectedId={field.state.value}
                    stateId={selectedStateId}
                    senatorialDistrictId={selectedDistrictId}
                    disabled={!selectedStateId}
                    update={(item) => {
                      field.handleChange(item.id);
                    }}
                    fetchFederalConstituencies={getFederalConstituencies}
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
