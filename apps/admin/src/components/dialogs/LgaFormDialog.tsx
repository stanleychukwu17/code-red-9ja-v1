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
import { getStates } from "#/lib/server/states";
import { getSenatorialDistricts } from "#/lib/server/senatorial_districts";
import { getFederalConstituencies } from "#/lib/server/federal_constituencies";
import { createLga, updateLga } from "#/lib/server/lgas";
import { TinyError } from "@repo/ui/components/custom/TinyError";

export interface Lga {
  id: number;
  name: string;
  abbreviation: string;
  state_id: number;
  state_name: string;
  senatorial_district_id: number;
  senatorial_district_name: string;
  federal_constituency_id: number;
  federal_constituency_name: string;
}

export function LgaFormDialog({
  lga,
  open,
  onClose,
  mode = "create",
  onSuccess,
}: {
  lga?: Lga;
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
      stateId: undefined as number | undefined,
      senatorialDistrictId: undefined as number | undefined,
      federalConstituencyId: undefined as number | undefined,
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  // Watch stateId changes using useStore
  const stateId = useStore(form.store, (state) => state.values.stateId);
  const senatorialDistrictId = useStore(
    form.store,
    (state) => state.values.senatorialDistrictId,
  );

  React.useEffect(() => {
    if (open) {
      if (mode === "update" && lga) {
        form.setFieldValue("name", lga.name || "");
        form.setFieldValue("abbreviation", lga.abbreviation || "");
        form.setFieldValue("stateId", lga.state_id);
        form.setFieldValue("senatorialDistrictId", lga.senatorial_district_id);
        form.setFieldValue(
          "federalConstituencyId",
          lga.federal_constituency_id,
        );
      } else {
        form.setFieldValue("name", "");
        form.setFieldValue("abbreviation", "");
        form.setFieldValue("stateId", undefined);
        form.setFieldValue("senatorialDistrictId", undefined);
        form.setFieldValue("federalConstituencyId", undefined);
      }
      setError(null);
    }
  }, [open, mode, lga]);

  const saveMutation = useMutation({
    mutationFn: async (values: {
      name: string;
      abbreviation: string;
      stateId: number | undefined;
      senatorialDistrictId: number | undefined;
      federalConstituencyId: number | undefined;
    }) => {
      if (!values.stateId) {
        throw new Error("State is required");
      }
      if (!values.abbreviation) {
        throw new Error("Abbreviation is required");
      }
      if (!values.senatorialDistrictId) {
        throw new Error("Senatorial district is required");
      }
      if (!values.federalConstituencyId) {
        throw new Error("Federal constituency is required");
      }

      const payload = {
        name: values.name.trim(),
        abbreviation: values.abbreviation.trim(),
        state_id: values.stateId,
        senatorial_district_id: values.senatorialDistrictId,
        federal_constituency_id: values.federalConstituencyId,
      };

      let res;
      if (mode === "update") {
        if (!lga?.id) {
          throw new Error("Missing ID for update");
        }
        res = await updateLga({
          data: {
            id: lga.id,
            ...payload,
          },
        });
      } else {
        res = await createLga({
          data: payload,
        });
      }

      if (!res.success) {
        throw new Error(res.message || "Failed to save LGA");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lgas"] });
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
        <DialogHeader title={mode === "update" ? "Update LGA" : "Create LGA"} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogPadding className="space-y-6 pb-6">
            <TinyError error={error} />

            {/* LGA Name */}
            <div className="w-full">
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "LGA name is required" : undefined,
                }}
                children={(field) => (
                  <div className="w-full">
                    <FancyInput
                      type="text"
                      placeholder="LGA name"
                      errorMsg={field.state.meta.errors?.join(", ")}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              />
            </div>

            {/* LGA Abbreviation */}
            <div className="w-full">
              <form.Field
                name="abbreviation"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Abbreviation is required" : undefined,
                }}
                children={(field) => (
                  <div className="w-full">
                    <FancyInput
                      type="text"
                      placeholder="Abbreviation"
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
                      form.setFieldValue("senatorialDistrictId", undefined);
                      form.setFieldValue("federalConstituencyId", undefined);
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
                    stateId={stateId}
                    disabled={!stateId}
                    update={(item) => {
                      field.handleChange(item.id);
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
                    stateId={stateId}
                    senatorialDistrictId={senatorialDistrictId}
                    disabled={!stateId}
                    update={(item) => {
                      field.handleChange(item.id);
                    }}
                    fetchFederalConstituencies={getFederalConstituencies}
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
