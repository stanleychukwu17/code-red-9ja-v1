import * as React from "react";
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

export type MarketingPlan = {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  priceLabel?: string;
  features: string[];
  colorHex?: string;
  accentClassName?: string;
  recommended?: boolean;
};

export type ElectionOption = {
  id: string;
  label: string;
};

export type AgentMarketingSetupValue = {
  electionGroupId: string;
  electionId: string;
  planId: string;
  targetMode: "custom" | "all";
  states: string[];
  durationUnit: "days" | "months";
  durationValue: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: AgentMarketingSetupValue) => void;
  isPending?: boolean;
  partyId?: number;
  fetchElectionGroups: (args: any) => Promise<any>;
  fetchElection: (args: any) => Promise<any>;
  fetchPlans: (args: any) => Promise<any>;
  states: string[];
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

function mapApiPlan(p: any): MarketingPlan {
  return {
    id: String(p.id),
    name: p.name,
    subtitle: p.description ?? "",
    price: typeof p.price === "string" ? parseFloat(p.price) : Number(p.price),
    priceLabel: "/ day / state",
    features: Array.isArray(p.features) ? p.features : [],
    colorHex: p.color_hex ?? undefined,
    recommended: p.recommended ?? false,
  };
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
                : "text-c-80 hover:bg-white",
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

function PlanList({
  plans,
  selectedId,
  onSelect,
  isLoading,
}: {
  plans: MarketingPlan[];
  selectedId: string;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

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
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 z-10 -translate-x-4 -translate-y-1/2 grid size-10 place-items-center rounded-full bg-white shadow-md text-c-50 hover:text-c-90 transition-colors"
        aria-label="Scroll left"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 z-10 translate-x-4 -translate-y-1/2 grid size-10 place-items-center rounded-full bg-white shadow-md text-c-50 hover:text-c-90 transition-colors"
        aria-label="Scroll right"
      >
        <ChevronRight className="size-5" />
      </button>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {plans.map((plan) => {
          const active = selectedId === plan.id;
          const accent = plan.colorHex ?? "#744B3E";
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onSelect(plan.id)}
              className={cn(
                "relative flex-shrink-0 w-[240px] min-h-[270px] rounded-[24px] px-5 py-5 text-left transition-all",
                active
                  ? "bg-[#E9E7FF] shadow-[0_12px_34px_rgba(106,104,255,0.12)]"
                  : "bg-[#FAFAFA] hover:bg-[#f5f5f5]",
              )}
            >
              {plan.recommended && (
                <span className="absolute right-4 top-4 rounded-full bg-[#FFE9D4] px-3 py-1 text-[12px] font-semibold text-[#FF8A00]">
                  Recommended
                </span>
              )}
              <p
                className="text-[17px] font-semibold"
                style={{ color: active ? "#4153FF" : accent }}
              >
                {plan.name}
              </p>
              <p className="mt-1.5 text-[13px] leading-5 text-c-60">
                {plan.subtitle}
              </p>
              <div className="mt-3 flex items-end gap-1.5">
                <span className="text-[22px] font-semibold tracking-[-0.04em] text-c-90">
                  {formatMoney(plan.price)}
                </span>
              </div>
              <p className="text-[12px] text-c-50 mb-3">
                {plan.priceLabel ?? "/ day / state"}
              </p>
              <div className="space-y-2">
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-start gap-2 text-[12px] leading-5 text-c-80"
                  >
                    <span className="text-[13px] leading-none text-current shrink-0">
                      ✓
                    </span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
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
  states,
  defaultValue,
  initialStep = 1,
}: Props) {
  const [plans, setPlans] = React.useState<MarketingPlan[]>([]);
  const [plansLoading, setPlansLoading] = React.useState(false);

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

  // Fetch plans once when dialog opens
  React.useEffect(() => {
    if (!open) return;
    setPlansLoading(true);
    fetchPlans({ data: { type: "agent-campaign" } })
      .then((res: any) => {
        const raw: any[] = res?.data?.plans ?? [];
        const mapped = raw.map(mapApiPlan);
        setPlans(mapped);
        if (mapped.length > 0) {
          setValue((prev) => ({
            ...prev,
            planId: prev.planId || mapped[0].id,
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

  const selectedPlan = plans.find((p) => p.id === value.planId) ?? plans[0];

  const durationInDays =
    value.durationUnit === "months"
      ? value.durationValue * 30
      : value.durationValue;
  const statesCount =
    value.targetMode === "all"
      ? Math.max(1, states.length)
      : Math.max(1, value.states.length);
  const currentTotal =
    (selectedPlan?.price ?? 0) * Math.max(1, durationInDays) * statesCount;

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

              <div>
                <h3 className="text-[34px] font-semibold tracking-[-0.04em] text-c-90">
                  Choose a Plan
                </h3>
                <p className="mt-2 max-w-[520px] text-[18px] leading-7 text-c-60">
                  Choose a plan that allows you acquire more election agents
                  ahead of the upcoming election.
                </p>
              </div>

              <PlanList
                plans={plans}
                selectedId={value.planId}
                onSelect={(id) => setValue((prev) => ({ ...prev, planId: id }))}
                isLoading={plansLoading}
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
                {states.map((state) => {
                  const active =
                    value.targetMode === "all" || value.states.includes(state);
                  return (
                    <Chip
                      key={state}
                      active={active}
                      onClick={() =>
                        setValue((prev) => {
                          if (prev.targetMode === "all") return prev;
                          const exists = prev.states.includes(state);
                          return {
                            ...prev,
                            states: exists
                              ? prev.states.filter((s) => s !== state)
                              : [...prev.states, state],
                          };
                        })
                      }
                    >
                      {state}
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
                  <div className="flex items-end gap-1 text-center min-w-[160px] justify-center">
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
                <p className="text-[15px] text-c-50">
                  {statesCount} state{statesCount !== 1 ? "s" : ""} ×{" "}
                  {durationInDays} day{durationInDays !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}
        </DialogPadding>

        {/* Footer */}
        <DialogFooter className="mt-2 border-t border-c-10 px-8 py-6">
          <div className="flex w-full flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-[18px] font-semibold text-[#7B4A35]">
                {step === 1
                  ? (selectedPlan?.name ?? "—")
                  : `Total (${formatDurationLabel(value.durationValue, value.durationUnit)})`}
              </p>
              <div className="flex flex-wrap items-end gap-1">
                <span className="text-[34px] font-semibold tracking-[-0.04em] text-c-90">
                  {step === 3
                    ? formatMoney(currentTotal)
                    : formatMoney(selectedPlan?.price ?? 0)}
                </span>
                <span className="pb-1 text-[18px] text-c-50">
                  {step !== 3
                    ? (selectedPlan?.priceLabel ?? "/ day / state")
                    : ""}
                </span>
              </div>
              <p className="text-[16px] text-c-60">
                {selectedPlan?.subtitle ?? ""}
              </p>
              {step === 1 && (
                <p className="text-[14px] text-c-50">
                  {selectedGroupName} — {selectedElectionName}
                </p>
              )}
            </div>

            <div className="flex w-full flex-col gap-3 md:w-[300px]">
              {step === 1 ? (
                <Button
                  className="h-[60px] rounded-[18px] bg-c-90 text-[18px] font-semibold text-white hover:bg-black"
                  onClick={() => setStep(2)}
                  disabled={!canContinueStep1}
                >
                  Next
                </Button>
              ) : step === 2 ? (
                <>
                  <Button
                    className="h-[60px] rounded-[18px] bg-c-90 text-[18px] font-semibold text-white hover:bg-black"
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
                    className="h-[60px] rounded-[18px] bg-[#16E07E] text-[18px] font-semibold text-c-90 hover:bg-[#10cf72]"
                    onClick={() => onSubmit(value)}
                    disabled={!!isPending}
                  >
                    {isPending ? "Saving..." : "Save & Deposit Total"}
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
