import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import {
  getSystemSetting,
  updateSystemSetting,
} from "#/lib/server/systemSettings";
import { Loader2 } from "lucide-react";

export interface UpdateScheduleConfig {
  target_updates_count: number;
  start_time: string;
  end_time: string;
  interval_minutes: number;
}

export function UpdateScheduleConfigDialog({
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
  const settingKey = "update_schedule_config";

  const { data: settingRes, isLoading } = useQuery({
    queryKey: ["systemSetting", settingKey],
    queryFn: async () => {
      const res = await getSystemSetting({ data: settingKey });
      if (!res.success) {
        // Try fallback to legacy target_updates_count setting if missing
        const legacyRes = await getSystemSetting({
          data: "target_updates_count",
        });
        if (legacyRes.success && legacyRes.data) {
          const val = legacyRes.data?.setting?.value ?? legacyRes.data?.value;
          return {
            target_updates_count: typeof val === "number" ? val : 20,
            start_time: "07:00",
            end_time: "17:00",
            interval_minutes: 30,
          };
        }
        throw new Error(res.message || "Failed to fetch system setting");
      }
      return res.data;
    },
    enabled: open,
  });

  const settingData: UpdateScheduleConfig | null = React.useMemo(() => {
    const value = settingRes?.setting?.value || settingRes?.value || settingRes;
    if (value && typeof value === "object") {
      return {
        target_updates_count: Number(value.target_updates_count) || 20,
        start_time: value.start_time || "07:00",
        end_time: value.end_time || "17:00",
        interval_minutes: Number(value.interval_minutes) || 30,
      };
    }
    return null;
  }, [settingRes]);

  const form = useForm({
    defaultValues: {
      target_updates_count: 20,
      start_time: "07:00",
      end_time: "17:00",
      interval_minutes: 30,
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  React.useEffect(() => {
    if (open && settingData) {
      form.setFieldValue(
        "target_updates_count",
        settingData.target_updates_count,
      );
      form.setFieldValue("start_time", settingData.start_time);
      form.setFieldValue("end_time", settingData.end_time);
      form.setFieldValue("interval_minutes", settingData.interval_minutes);
      setError(null);
    }
  }, [open, settingData]);

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form.state.values) => {
      const res = await updateSystemSetting({
        data: {
          key: settingKey,
          value: values,
          description:
            "Configuration for election update schedule including target updates count, start time (HH:MM), end time (HH:MM), and interval in minutes",
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
        <DialogHeader title="Update Schedule Settings" />

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
            <DialogPadding className="space-y-4 pb-2">
              <p className="text-c-50 leading-[22px]">
                Configure the update schedule parameters for polling agents on
                election day.
              </p>

              {error && (
                <div className="p-3 text-[14px] font-medium text-red-600 bg-red-50 rounded-xl">
                  {error}
                </div>
              )}

              <div>
                {/* Target Updates Count */}
                <div className="h-14 flex items-center justify-between gap-3">
                  <p className="text-c-80 w-full">Target Updates Count</p>
                  <form.Field name="target_updates_count">
                    {(field) => (
                      <div className="w-36">
                        <Input
                          type="number"
                          min="1"
                          className="h-10 py-1"
                          value={field.state.value}
                          onChange={(e) =>
                            field.handleChange(Number(e.target.value))
                          }
                        />
                      </div>
                    )}
                  </form.Field>
                </div>

                {/* Interval Minutes */}
                <div className="h-14 flex items-center justify-between gap-3">
                  <p className="text-c-80 w-full">Update Interval (Mins)</p>
                  <form.Field name="interval_minutes">
                    {(field) => (
                      <div className="w-36">
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          className="h-10 py-1"
                          value={field.state.value}
                          onChange={(e) =>
                            field.handleChange(Number(e.target.value))
                          }
                        />
                      </div>
                    )}
                  </form.Field>
                </div>

                {/* Start Time */}
                <div className="h-14 flex items-center justify-between gap-3">
                  <p className="text-c-80 w-full">Updates Start Time</p>
                  <form.Field name="start_time">
                    {(field) => (
                      <div className="w-36">
                        <Input
                          type="time"
                          className="h-10 py-1 px-3"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  </form.Field>
                </div>

                {/* End Time */}
                <div className="h-14 flex items-center justify-between gap-3">
                  <p className="text-c-80 w-full">Updates End Time</p>
                  <form.Field name="end_time">
                    {(field) => (
                      <div className="w-36">
                        <Input
                          type="time"
                          className="h-10 py-1 px-3"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  </form.Field>
                </div>
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
