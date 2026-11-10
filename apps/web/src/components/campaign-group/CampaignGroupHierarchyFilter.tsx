import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Plus, Loader2, ArrowRightLeft } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { SelectLga } from "@repo/ui/components/selects/lga-select";
import { SelectWard } from "@repo/ui/components/selects/ward-select";
import { getStates } from "#/lib/server/countries";
import { getLGAsByState, getWardsByLGA } from "#/lib/server/polling_units";
import { APP_URL, NIGERIA_COUNTRY_ID } from "#/lib/config";
import type { Party } from "#/hooks";
import { switchCampaignGroup, type CampaignGroupDetails, type SwitchCampaignGroupInput } from "@/lib/server/campaign_groups";

// Component props
export type CampaignGroupHierarchyFilterProps = {
  activeParty: Party;
  group: CampaignGroupDetails;
  partyShortName?: string;
  isSyncing?: boolean;
  onSync?: () => void;
};

// Hierarchy breadcrumb item
type HierarchyStep = {
  id: string;
  label: string;
  level: "national" | "state" | "lga" | "ward";
  payload: SwitchCampaignGroupInput;
  isCurrent: boolean;
};

type HierarchyStepItemProps = {
  step: HierarchyStep;
  isLast: boolean;
  activeParty: Party;
};

// Mini component representing a territorial level in the breadcrumb chain
function HierarchyStepItem({ step, isLast, activeParty }: HierarchyStepItemProps) {
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

// Title-case territory names (e.g. LAGOS -> Lagos)
function toTitleCase(str?: string | null): string {
  if (!str) return "";
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Format dynamic switch button label
function formatGroupSwitchLabel(type: "ward" | "lga" | "state", name?: string): string {
  const cleanName = toTitleCase(name);
  if (type === "ward") return `Switch to ${cleanName || "ward"} ward group`;
  if (type === "lga") return `Switch to ${cleanName || "LGA"} LGA group`;
  return `Switch to ${cleanName || "state"} state group`;
}

export function CampaignGroupHierarchyFilter({
  activeParty,
  group,
  isSyncing,
  onSync,
}: CampaignGroupHierarchyFilterProps) {
  const navigate = useNavigate();

  // Build territorial hierarchy breadcrumbs from group scope and territory
  const hierarchySteps = useMemo<HierarchyStep[]>(() => {
    const steps: HierarchyStep[] = [
      {
        id: "national",
        label: "National",
        level: "national",
        isCurrent: group.scope === "national",
        payload: { partyId: activeParty.id },
      },
    ];

    if (!group) return steps;

    if (group.scope === "state" || group.scope === "lga" || group.scope === "ward") {
      const stateTitle = group.state_name ? `${toTitleCase(group.state_name)} state` : "State";
      steps.push({
        id: "state",
        label: stateTitle,
        level: "state",
        isCurrent: group.scope === "state",
        payload: {
          partyId: activeParty.id,
          stateId: group.state_id ? Number(group.state_id) : undefined,
        },
      });
    }

    if (group.scope === "lga" || group.scope === "ward") {
      const lgaTitle = group.lga_name ? `${toTitleCase(group.lga_name)} Lga` : "LGA";
      steps.push({
        id: "lga",
        label: lgaTitle,
        level: "lga",
        isCurrent: group.scope === "lga",
        payload: {
          partyId: activeParty.id,
          stateId: group.state_id ? Number(group.state_id) : undefined,
          lgaId: group.lga_id ? Number(group.lga_id) : undefined,
        },
      });
    }

    if (group.scope === "ward") {
      const wardTitle = group.ward_name ? `${toTitleCase(group.ward_name)} Ward` : "Ward";
      steps.push({
        id: "ward",
        label: wardTitle,
        level: "ward",
        isCurrent: group.scope === "ward",
        payload: {
          partyId: activeParty.id,
          stateId: group.state_id ? Number(group.state_id) : undefined,
          lgaId: group.lga_id ? Number(group.lga_id) : undefined,
          wardId: group.ward_id ? Number(group.ward_id) : undefined,
        },
      });
    }

    return steps;
  }, [group, activeParty.id]);

  // Territorial selection states
  const [selectedState, setSelectedState] = useState<{ id: number; name: string } | undefined>(
    group?.state_id ? { id: Number(group.state_id), name: group.state_name || "" } : undefined
  );
  const [selectedLga, setSelectedLga] = useState<{ id: number; name: string } | undefined>(
    group?.lga_id ? { id: Number(group.lga_id), name: group.lga_name || "" } : undefined
  );
  const [selectedWard, setSelectedWard] = useState<{ id: number; name: string } | undefined>(
    group?.ward_id ? { id: Number(group.ward_id), name: group.ward_name || "" } : undefined
  );

  // Sync state if group data changes
  useEffect(() => {
    setSelectedState(
      group?.state_id ? { id: Number(group.state_id), name: group.state_name || "" } : undefined
    );
    setSelectedLga(
      group?.lga_id ? { id: Number(group.lga_id), name: group.lga_name || "" } : undefined
    );
    setSelectedWard(
      group?.ward_id ? { id: Number(group.ward_id), name: group.ward_name || "" } : undefined
    );
  }, [group?.state_id, group?.state_name, group?.lga_id, group?.lga_name, group?.ward_id, group?.ward_name]);

  const showState = true;
  const showLga = Boolean(selectedState?.id);
  const showWard = Boolean(selectedLga?.id);

  // Dynamic label for group switcher button
  const switchButtonText = useMemo(() => {
    if (selectedWard?.id) {
      return formatGroupSwitchLabel("ward", selectedWard.name);
    }
    if (selectedLga?.id) {
      return formatGroupSwitchLabel("lga", selectedLga.name);
    }
    if (selectedState?.id) {
      return formatGroupSwitchLabel("state", selectedState.name);
    }

    return "Switch to national group";
  }, [selectedWard, selectedLga, selectedState]);

  // Hide the switch button if the selected territory is already what is currently being viewed
  const isViewingSelectedGroup = useMemo(() => {
    if (!group) return false;
    if (selectedWard?.id) {
      return group.scope === "ward" && Number(group.ward_id) === Number(selectedWard.id);
    }
    if (selectedLga?.id) {
      return group.scope === "lga" && Number(group.lga_id) === Number(selectedLga.id);
    }
    if (selectedState?.id) {
      return group.scope === "state" && Number(group.state_id) === Number(selectedState.id);
    }
    return group.scope === "national";
  }, [group, selectedWard, selectedLga, selectedState]);

  // Mutation to request switching campaign group
  const switchGroupMutation = useMutation({
    mutationFn: async (payload: SwitchCampaignGroupInput) => {
      const res = await switchCampaignGroup({ data: payload });
      return res;
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

  return (
    <div className="w-full space-y-8 pt-4">
      {/* 1. TOP: Centered Territorial Hierarchy Chain */}
      <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap py-2">
        {hierarchySteps.map((step, idx) => (
          <HierarchyStepItem
            key={step.id}
            step={step}
            isLast={idx === hierarchySteps.length - 1}
            activeParty={activeParty}
          />
        ))}
      </div>

      {/* 2. BOTTOM: Filter Chapters Bar & Sync Officials Button */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4 border-t border-border/40">
        {/* Left Side: Filter Chapters */}
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <span className="text-sm sm:text-base font-bold text-foreground shrink-0 pb-1">
            Find other groups:
          </span>

          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {/* National Group */}
            <div className="space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-foreground block">
                National:
              </span>
              <div className="h-8.5 px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-neutral-800 text-xs sm:text-sm font-medium text-foreground">
                National group
              </div>
            </div>

            {/* State Select element from packages/ui */}
            {showState && (
              <div className="space-y-1">
                <span className="text-[11px] sm:text-xs font-semibold text-foreground block">
                  State:
                </span>
                <SelectState
                  showAll={"All States"}
                  countryOriginalId={NIGERIA_COUNTRY_ID}
                  fetchStates={getStates}
                  selectedId={selectedState?.id}
                  update={(selected) => {
                    if (selected?.id) {
                      setSelectedState({ id: Number(selected.id), name: selected.name });
                    } else {
                      setSelectedState(undefined);
                    }
                    setSelectedLga(undefined);
                    setSelectedWard(undefined);
                  }}
                  size="sm"
                  className="h-8.5 text-xs rounded-lg min-w-35 border-none"
                />
              </div>
            )}

            {/* LGA Selector */}
            {showLga && (
              <div className="space-y-1">
                <span className="text-[11px] sm:text-xs font-semibold text-foreground block">
                  lga:
                </span>
                <SelectLga
                  showAll={"All LGAs" as any}
                  stateId={selectedState?.id}
                  fetchLGAs={getLGAsByState}
                  selectedId={selectedLga?.id}
                  update={(selected) => {
                    if (selected?.id) {
                      setSelectedLga({ id: Number(selected.id), name: selected.name });
                    } else {
                      setSelectedLga(undefined);
                    }
                    setSelectedWard(undefined);
                  }}
                  size="sm"
                  className="h-8.5 text-xs rounded-lg min-w-35 border-none"
                />
              </div>
            )}

            {/* Ward Selector */}
            {showWard && (
              <div className="space-y-1">
                <span className="text-[11px] sm:text-xs font-semibold text-foreground block">
                  Ward:
                </span>
                <SelectWard
                  showAll={"All Wards" as any}
                  lgaId={selectedLga?.id}
                  stateId={selectedState?.id}
                  fetchWards={(args) =>
                    getWardsByLGA({
                      data: {
                        lgaId: args.data.lga_id || (args.data as any).lgaId,
                        stateId: args.data.stateId,
                      },
                    })
                  }
                  selectedId={selectedWard?.id}
                  update={(selected) => {
                    if (selected?.id) {
                      setSelectedWard({ id: Number(selected.id), name: selected.name });
                    } else {
                      setSelectedWard(undefined);
                    }
                  }}
                  size="sm"
                  className="h-8.5 text-xs rounded-lg min-w-35 border-none"
                />
              </div>
            )}
          </div>

          {/* the button for switching of group (hidden if currently viewing this group) */}
          {!isViewingSelectedGroup && (
            <div className="self-end">
              <button
                type="button"
                disabled={switchGroupMutation.isPending}
                onClick={() => {
                  switchGroupMutation.mutate({
                    partyId: activeParty.id,
                    stateId: selectedState?.id,
                    lgaId: selectedLga?.id,
                    wardId: selectedWard?.id,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 text-xs sm:text-sm font-semibold transition active:scale-95 cursor-pointer shadow-xs whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {switchGroupMutation.isPending ? (
                  <Loader2 className="size-3.5 stroke-2 shrink-0 animate-spin" />
                ) : (
                  <ArrowRightLeft className="size-3.5 stroke-2 shrink-0" />
                )}
                <span>{switchGroupMutation.isPending ? "Switching..." : switchButtonText}</span>
              </button>
            </div>
          )}
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
                <Plus className="size-4 stroke-3 text-neutral-900" />
                <span>sync officials</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

