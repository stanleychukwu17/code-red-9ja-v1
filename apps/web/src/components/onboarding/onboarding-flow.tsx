import {
  OnboardingHeader,
  OnboardingWrapper,
} from "#/routes/auth/_components/onboarding";
import { Button } from "@repo/ui/components/button";
import { CountryCombobox } from "@repo/ui/components/combobox/country-combobox";
import { GenderCombobox } from "@repo/ui/components/combobox/gender-combobox";
import { StateCombobox } from "@repo/ui/components/combobox/state-combobox";
import { FormInput } from "@repo/ui/components/input";
import { CalendarPopover } from "@repo/ui/components/popover/calendar-popover";
import MapPinIcon from "@repo/ui/icons/onboarding/map-pin-icon";
import NINIcon from "@repo/ui/icons/onboarding/nin-icon ";
import UserIcon from "@repo/ui/icons/onboarding/user-icon";
import { useState, type ReactNode } from "react";

const ROLE_OPTIONS = [
  {
    id: "citizen",
    title: "A Nigerian Citizen",
    description: "Track results, your polling unit, and election updates.",
    avatar: "NC",
  },
  {
    id: "agent",
    title: "Polling Unit Agent",
    description: "Upload results and report incidents from your polling unit.",
    avatar: "PU",
  },
] as const;

const ONBOARDING_STEPS = ["details", "nin", "location", "role"] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
type UserRole = (typeof ROLE_OPTIONS)[number]["id"];

type OnboardingState = {
  firstName: string;
  surname: string;
  otherNames: string;
  gender: string;
  dateOfBirth?: Date;
  nin: string;
  country: string;
  state: string;
  role: UserRole;
};

type OnboardingFlowProps = {
  step: OnboardingStep;
  onStepChange: (step: OnboardingStep) => void;
  onExit: () => void;
  onFinish: () => void;
};

export function OnboardingFlow({
  step,
  onStepChange,
  onExit,
  onFinish,
}: OnboardingFlowProps) {
  const [data, setData] = useState<OnboardingState>({
    firstName: "",
    surname: "",
    otherNames: "",
    gender: "",
    dateOfBirth: undefined,
    nin: "",
    country: "Nigeria",
    state: "",
    role: "citizen",
  });
  const currentStepIndex = Math.max(0, ONBOARDING_STEPS.indexOf(step));

  const canContinue =
    step === "details"
      ? Boolean(
          data.firstName && data.surname && data.gender && data.dateOfBirth,
        )
      : step === "nin"
        ? data.nin.length === 11
        : step === "location"
          ? Boolean(data.country && data.state)
          : Boolean(data.role);

  const goNext = () => {
    const nextStep = ONBOARDING_STEPS[currentStepIndex + 1];

    if (!nextStep) {
      onFinish();
      return;
    }

    onStepChange(nextStep);
  };

  const goBack = () => {
    const previousStep = ONBOARDING_STEPS[currentStepIndex - 1];

    if (previousStep) {
      onStepChange(previousStep);
      return;
    }

    onExit();
  };

  return (
    <OnboardingWrapper>
      {step === "details" ? (
        <FlowScreen
          icon={<UserIcon className="size-6 text-primary" strokeWidth={1.8} />}
          title="Add your details"
          subtitle="Enter your full government name & gender."
          onBack={goBack}
          actionLabel="Continue"
          actionDisabled={!canContinue}
          onAction={goNext}
        >
          <FormInput
            placeholder="First name"
            value={data.firstName}
            onChange={(event) =>
              setData((current) => ({
                ...current,
                firstName: event.target.value,
              }))
            }
          />
          <FormInput
            placeholder="Surname"
            value={data.surname}
            onChange={(event) =>
              setData((current) => ({
                ...current,
                surname: event.target.value,
              }))
            }
          />
          <FormInput
            placeholder="Other names"
            value={data.otherNames}
            onChange={(event) =>
              setData((current) => ({
                ...current,
                otherNames: event.target.value,
              }))
            }
          />
          <GenderCombobox
            value={data.gender}
            onChange={(value) =>
              setData((current) => ({ ...current, gender: value }))
            }
          />
          <CalendarPopover
            placeholder="Select date of birth"
            title="Select date of birth"
            description="Choose your date of birth."
            value={data.dateOfBirth}
            onChange={(value) =>
              setData((current) => ({ ...current, dateOfBirth: value }))
            }
          />
        </FlowScreen>
      ) : null}

      {step === "nin" ? (
        <FlowScreen
          icon={<NINIcon />}
          title="Add your NIN"
          subtitle="Enter your National Identification Number."
          onBack={goBack}
          actionLabel="Continue"
          actionDisabled={!canContinue}
          onAction={goNext}
        >
          <FormInput
            placeholder="NIN"
            value={data.nin}
            inputMode="numeric"
            onChange={(event) =>
              setData((current) => ({
                ...current,
                nin: event.target.value.replace(/[^0-9]/g, "").slice(0, 11),
              }))
            }
          />
        </FlowScreen>
      ) : null}

      {step === "location" ? (
        <FlowScreen
          icon={
            <MapPinIcon className="size-6 text-primary" strokeWidth={1.8} />
          }
          title="Add your location"
          subtitle="Enter where you are currently located right now."
          onBack={goBack}
          actionLabel="Continue"
          actionDisabled={!canContinue}
          onAction={goNext}
        >
          <CountryCombobox
            value={data.country}
            onChange={(value) =>
              setData((current) => ({
                ...current,
                country: value,
                state: current.country === value ? current.state : "",
              }))
            }
          />
          <StateCombobox
            country={data.country}
            value={data.state}
            onChange={(value) =>
              setData((current) => ({ ...current, state: value }))
            }
          />
        </FlowScreen>
      ) : null}

      {step === "role" ? (
        <FlowScreen
          icon={<UserIcon />}
          title="Which best describes you?"
          subtitle="Tell us how you plan to use this app. This will determine your experience going forward."
          onBack={goBack}
          actionLabel="Continue"
          actionDisabled={!canContinue}
          onAction={onFinish}
        >
          <div className="space-y-4">
            {ROLE_OPTIONS.map((role) => {
              const isSelected = data.role === role.id;

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() =>
                    setData((current) => ({ ...current, role: role.id }))
                  }
                  className={[
                    "flex w-full items-center gap-3 rounded-[20px] px-5 py-4 text-left transition-all md:min-h-[98px]",
                    isSelected
                      ? "bg-emerald-100 ring-1 ring-emerald-200"
                      : "bg-black/4 hover:bg-black/6",
                  ].join(" ")}
                >
                  <div className="flex-1">
                    <p className="text-xl font-medium text-c-90">
                      {role.title}
                    </p>
                    <p className="mt-1 text-sm text-c-60">{role.description}</p>
                  </div>
                  <div className="flex size-14 items-center justify-center rounded-full bg-white/70 text-lg font-semibold text-primary">
                    {role.avatar}
                  </div>
                </button>
              );
            })}
          </div>
        </FlowScreen>
      ) : null}
    </OnboardingWrapper>
  );
}

type FlowScreenProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onBack: () => void;
  actionLabel: string;
  actionDisabled?: boolean;
  onAction: () => void;
  children: ReactNode;
};

function FlowScreen({
  icon,
  title,
  subtitle,
  onBack,
  actionLabel,
  actionDisabled,
  onAction,
  children,
}: FlowScreenProps) {
  return (
    <>
      <OnboardingHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        onBack={onBack}
      />

      <div className="space-y-4">{children}</div>

      <div className="pt-10 md:pt-12 space-y-3">
        <Button
          type="button"
          variant="secondary"
          disabled={actionDisabled}
          onClick={onAction}
          className="h-14 w-full rounded-[18px] font-bold"
        >
          {actionLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="h-14 w-full rounded-[18px] font-bold"
        >
          Go back
        </Button>
      </div>
    </>
  );
}
