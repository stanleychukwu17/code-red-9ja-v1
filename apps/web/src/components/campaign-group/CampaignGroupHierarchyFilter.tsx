import { useMemo } from "react";
import { ArrowRight, Plus, Loader2 } from "lucide-react";
import type { Party } from "#/hooks";
import type { CampaignGroupDetails } from "@/lib/server/campaign_groups";

export type CampaignGroupHierarchyFilterProps = {
  activeParty?: Party | null;
  group?: CampaignGroupDetails;
  partyShortName?: string;
  isSyncing?: boolean;
  onSync?: () => void;
};

type HierarchyStep = {
  id: string;
  label: string;
  level: "national" | "state" | "lga" | "ward";
};

function toTitleCase(str?: string | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function CampaignGroupHierarchyFilter({
  activeParty,
  group,
  isSyncing,
  onSync,
}: CampaignGroupHierarchyFilterProps) {
  // Build territorial hierarchy breadcrumbs from group scope and territory
  const hierarchySteps = useMemo<HierarchyStep[]>(() => {
    const steps: HierarchyStep[] = [{ id: "national", label: "National", level: "national" }];

    if (!group) return steps;

    if (group.scope === "state" || group.scope === "lga" || group.scope === "ward") {
      const stateTitle = group.state_name ? `${toTitleCase(group.state_name)} state` : "State";
      steps.push({ id: "state", label: stateTitle, level: "state" });
    }

    if (group.scope === "lga" || group.scope === "ward") {
      const lgaTitle = group.lga_name ? `${toTitleCase(group.lga_name)} Lga` : "LGA";
      steps.push({ id: "lga", label: lgaTitle, level: "lga" });
    }

    if (group.scope === "ward") {
      const wardTitle = group.ward_name ? `${toTitleCase(group.ward_name)} Ward` : "Ward";
      steps.push({ id: "ward", label: wardTitle, level: "ward" });
    }

    return steps;
  }, [group]);

  const stateName = group?.state_name ? toTitleCase(group.state_name) : "State";
  const lgaName = group?.lga_name ? toTitleCase(group.lga_name) : "LGA";
  const wardName = group?.ward_name ? toTitleCase(group.ward_name) : "Ward";

  const showState = group?.scope === "state" || group?.scope === "lga" || group?.scope === "ward" || Boolean(group?.state_name);
  const showLga = group?.scope === "lga" || group?.scope === "ward" || Boolean(group?.lga_name);
  const showWard = group?.scope === "ward" || Boolean(group?.ward_name);

  return (
    <div className="w-full space-y-8 pt-4">
      {/* 1. TOP: Centered Territorial Hierarchy Chain */}
      <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap py-2">
        {hierarchySteps.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-3 sm:gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="size-16 sm:size-20 rounded-full bg-[#fcf9f2] dark:bg-neutral-800/80 border border-amber-100/70 dark:border-neutral-700/60 flex items-center justify-center shadow-sm">
                <img
                  src={"https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"}
                  alt={step.label}
                  className="size-full object-cover rounded-full"
                />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-foreground tracking-tight">
                {step.label}
              </span>
            </div>

            {idx < hierarchySteps.length - 1 && (
              <div className="flex items-center justify-center mb-6">
                <ArrowRight className="size-4 sm:size-5 text-neutral-600 dark:text-neutral-400 stroke-[2]" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 2. BOTTOM: Filter Chapters Bar & Sync Officials Button */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4 border-t border-border/40">
        {/* Left Side: Filter Chapters */}
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <span className="text-sm sm:text-base font-bold text-foreground shrink-0 pb-1">
            Filter:
          </span>

          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {/* National Chapter */}
            <div className="space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-foreground block">
                National:
              </span>
              <div className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-neutral-800 text-xs sm:text-sm font-medium text-foreground">
                Nigeria chapter
              </div>
            </div>

            {/* State Chapter */}
            {showState && (
              <div className="space-y-1">
                <span className="text-[11px] sm:text-xs font-semibold text-foreground block">
                  State:
                </span>
                <div className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-neutral-800 text-xs sm:text-sm font-medium text-foreground">
                  {stateName} chapter
                </div>
              </div>
            )}

            {/* LGA Chapter */}
            {showLga && (
              <div className="space-y-1">
                <span className="text-[11px] sm:text-xs font-semibold text-foreground block">
                  lga:
                </span>
                <div className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-neutral-800 text-xs sm:text-sm font-medium text-foreground">
                  {lgaName} chapter
                </div>
              </div>
            )}

            {/* Ward Chapter */}
            {showWard && (
              <div className="space-y-1">
                <span className="text-[11px] sm:text-xs font-semibold text-foreground block">
                  Ward:
                </span>
                <div className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-neutral-800 text-xs sm:text-sm font-medium text-foreground">
                  {wardName} chapter
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Sync Officials Action Button */}
        <div className="shrink-0 self-end md:self-auto">
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#c6f987] hover:bg-[#b8f573] active:scale-95 text-neutral-900 font-bold text-xs sm:text-sm transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSyncing ? (
              <>
                <Loader2 className="size-4 animate-spin text-neutral-900" />
                <span>syncing...</span>
              </>
            ) : (
              <>
                <Plus className="size-4 stroke-[3] text-neutral-900" />
                <span>sync officials</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

