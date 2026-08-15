import {
  getSystemSetting,
  updateSystemSetting,
} from "#/lib/server/systemSettings";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";
import * as React from "react";
import { cn } from "@repo/ui/lib/utils";

export interface TestRequirementWindow {
  days_before_election: number;
  quota: number;
}

export interface TestRequirements {
  total_required: number;
  windows: TestRequirementWindow[];
}

export function TestRequirementsDialog({
  settingKey,
  roleName,
  open,
  onClose,
  onSuccess,
}: {
  settingKey: string;
  roleName: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);

  const { data: settingRes, isLoading } = useQuery({
    queryKey: ["systemSetting", settingKey],
    queryFn: () => getSystemSetting({ data: settingKey }),
    enabled: open,
  });

  const settingData: TestRequirements | null = React.useMemo(() => {
    const value = settingRes?.data?.setting?.value || settingRes?.data?.value;
    if (settingRes?.success && value) {
      return value;
    }
    return null;
  }, [settingRes]);

  // TanStack Form configuration
  const form = useForm({
    defaultValues: {
      total_required: 10,
      windows: [
        { days_before_election: 365, quota: 4 },
        { days_before_election: 30, quota: 3 },
        { days_before_election: 7, quota: 3 },
      ],
    } as TestRequirements,
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  React.useEffect(() => {
    if (open && settingData) {
      form.setFieldValue("total_required", settingData.total_required);
      form.setFieldValue("windows", settingData.windows || []);
      setError(null);
    }
  }, [open, settingData]);

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form.state.values) => {
      const res = await updateSystemSetting({
        data: {
          key: settingKey,
          value: values,
          description: `Test requirements for ${roleName.toLowerCase()}: total tests expected and how many are allocated per pre-election window`,
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
      <DialogContent className="max-w-[520px] p-0 rounded-2xl border-none shadow-2xl   overflow-visible">
        <DialogHeader title={`Test Requirements (${roleName})`} />

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
            <DialogPadding className="space-y-6 pb-5">
              <p className="text-c-50 leading-[22px]">
                Manage how many election day practice tests that party agents
                should take and the time period when it counts.
              </p>

              {error && (
                <div className="p-3 text-[14px] font-medium text-red-600 bg-red-50 rounded-xl">
                  {error}
                </div>
              )}

              {/* Total tests required */}
              <div className="space-y-2">
                <p className="text-c-80">Total tests required</p>
                <form.Field name="total_required">
                  {(field) => (
                    <Input
                      type="number"
                      className="h-10 font-medium"
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                    />
                  )}
                </form.Field>
              </div>

              {/* Windows */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg text-c-90">Windows</h3>
                  <Button
                    type="button"
                    variant="black"
                    className="px-3"
                    size="sm"
                    onClick={() => {
                      form.pushFieldValue("windows", {
                        days_before_election: 0,
                        quota: 0,
                      });
                    }}
                  >
                    <Plus className="size-4" /> Add
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <p className="text-c-60 w-full">Days before election</p>
                  <p className="text-c-60 w-full">Quota</p>
                  <div className="size-6" />
                </div>

                <form.Field name="windows">
                  {(field) => (
                    <div className="space-y-3">
                      {field.state.value.map((_, i) => (
                        <div key={i} className="flex gap-4 items-center">
                          <form.Field
                            name={`windows[${i}].days_before_election`}
                          >
                            {(subField) => (
                              <Input
                                type="number"
                                className="h-10 font-medium"
                                value={subField.state.value}
                                onChange={(e) =>
                                  subField.handleChange(Number(e.target.value))
                                }
                              />
                            )}
                          </form.Field>
                          <form.Field name={`windows[${i}].quota`}>
                            {(subField) => (
                              <Input
                                type="number"
                                className="h-10 font-medium"
                                value={subField.state.value}
                                onChange={(e) =>
                                  subField.handleChange(Number(e.target.value))
                                }
                              />
                            )}
                          </form.Field>
                          <button
                            type="button"
                            className="text-c-50 cursor-pointer hover:text-red-500 transition-colors"
                            onClick={() => {
                              field.removeValue(i);
                            }}
                          >
                            <X className="size-6" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </form.Field>
              </div>

              {/* Total */}
              <form.Subscribe
                selector={(state) => {
                  const values = state.values as any;
                  const total = (values.windows || []).reduce(
                    (acc: number, curr: any) => acc + (Number(curr.quota) || 0),
                    0,
                  );
                  const expected = Number(values.total_required) || 0;
                  return { total, expected };
                }}
                children={({ total, expected }) => (
                  <div className="flex items-center py-4 border-t border-border">
                    <p className="text-c-80 w-full">Total</p>
                    <span
                      className={cn(
                        "font-bold",
                        total === expected ? "text-green-500" : "text-red-500",
                      )}
                    >
                      {total}
                    </span>
                  </div>
                )}
              />
            </DialogPadding>

            <DialogFooter>
              <form.Subscribe
                selector={(state) => {
                  return { canSubmit: state.canSubmit, values: state.values };
                }}
                children={({ canSubmit, values }) => {
                  const currentTotalQuota = values.windows.reduce(
                    (acc: number, curr: TestRequirementWindow) =>
                      acc + (curr.quota || 0),
                    0,
                  );
                  const isTotalValid =
                    currentTotalQuota === values.total_required;

                  return (
                    <div className="flex flex-col w-full items-end gap-2">
                      <Button
                        type="submit"
                        disabled={
                          !canSubmit || saveMutation.isPending || !isTotalValid
                        }
                        loading={saveMutation.isPending}
                        variant="secondary"
                        size="xl"
                        className="px-8"
                      >
                        Save changes
                      </Button>
                    </div>
                  );
                }}
              />
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
