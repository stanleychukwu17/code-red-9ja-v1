import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { PercentageInput } from "@repo/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import {
  getSystemSetting,
  updateSystemSetting,
} from "#/lib/server/systemSettings";
import { Loader2 } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

export interface EarningsAllocation {
  readiness: number;
  results: number;
  updates: number;
  attendance: number;
  election_start: number;
  election_end: number;
  target_live_voters_referred_count: number;
}

const ALLOCATION_FIELDS: { name: keyof EarningsAllocation; label: string }[] = [
  { name: "readiness", label: "Readiness" },
  { name: "results", label: "Results Upload" },
  { name: "updates", label: "Updates" },
  { name: "attendance", label: "Attendance" },
  { name: "election_start", label: "Start Election" },
  { name: "election_end", label: "End Election" },
  { name: "target_live_voters_referred_count", label: "Live Voters Referred" },
];

function AllocationField({
  form,
  name,
  label,
}: {
  form: any;
  name: keyof EarningsAllocation;
  label: string;
}) {
  return (
    <div className="h-14 flex items-center justify-between gap-3">
      <p className="text-c-80 w-full">{label}</p>
      <form.Field name={name}>
        {(field: any) => (
          <div className="w-32">
            <PercentageInput
              className="h-10 py-1"
              value={field.state.value}
              onChange={(val: any) => field.handleChange(val)}
            />
          </div>
        )}
      </form.Field>
    </div>
  );
}

export function EarningsAllocationDialog({
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

  const settingData: EarningsAllocation | null = React.useMemo(() => {
    const value = settingRes?.data?.setting?.value || settingRes?.data?.value;
    if (settingRes?.success && value) {
      // The value is stored as a JSON object, e.g. {"readiness": "20%", ...}
      return value;
    }
    return null;
  }, [settingRes]);

  // No longer needed, values are already numbers from DB
  const parsePercent = (val?: number | string) => {
    if (typeof val === "number") return val;
    if (typeof val === "string") return parseInt(val.replace("%", ""), 10) || 0;
    return 0;
  };

  // TanStack Form configuration
  const form = useForm({
    defaultValues: {
      readiness: 0,
      results: 0,
      updates: 0,
      attendance: 0,
      election_start: 0,
      election_end: 0,
      target_live_voters_referred_count: 0,
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  React.useEffect(() => {
    if (open && settingData) {
      ALLOCATION_FIELDS.forEach(({ name }) => {
        const val =
          settingData[name] ??
          (name === "target_live_voters_referred_count"
            ? (settingData as any).live_voters_referred
            : undefined);
        form.setFieldValue(name, parsePercent(val));
      });
      setError(null);
    }
  }, [open, settingData]);

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form.state.values) => {
      const payload: Partial<EarningsAllocation> = {};
      ALLOCATION_FIELDS.forEach(({ name }) => {
        payload[name] = values[name];
      });

      const res = await updateSystemSetting({
        data: {
          key: settingKey,
          value: payload as EarningsAllocation,
          description: `Earnings allocation for ${roleName.toLowerCase()}`,
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
        <DialogHeader title={`Earnings Allocation (${roleName})`} />

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
              <p className="text-c-50 leading-[22px]">{`This determines the allocation for how much ${roleName.toLowerCase()} per task completion.`}</p>

              {error && (
                <div className="p-3 text-[14px] font-medium text-red-600 bg-red-50 rounded-xl">
                  {error}
                </div>
              )}

              <div>
                {ALLOCATION_FIELDS.map((field) => (
                  <AllocationField
                    key={field.name}
                    form={form}
                    name={field.name}
                    label={field.label}
                  />
                ))}
              </div>

              {/* Total */}
              <form.Subscribe
                selector={(state) => {
                  const values = state.values as any;
                  return ALLOCATION_FIELDS.reduce(
                    (acc, field) => acc + (Number(values[field.name]) || 0),
                    0,
                  );
                }}
                children={(total) => (
                  <div className="flex items-center py-4 border-t border-border">
                    <p className="text-c-80 w-full">Total</p>
                    <span
                      className={cn(
                        "font-bold",
                        total === 100 ? "text-green-500" : "text-red-500",
                      )}
                    >
                      {total}%
                    </span>
                  </div>
                )}
              />
            </DialogPadding>

            <DialogFooter>
              <form.Subscribe
                selector={(state) => {
                  const values = state.values as any;
                  const total = ALLOCATION_FIELDS.reduce(
                    (acc, field) => acc + (Number(values[field.name]) || 0),
                    0,
                  );
                  return { canSubmit: state.canSubmit, total };
                }}
                children={({ canSubmit, total }) => (
                  <Button
                    type="submit"
                    disabled={
                      !canSubmit || saveMutation.isPending || total !== 100
                    }
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
