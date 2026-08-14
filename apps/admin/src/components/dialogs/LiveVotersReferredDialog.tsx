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

export function LiveVotersReferredDialog({
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
  const settingKey = "target_live_voters_referred_count";

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
      targetNumber: 0,
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  React.useEffect(() => {
    if (open && settingData !== undefined) {
      form.setFieldValue("targetNumber", settingData);
      setError(null);
    }
  }, [open, settingData]);

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form.state.values) => {
      const res = await updateSystemSetting({
        data: {
          key: settingKey,
          value: values.targetNumber,
          description:
            "The target number of live voters an agent is expected to refer",
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
      <DialogContent className="max-w-[480px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-visible">
        <DialogHeader title="Update Target Live Voters Referred" />

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
                Set the target for how many live voters agents are expected to
                refer.
              </p>

              {error && (
                <div className="p-3 text-[14px] font-medium text-red-600 bg-red-50 rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <form.Field name="targetNumber">
                  {(field) => (
                    <div className="space-y-2">
                      <Input
                        type="number"
                        min="0"
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
