import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { APP_URL } from "#/lib/config";
import { switchCampaignGroup } from "@/lib/server/campaign_groups";
import type { HierarchyStep, HierarchyStepItemProps, SwitchCampaignGroupInput } from "./types";

export type { HierarchyStep, HierarchyStepItemProps };

/**
 * Interactive territorial level item in the campaign group hierarchy chain.
 * Navigates directly to the target group when clicked.
 */
export function HierarchyStepItem({ step, isLast, activeParty }: HierarchyStepItemProps) {
  const navigate = useNavigate();

  const stepMutation = useMutation({
    mutationFn: async (payload: SwitchCampaignGroupInput) => {
      return await switchCampaignGroup({ data: payload });
    },

    onSuccess: (res) => {
      if (res && res.success && res.data?.group_id) {
        navigate({
          to: APP_URL.group(activeParty.id, res.data.group_id, "home"),
        });
      } else {
        toast.error(res?.message || "Campaign group not found for this territory");
      }
    },

    onError: (err: any) => {
      toast.error(err?.message || "Failed to switch campaign group");
    },
  });

  const handleClick = () => {
    if (step.isCurrent || stepMutation.isPending) return;
    stepMutation.mutate(step.payload);
  };

  return (
    <div className="flex items-center gap-3 sm:gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <button
          type="button"
          onClick={handleClick}
          disabled={step.isCurrent || stepMutation.isPending}
          title={step.isCurrent ? `Currently viewing ${step.label}` : `Switch to ${step.label} group`}
          className={cn(
            "relative size-16 sm:size-20 rounded-full bg-[#fcf9f2] dark:bg-neutral-800/80 border flex items-center justify-center shadow-sm transition-all overflow-hidden",
            step.isCurrent
              ? "ring-2 ring-primary ring-offset-2 border-primary cursor-default opacity-100"
              : "border-amber-100/70 dark:border-neutral-700/60 cursor-pointer hover:scale-105 hover:ring-2 hover:ring-neutral-400 active:scale-95"
          )}
        >
          <img
            src="https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
            alt={step.label}
            className="size-full object-cover rounded-full"
          />

          {stepMutation.isPending && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center rounded-full">
              <Loader2 className="size-5 text-white animate-spin" />
            </div>
          )}
        </button>
        <span
          className={cn(
            "text-xs sm:text-sm font-semibold tracking-tight transition-colors",
            step.isCurrent
              ? "text-primary font-bold cursor-default"
              : "text-foreground hover:text-primary cursor-pointer"
          )}
          onClick={handleClick}
        >
          {step.label}
        </span>
      </div>

      {!isLast && (
        <div className="flex items-center justify-center mb-6">
          <ArrowRight className="size-4 sm:size-5 text-neutral-600 dark:text-neutral-400 stroke-2" />
        </div>
      )}
    </div>
  );
}

export const CampaignGroupHierarchyStepItem = HierarchyStepItem;