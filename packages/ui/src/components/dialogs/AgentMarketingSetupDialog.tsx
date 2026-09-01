import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { cn } from "../../lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SelectElectionGroup } from "../selects/election-group-select";
import { SelectElection } from "../selects/election-select";
import { Label } from "../input";
import CheckStrokeIcon from "../../icons/check-stroke-icon";

/** Raw plan shape as returned by the API. */
export type ApiPlan = {
  id: number;
  name: string;
  description: string;
  price_kobo?: number;
  price?: number;
  type: string;
  features: string[];
  scopes_recommendation: string[];
  color_hex?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type ElectionOption = {
  id: string;
  label: string;
};

export type StateObject = {
  id: number;
  name: string;
};

export type AgentMarketingSetupValue = {
  electionGroupId: string;
  electionId: string;
  planId: string;
  targetMode: "custom" | "all";
  states: StateObject[];
  durationUnit: "days" | "months";
  durationValue: number;
  budgetPerDayKobo?: number;
  budgetKobo?: number;
  budgetPerDay?: number;
  budget?: number;
};

export type AgentMarketingSetupSubmitPayload = {
  electionGroupId: number;
  electionId: number;
  planId: number;
  partyId?: number;
  type: string;
  states: StateObject[];
  durationInDays: number;
  budgetPerDayKobo: number;
  budgetKobo: number;
  budgetPerDay: number;
  budget: number;
  rawFormValue: AgentMarketingSetupValue;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: AgentMarketingSetupSubmitPayload) => Promise<any> | void;
  isPending?: boolean;
  partyId?: number;
  fetchElectionGroups: (args: any) => Promise<any>;
  fetchElection: (args: any) => Promise<any>;
  fetchPlans: (args: any) => Promise<any>;
  fetchStates?: (args: {
    data: { countryId: number; limit?: number };
  }) => Promise<any>;
  states?: (string | StateObject)[];
  defaultValue?: Partial<AgentMarketingSetupValue>;
  initialStep?: 1 | 2 | 3;
};

const DEFAULT_VALUE: AgentMarketingSetupValue = {
  electionGroupId: "",
  electionId: "",
  planId: "",
  targetMode: "custom",
  states: [],
  durationUnit: "days",
  durationValue: 5,
};

/** Convert a hex color string to rgba() with the given alpha (0–1). */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatMoney(value: number) {
  return `NGN ${value.toLocaleString()}`;
}

function formatDurationLabel(value: number, unit: "days" | "months") {
  return unit === "days" ? `${value} days` : `${value} months`;
}

function SegmentedToggle({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-c-5 p-1">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "min-w-[126px] rounded-full px-5 py-3 text-[17px] font-medium transition-colors",
              active
                ? "bg-c-90 text-white shadow-[0_4px_12px_rgba(0,0,0,0.16)]"
                : "text-c-80 hover: ",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[12px] px-4 py-3 text-[16px] font-medium transition-colors",
        active ? "bg-[#BDF1D8] text-c-90" : "bg-c-5 text-c-80 hover:bg-c-10",
      )}
    >
      {children}
    </button>
  );
}

function PlanCard({
  plan,
  active,
  onSelect,
  electionScope,
}: {
  plan: ApiPlan;
  active: boolean;
  onSelect: () => void;
  electionScope?: string;
}) {
  const accent = plan.color_hex ?? "#744B3E";
  const priceInNaira =
    plan.price_kobo !== undefined
      ? Number(plan.price_kobo) / 100
      : typeof plan.price === "string"
        ? parseFloat(plan.price)
        : Number(plan.price ?? 0);
  const features = Array.isArray(plan.features) ? plan.features : [];
  const isRecommended =
    !!electionScope &&
    Array.isArray(plan.scopes_recommendation) &&
    plan.scopes_recommendation.includes(electionScope);

  return (
    <div
      onClick={onSelect}
      style={{ backgroundColor: !active ? hexToRgba(accent, 0.1) : "" }}
      className={cn(
        "relative flex-shrink-0 w-[360px] rounded-[24px] p-5 text-left transition-all cursor-pointer",
        active ? "ring-3 ring-c-80" : "",
      )}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <p
            className="text-[17px] font-semibold w-full"
            style={{ color: accent }}
          >
            {plan.name}
          </p>
          {isRecommended && (
            <span className="rounded-full bg-[#FFE9D4] px-3 py-1 text-[12px] font-semibold text-[#FF8A00]">
              Recommended
            </span>
          )}
        </div>

        <p className="leading-5 text-c-50">{plan.description}</p>
      </div>

      <div className="mt-3 flex items-end gap-1.5 font-medium">
        <span className="text-[2rem] tracking-[-0.04em] text-c-90">
          {formatMoney(priceInNaira)}
        </span>
        <span className="text-c-50 mb-1.5">/ day / state</span>
      </div>

      <div className="mt-3">
        {features.map((feature) => (
          <div
            key={feature}
            className="h-10 flex items-center gap-3 leading-5 text-c-80"
          >
            <CheckStrokeIcon
              className="shrink-0 size-6"
              style={{ color: accent }}
            />
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanList({
  plans,
  selectedId,
  onSelect,
  isLoading,
  electionScope,
  scrollRef,
}: {
  plans: ApiPlan[];
  selectedId: string;
  onSelect: (id: string) => void;
  isLoading: boolean;
  electionScope?: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (isLoading) {
    return (
      <div className="flex gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[240px] min-h-[270px] rounded-[24px] bg-c-5 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex gap-4 overflow-x-auto pb-2 scroll-smooth p-4"
      style={{ scrollbarWidth: "none" }}
    >
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          active={selectedId === String(plan.id)}
          onSelect={() => onSelect(String(plan.id))}
          electionScope={electionScope}
        />
      ))}
    </div>
  );
}

function IconButton({
  icon,
  onClick,
}: {
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="size-12 shrink-0 flex items-center justify-center rounded-full bg-c-5 transition-colors hover:ring-1 hover:ring-c-80 cursor-pointer"
      aria-label="Scroll left or right"
    >
      {icon}
    </button>
  );
}

export function AgentMarketingSetupDialog({
  open,
  onClose,
  onSubmit,
  isPending,
  partyId,
  fetchElectionGroups,
  fetchElection,
  fetchPlans,
  fetchStates,
  states: inputStates,
  defaultValue,
  initialStep = 1,
}: Props) {
  const planScrollRef = React.useRef<HTMLDivElement>(null);
  const [plans, setPlans] = React.useState<ApiPlan[]>([]);
  const [plansLoading, setPlansLoading] = React.useState(false);
  const [fetchedStates, setFetchedStates] = React.useState<StateObject[]>([]);
  const [electionScope, setElectionScope] = React.useState<string | undefined>(
    undefined,
  );

  const [step, setStep] = React.useState<1 | 2 | 3>(initialStep);
  const [selectedGroupName, setSelectedGroupName] = React.useState(
    "Select election group",
  );
  const [selectedElectionName, setSelectedElectionName] =
    React.useState("Select election");
  const [value, setValue] = React.useState<AgentMarketingSetupValue>({
    ...DEFAULT_VALUE,
    ...defaultValue,
    states: defaultValue?.states ?? [],
  });

  const submitMutation = useMutation({
    mutationFn: (payload: AgentMarketingSetupSubmitPayload) =>
      Promise.resolve(onSubmit(payload)),
  });

  const isSubmitting = submitMutation.isPending || !!isPending;

  // Automatically fetch Nigeria (countryId 161) states if fetchStates prop is provided
  React.useEffect(() => {
    if (!open || !fetchStates) return;
    fetchStates({ data: { countryId: 161, limit: 100 } })
      .then((res: any) => {
        const rawStates = res?.data?.states ?? res?.data ?? [];
        if (Array.isArray(rawStates) && rawStates.length > 0) {
          const formatted: StateObject[] = rawStates.map(
            (s: any, idx: number) => {
              if (typeof s === "string") {
                return { id: idx + 1, name: s };
              }
              return { id: s.id ?? idx + 1, name: s.name ?? String(s) };
            },
          );
          setFetchedStates(formatted);
        }
      })
      .catch(() => {});
  }, [open, fetchStates]);

  // Compute final normalized states list
  const availableStates: StateObject[] = React.useMemo(() => {
    if (fetchedStates.length > 0) return fetchedStates;
    if (inputStates && inputStates.length > 0) {
      return inputStates.map((s, idx) => {
        if (typeof s === "string") return { id: idx + 1, name: s };
        return s;
      });
    }
    return [];
  }, [fetchedStates, inputStates]);

  // Fetch plans once when dialog opens
  React.useEffect(() => {
    if (!open) return;
    setPlansLoading(true);
    fetchPlans({ data: { type: "agent-campaign" } })
      .then((res: any) => {
        const raw: ApiPlan[] = res?.data?.plans ?? [];
        setPlans(raw);
        const firstPlan = raw[0];
        if (firstPlan) {
          setValue((prev) => ({
            ...prev,
            planId: prev.planId || String(firstPlan.id),
          }));
        }
      })
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset form when dialog re-opens
  React.useEffect(() => {
    if (!open) return;
    setStep(initialStep);
    setValue({
      ...DEFAULT_VALUE,
      ...defaultValue,
      states: defaultValue?.states ?? [],
    });
    setSelectedGroupName("Select election group");
    setSelectedElectionName("Select election");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedPlan =
    plans.find((p) => String(p.id) === value.planId) ?? plans[0];
  const selectedPlanPriceKobo = selectedPlan
    ? selectedPlan.price_kobo !== undefined
      ? Number(selectedPlan.price_kobo)
      : typeof selectedPlan.price === "string"
        ? Math.round(parseFloat(selectedPlan.price) * 100)
        : Math.round(Number(selectedPlan.price ?? 0) * 100)
    : 0;
  const selectedPlanPrice = selectedPlanPriceKobo / 100;

  const durationInDays =
    value.durationUnit === "months"
      ? value.durationValue * 30
      : value.durationValue;
  const statesCount =
    value.targetMode === "all"
      ? Math.max(1, availableStates.length)
      : Math.max(1, value.states.length);
  const currentTotal =
    selectedPlanPrice * Math.max(1, durationInDays) * statesCount;
  const currentTotalKobo =
    selectedPlanPriceKobo * Math.max(1, durationInDays) * statesCount;

  const canContinueStep1 =
    value.electionGroupId.length > 0 &&
    value.electionId.length > 0 &&
    value.planId.length > 0;
  const canContinueStep2 =
    value.targetMode === "all" || value.states.length > 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[820px] lg:max-w-[1140px] max-h-[95svh] flex flex-col overflow-hidden">
        <DialogHeader title="Agent Marketing Setup" />

        <DialogPadding className="relative px-8 pb-0 flex-1 min-h-0 overflow-y-auto">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-3">
                  <Label title="Election Group" />
                  <SelectElectionGroup
                    partyId={partyId}
                    selectedId={
                      value.electionGroupId
                        ? Number(value.electionGroupId)
                        : undefined
                    }
                    update={(group) => {
                      setSelectedGroupName(group.name);
                      setValue((prev) => ({
                        ...prev,
                        electionGroupId: String(group.id),
                        electionId: "",
                      }));
                      setSelectedElectionName("Select election");
                    }}
                    fetchElectionGroups={fetchElectionGroups}
                  />
                </label>

                <label className="space-y-3">
                  <Label title="Election" />
                  <SelectElection
                    partyId={partyId}
                    electionGroupId={
                      value.electionGroupId
                        ? Number(value.electionGroupId)
                        : undefined
                    }
                    selectedId={
                      value.electionId ? Number(value.electionId) : undefined
                    }
                    update={(election) => {
                      setSelectedElectionName(election.name);
                      setElectionScope(election.scope);
                      setValue((prev) => ({
                        ...prev,
                        electionId: String(election.id),
                      }));
                    }}
                    fetchElection={fetchElection}
                    disabled={!value.electionGroupId}
                  />
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-[34px] font-semibold tracking-[-0.04em] text-c-90 w-full">
                    Choose a Plan
                  </h3>
                  <div className="flex items-center gap-3">
                    <IconButton
                      icon={<ChevronLeft className="size-7" />}
                      onClick={() =>
                        planScrollRef.current?.scrollBy({
                          left: -368,
                          behavior: "smooth",
                        })
                      }
                    />
                    <IconButton
                      icon={<ChevronRight className="size-7" />}
                      onClick={() =>
                        planScrollRef.current?.scrollBy({
                          left: 368,
                          behavior: "smooth",
                        })
                      }
                    />
                  </div>
                </div>
                <p className="text-[17px] leading-6 text-c-60">
                  Choose a plan that allows you acquire more election agents
                  ahead of the upcoming election.
                </p>
              </div>

              <PlanList
                plans={plans}
                selectedId={value.planId}
                onSelect={(id) => setValue((prev) => ({ ...prev, planId: id }))}
                isLoading={plansLoading}
                electionScope={electionScope}
                scrollRef={planScrollRef}
              />
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-[34px] font-semibold tracking-[-0.04em] text-c-90">
                    Target State
                  </h3>
                  <p className="mt-2 max-w-[520px] text-[18px] leading-7 text-c-60">
                    Select states you want this marketing campaign to run for.
                  </p>
                </div>
                <SegmentedToggle
                  value={value.targetMode}
                  onChange={(next) =>
                    setValue((prev) => ({
                      ...prev,
                      targetMode: next as "custom" | "all",
                    }))
                  }
                  options={[
                    { value: "custom", label: "Custom" },
                    { value: "all", label: "All" },
                  ]}
                />
              </div>

              <div className="flex flex-wrap gap-2.5">
                {availableStates.map((stateObj) => {
                  const isSelected = value.states.some(
                    (s) => s.id === stateObj.id || s.name === stateObj.name,
                  );
                  const active = value.targetMode === "all" || isSelected;
                  return (
                    <Chip
                      key={stateObj.id || stateObj.name}
                      active={active}
                      onClick={() =>
                        setValue((prev) => {
                          if (prev.targetMode === "all") return prev;
                          const exists = prev.states.some(
                            (s) =>
                              s.id === stateObj.id || s.name === stateObj.name,
                          );
                          return {
                            ...prev,
                            states: exists
                              ? prev.states.filter(
                                  (s) =>
                                    s.id !== stateObj.id &&
                                    s.name !== stateObj.name,
                                )
                              : [...prev.states, stateObj],
                          };
                        })
                      }
                    >
                      {stateObj.name}
                    </Chip>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-7 pb-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-[34px] font-semibold tracking-[-0.04em] text-c-90">
                    Duration
                  </h3>
                  <p className="mt-2 text-[18px] leading-7 text-c-60">
                    Set how long you want this marketing to run.
                  </p>
                </div>
                <SegmentedToggle
                  value={value.durationUnit}
                  onChange={(next) =>
                    setValue((prev) => ({
                      ...prev,
                      durationUnit: next as "days" | "months",
                    }))
                  }
                  options={[
                    { value: "days", label: "Days" },
                    { value: "months", label: "Months" },
                  ]}
                />
              </div>

              <div className="flex min-h-[250px] flex-col items-center justify-center gap-6">
                <div className="flex items-center gap-8">
                  <button
                    type="button"
                    onClick={() =>
                      setValue((prev) => ({
                        ...prev,
                        durationValue: Math.max(1, prev.durationValue - 1),
                      }))
                    }
                    className="grid size-14 place-items-center rounded-full bg-c-5 text-c-60 hover:bg-c-10 text-3xl transition-colors"
                    aria-label="Decrease duration"
                  >
                    −
                  </button>
                  <div className="flex items-end gap-2 text-center min-w-[160px] justify-center">
                    <span className="text-[72px] font-semibold leading-none tracking-[-0.06em] text-c-90">
                      {value.durationValue}
                    </span>
                    <span className="pb-2 text-[28px] text-c-50">
                      {value.durationUnit}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setValue((prev) => ({
                        ...prev,
                        durationValue: prev.durationValue + 1,
                      }))
                    }
                    className="grid size-14 place-items-center rounded-full bg-c-5 text-c-60 hover:bg-c-10 text-3xl transition-colors"
                    aria-label="Increase duration"
                  >
                    +
                  </button>
                </div>
                <p className="text-lg text-c-50">
                  {statesCount} state{statesCount !== 1 ? "s" : ""} ×{" "}
                  {durationInDays} day{durationInDays !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}
        </DialogPadding>

        {/* Footer */}
        <DialogFooter className="mt-2 border-t border-c-10 px-8 py-6">
          <div className="flex w-full flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <p
                className={cn("text-[18px] font-semibold text-[#7B4A35]")}
                style={{ color: selectedPlan?.color_hex ?? "" }}
              >
                {step === 1
                  ? (selectedPlan?.name ?? "—")
                  : `Total (${formatDurationLabel(value.durationValue, value.durationUnit)})`}
              </p>
              <div className="flex flex-wrap items-end gap-1">
                <span className="text-[34px] font-semibold tracking-[-0.04em] text-c-90">
                  {step === 1 && formatMoney(selectedPlanPrice)}
                  {step === 2 && formatMoney(selectedPlanPrice * statesCount)}
                  {step === 3 && formatMoney(currentTotal)}
                </span>
                <span className="pb-1 text-[18px] text-c-50">
                  {step === 1 && "/ day / state"}
                  {step === 2 &&
                    `/ day / ${statesCount} state${statesCount === 1 ? "" : "s"}`}
                  {step === 3 &&
                    `/ ${durationInDays} days / ${statesCount} state${statesCount === 1 ? "" : "s"}`}
                </span>
              </div>
              <p className="text-[16px] text-c-60">
                {selectedPlan?.description}
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 md:w-[300px]">
              {step === 1 ? (
                <Button
                  variant="black"
                  className="h-[60px] rounded-[18px] text-[18px] font-semibold text-white"
                  onClick={() => setStep(2)}
                  disabled={!canContinueStep1}
                >
                  Next
                </Button>
              ) : step === 2 ? (
                <>
                  <Button
                    variant="black"
                    className="h-[60px] rounded-[18px] text-[18px] font-semibold text-white"
                    onClick={() => setStep(3)}
                    disabled={!canContinueStep2}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    className="h-[60px] rounded-[18px] text-[18px] font-semibold"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    className="h-[60px] rounded-[18px] text-[18px] font-semibold"
                    onClick={() => {
                      const computedStates: StateObject[] =
                        value.targetMode === "all"
                          ? availableStates
                          : value.states;
                      const perDay = selectedPlanPrice * statesCount;
                      const perDayKobo = selectedPlanPriceKobo * statesCount;

                      console.log({
                        states: computedStates,
                        value_states: value.states,
                      });

                      submitMutation.mutate({
                        electionGroupId: Number(value.electionGroupId),
                        electionId: Number(value.electionId),
                        planId: Number(value.planId),
                        partyId,
                        type: "agent-campaign",
                        states: computedStates,
                        durationInDays,
                        budgetPerDayKobo: perDayKobo,
                        budgetKobo: currentTotalKobo,
                        budgetPerDay: perDay,
                        budget: currentTotal,
                        rawFormValue: value,
                      });
                    }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save & Deposit Total"}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-[60px] rounded-[18px] text-[18px] font-semibold"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
