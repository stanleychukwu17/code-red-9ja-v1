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
import { SelectCountry } from "@repo/ui/components/selects/country-select";
import { getAllCountries } from "#/lib/server/countries";
import { createState, updateState } from "#/lib/server/states";
import { TinyError } from "@repo/ui/components/custom/TinyError";

export interface State {
  id: number;
  name: string;
  country_id: number;
  country_code: string;
  latitude: number;
  longitude: number;
}

export function StateFormDialog({
  state,
  open,
  onClose,
  mode = "create",
  onSuccess,
}: {
  state?: State;
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
      countryId: undefined as number | undefined,
      countryCode: "",
      latitude: "",
      longitude: "",
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  React.useEffect(() => {
    if (open) {
      if (mode === "update" && state) {
        form.setFieldValue("name", state.name || "");
        form.setFieldValue("countryId", state.country_id);
        form.setFieldValue("countryCode", state.country_code || "");
        form.setFieldValue("latitude", String(state.latitude || ""));
        form.setFieldValue("longitude", String(state.longitude || ""));
      } else {
        form.setFieldValue("name", "");
        form.setFieldValue("countryId", undefined);
        form.setFieldValue("countryCode", "");
        form.setFieldValue("latitude", "");
        form.setFieldValue("longitude", "");
      }
      setError(null);
    }
  }, [open, mode, state]);

  const saveMutation = useMutation({
    mutationFn: async (values: {
      name: string;
      countryId: number | undefined;
      countryCode: string;
      latitude: string;
      longitude: string;
    }) => {
      if (!values.countryId) {
        throw new Error("Country is required");
      }

      const payload = {
        name: values.name.trim(),
        country_id: values.countryId,
        country_code: values.countryCode.trim(),
        latitude: Number(values.latitude) || 0,
        longitude: Number(values.longitude) || 0,
      };

      let res;
      if (mode === "update") {
        if (!state?.id) {
          throw new Error("Missing ID for update");
        }
        res = await updateState({
          data: {
            id: state.id,
            ...payload,
          },
        });
      } else {
        res = await createState({
          data: payload,
        });
      }

      if (!res.success) {
        throw new Error(res.message || "Failed to save state");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["states"] });
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
          title={mode === "update" ? "Update State" : "Create State"}
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

            {/* State Name */}
            <div className="w-full">
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "State name is required" : undefined,
                }}
                children={(field) => (
                  <div className="w-full">
                    <FancyInput
                      type="text"
                      placeholder="State name"
                      errorMsg={field.state.meta.errors?.join(", ")}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              />
            </div>

            {/* Grid Layout for Country and Country Code */}
            <div className="grid grid-cols-2 gap-4">
              {/* Country Select */}
              <div className="flex flex-col gap-1.5">
                <Label title="Country" />
                <form.Field
                  name="countryId"
                  validators={{
                    onChange: ({ value }) =>
                      !value ? "Country is required" : undefined,
                  }}
                  children={(field) => (
                    <SelectCountry
                      selectedId={
                        field.state.value !== undefined
                          ? String(field.state.value)
                          : undefined
                      }
                      update={(item) => {
                        field.handleChange(item.id);
                        if (item.iso2) {
                          form.setFieldValue("countryCode", item.iso2);
                        }
                      }}
                      fetchCountries={getAllCountries}
                      errorMsg={field.state.meta.errors?.join(", ")}
                    />
                  )}
                />
              </div>

              {/* Country Code */}
              <div className="flex flex-col gap-1.5">
                <Label title="Country code" />
                <form.Field
                  name="countryCode"
                  validators={{
                    onChange: ({ value }) =>
                      !value ? "Country code is required" : undefined,
                  }}
                  children={(field) => (
                    <div>
                      <Input
                        type="text"
                        placeholder="E.g., NG"
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
            </div>

            {/* Coordinates Grid Layout */}
            <div className="grid grid-cols-2 gap-4">
              {/* Latitude */}
              <div className="flex flex-col gap-1.5">
                <Label title="Latitude" />
                <form.Field
                  name="latitude"
                  validators={{
                    onChange: ({ value }) =>
                      !value ? "Latitude is required" : undefined,
                  }}
                  children={(field) => (
                    <div>
                      <Input
                        type="text"
                        placeholder="E.g., 9.0820"
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

              {/* Longitude */}
              <div className="flex flex-col gap-1.5">
                <Label title="Longitude" />
                <form.Field
                  name="longitude"
                  validators={{
                    onChange: ({ value }) =>
                      !value ? "Longitude is required" : undefined,
                  }}
                  children={(field) => (
                    <div>
                      <Input
                        type="text"
                        placeholder="E.g., 8.6753"
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
