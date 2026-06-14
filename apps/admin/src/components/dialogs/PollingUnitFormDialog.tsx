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
import { FancyInput, Input, Label } from "@repo/ui/components/input";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { SelectLga } from "@repo/ui/components/selects/lga-select";
import { SelectWard } from "@repo/ui/components/selects/ward-select";
import { getLGAs } from "#/lib/server/countries";
import { getStates } from "#/lib/server/states";
import { getWards } from "#/lib/server/wards";
import { createPollingUnit, updatePollingUnit } from "#/lib/server/polling_units";

export interface PollingUnit {
  id: number;
  name: string;
  abbreviation?: string | null;
  units?: string | null;
  delimitation?: string | null;
  remark?: string | null;
  registration_area_id?: number | null;
  ward_id: number;
  ward_name: string;
  lga_id: number;
  lga_name: string;
  state_id: number;
  state_name: string;
  latitude?: number | null;
  longitude?: number | null;
  precise_location?: string | null;
  formatted_address?: string | null;
  google_place_id?: string | null;
}

export function PollingUnitFormDialog({
  pollingUnit,
  open,
  onClose,
  mode = "create",
  onSuccess,
}: {
  pollingUnit?: PollingUnit;
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
      abbreviation: "",
      units: "",
      delimitation: "",
      remark: "",
      registrationAreaId: undefined as number | undefined,
      stateId: undefined as number | undefined,
      lgaId: undefined as number | undefined,
      wardId: undefined as number | undefined,
      latitude: undefined as number | undefined,
      longitude: undefined as number | undefined,
      preciseLocation: "",
      formattedAddress: "",
      googlePlaceId: "",
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  const selectedStateId = useStore(form.store, (state) => state.values.stateId);
  const selectedLgaId = useStore(form.store, (state) => state.values.lgaId);

  // Watch stateId changes to reset lgaId and wardId
  React.useEffect(() => {
    form.setFieldValue("lgaId", undefined);
    form.setFieldValue("wardId", undefined);
  }, [selectedStateId]);

  // Watch lgaId changes to reset wardId
  React.useEffect(() => {
    form.setFieldValue("wardId", undefined);
  }, [selectedLgaId]);

  React.useEffect(() => {
    if (open) {
      if (mode === "update" && pollingUnit) {
        form.setFieldValue("name", pollingUnit.name || "");
        form.setFieldValue("abbreviation", pollingUnit.abbreviation || "");
        form.setFieldValue("units", pollingUnit.units || "");
        form.setFieldValue("delimitation", pollingUnit.delimitation || "");
        form.setFieldValue("remark", pollingUnit.remark || "");
        form.setFieldValue("registrationAreaId", pollingUnit.registration_area_id ?? undefined);
        form.setFieldValue("stateId", pollingUnit.state_id);
        form.setFieldValue("latitude", pollingUnit.latitude ?? undefined);
        form.setFieldValue("longitude", pollingUnit.longitude ?? undefined);
        form.setFieldValue("preciseLocation", pollingUnit.precise_location || "");
        form.setFieldValue("formattedAddress", pollingUnit.formatted_address || "");
        form.setFieldValue("googlePlaceId", pollingUnit.google_place_id || "");

        // Defer cascading fields setup
        setTimeout(() => {
          form.setFieldValue("lgaId", pollingUnit.lga_id);
          setTimeout(() => {
            form.setFieldValue("wardId", pollingUnit.ward_id);
          }, 0);
        }, 0);
      } else {
        form.setFieldValue("name", "");
        form.setFieldValue("abbreviation", "");
        form.setFieldValue("units", "");
        form.setFieldValue("delimitation", "");
        form.setFieldValue("remark", "");
        form.setFieldValue("registrationAreaId", undefined);
        form.setFieldValue("stateId", undefined);
        form.setFieldValue("lgaId", undefined);
        form.setFieldValue("wardId", undefined);
        form.setFieldValue("latitude", undefined);
        form.setFieldValue("longitude", undefined);
        form.setFieldValue("preciseLocation", "");
        form.setFieldValue("formattedAddress", "");
        form.setFieldValue("googlePlaceId", "");
      }
      setError(null);
    }
  }, [open, mode, pollingUnit]);

  const saveMutation = useMutation({
    mutationFn: async (values: {
      name: string;
      abbreviation: string;
      units: string;
      delimitation: string;
      remark: string;
      registrationAreaId: number | undefined;
      stateId: number | undefined;
      lgaId: number | undefined;
      wardId: number | undefined;
      latitude: number | undefined;
      longitude: number | undefined;
      preciseLocation: string;
      formattedAddress: string;
      googlePlaceId: string;
    }) => {
      if (!values.stateId) throw new Error("State is required");
      if (!values.lgaId) throw new Error("LGA is required");
      if (!values.wardId) throw new Error("Ward is required");

      const payload = {
        name: values.name.trim(),
        abbreviation: values.abbreviation.trim() || null,
        units: values.units.trim() || null,
        delimitation: values.delimitation.trim() || null,
        remark: values.remark.trim() || null,
        registration_area_id: values.registrationAreaId ?? null,
        state_id: values.stateId,
        lga_id: values.lgaId,
        ward_id: values.wardId,
        latitude: values.latitude ?? null,
        longitude: values.longitude ?? null,
        precise_location: values.preciseLocation.trim() || null,
        formatted_address: values.formattedAddress.trim() || null,
        google_place_id: values.googlePlaceId.trim() || null,
      };

      let res;
      if (mode === "update") {
        if (!pollingUnit?.id) {
          throw new Error("Missing ID for update");
        }
        res = await updatePollingUnit({
          data: {
            id: pollingUnit.id,
            ...payload,
          },
        });
      } else {
        res = await createPollingUnit({
          data: payload,
        });
      }

      if (!res.success) {
        throw new Error(res.message || "Failed to save polling unit");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polling-units"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[620px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-visible">
        <DialogHeader
          title={mode === "update" ? "Update Polling Unit" : "Create Polling Unit"}
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="max-h-[80vh] overflow-y-auto"
        >
          <DialogPadding className="space-y-5 pb-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {/* Polling Unit Name */}
            <div className="w-full">
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Polling unit name is required" : undefined,
                }}
                children={(field) => (
                  <div className="w-full">
                    <FancyInput
                      type="text"
                      placeholder="Polling unit name"
                      errorMsg={field.state.meta.errors?.join(", ")}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              />
            </div>

            {/* Grid for Abbreviation & Registration Area ID */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label title="Abbreviation / Code" />
                <form.Field
                  name="abbreviation"
                  children={(field) => (
                    <Input
                      type="text"
                      placeholder="E.g., 01-02-03-004"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label title="Registration Area ID" />
                <form.Field
                  name="registrationAreaId"
                  children={(field) => (
                    <Input
                      type="number"
                      placeholder="E.g., 12"
                      value={field.state.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.handleChange(val === "" ? undefined : Number(val));
                      }}
                    />
                  )}
                />
              </div>
            </div>

            {/* Grid for Units & Delimitation */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label title="Units Count" />
                <form.Field
                  name="units"
                  children={(field) => (
                    <Input
                      type="text"
                      placeholder="E.g., 1"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label title="Delimitation Code" />
                <form.Field
                  name="delimitation"
                  children={(field) => (
                    <Input
                      type="text"
                      placeholder="E.g., DEL-01"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  )}
                />
              </div>
            </div>

            {/* Parent Cascade Selects */}
            <div className="space-y-4 p-4 rounded-xl bg-c-10 border border-c-20">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-c-60">Location Hierarchy</h4>
              
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

              {/* Ward Select */}
              <div className="flex flex-col gap-1.5">
                <Label title="Ward" />
                <form.Field
                  name="wardId"
                  validators={{
                    onChange: ({ value }) =>
                      !value ? "Ward is required" : undefined,
                  }}
                  children={(field) => (
                    <SelectWard
                      selectedId={
                        field.state.value !== undefined
                          ? String(field.state.value)
                          : undefined
                      }
                      lgaId={selectedLgaId}
                      stateId={selectedStateId}
                      disabled={!selectedLgaId}
                      update={(item) => {
                        field.handleChange(item.id);
                      }}
                      fetchWards={getWards}
                      errorMsg={field.state.meta.errors?.join(", ")}
                    />
                  )}
                />
              </div>
            </div>

            {/* Coordinates Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label title="Latitude" />
                <form.Field
                  name="latitude"
                  children={(field) => (
                    <Input
                      type="number"
                      step="any"
                      placeholder="E.g., 9.082"
                      value={field.state.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.handleChange(val === "" ? undefined : Number(val));
                      }}
                    />
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label title="Longitude" />
                <form.Field
                  name="longitude"
                  children={(field) => (
                    <Input
                      type="number"
                      step="any"
                      placeholder="E.g., 8.675"
                      value={field.state.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.handleChange(val === "" ? undefined : Number(val));
                      }}
                    />
                  )}
                />
              </div>
            </div>

            {/* Precise Location & Formatted Address */}
            <div className="flex flex-col gap-1.5">
              <Label title="Precise Location description" />
              <form.Field
                name="preciseLocation"
                children={(field) => (
                  <Input
                    type="text"
                    placeholder="E.g., Inside primary school compound near the playground"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label title="Formatted Address" />
              <form.Field
                name="formattedAddress"
                children={(field) => (
                  <Input
                    type="text"
                    placeholder="E.g., 12 Main St, Garki, Abuja"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              />
            </div>

            {/* Google Place ID & Remark */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label title="Google Place ID" />
                <form.Field
                  name="googlePlaceId"
                  children={(field) => (
                    <Input
                      type="text"
                      placeholder="E.g., ChIJs..."
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label title="Remark / Note" />
                <form.Field
                  name="remark"
                  children={(field) => (
                    <Input
                      type="text"
                      placeholder="E.g., Active / Inactive"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  )}
                />
              </div>
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
