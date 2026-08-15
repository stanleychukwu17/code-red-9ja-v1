import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Input, Label } from "@repo/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import {
  getSystemSetting,
  updateSystemSetting,
} from "#/lib/server/systemSettings";
import { Loader2 } from "lucide-react";

export function SlotCostDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const queryClient = useQueryClient();
  const settingKey = "slot_cost_kobo";

  const { data: settingRes, isLoading } = useQuery({
    queryKey: ["systemSetting", settingKey],
    queryFn: async () => {
      const res = await getSystemSetting({ data: settingKey });
      if (!res.success) {
        throw new Error(res.message || "Failed to fetch system setting");
      }
      return res.data;
    },
    enabled: open,
  });

  const settingData = settingRes?.setting?.value as number | undefined;

  const form = useForm({
    defaultValues: {
      priceNGN: 0,
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  React.useEffect(() => {
    if (open && settingData !== undefined) {
      form.setFieldValue("priceNGN", settingData / 100);
      setError(null);
    }
  }, [open, settingData]);

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form.state.values) => {
      const koboValue = values.priceNGN * 100;
      const res = await updateSystemSetting({
        data: {
          key: settingKey,
          value: koboValue,
          description: "The default cost of a single polling unit slot in Kobo",
        },
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to save settings");
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["systemSetting", settingKey],
      });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "An error occurred while saving");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[480px] p-0 rounded-2xl border-none shadow-2xl   overflow-visible">
        <DialogHeader title="Update Slots Price" />

        {isLoading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="animate-spin size-8 text-c-50" />
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <DialogPadding className="space-y-4 pb-6">
              <p className="text-c-50 leading-[22px]">
                Set the default cost for purchasing a single polling unit slot.
              </p>

              {error && (
                <div className="p-3 text-[14px] font-medium text-red-600 bg-red-50 rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <form.Field name="priceNGN">
                  {(field) => (
                    <div className="space-y-2">
                      {/* <Label title="Price (NGN)" /> */}
                      <Input
                        type="number"
                        value={field.state.value}
                        onChange={(e) =>
                          field.handleChange(Number(e.target.value))
                        }
                      />
                    </div>
                  )}
                </form.Field>
              </div>
            </DialogPadding>

            <DialogFooter>
              <form.Subscribe
                selector={(state) => [state.canSubmit]}
                children={([canSubmit]) => (
                  <Button
                    type="submit"
                    disabled={!canSubmit || saveMutation.isPending}
                    loading={saveMutation.isPending}
                    variant="secondary"
                    size="xl"
                    className="px-8"
                  >
                    Save changes
                  </Button>
                )}
              />
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
