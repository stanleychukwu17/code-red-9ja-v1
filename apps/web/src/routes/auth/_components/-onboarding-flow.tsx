import { useNavigate } from "@tanstack/react-router";
import {
  OnboardingHeader,
  OnboardingWrapper,
} from "#/routes/auth/_components/-onboarding";
import { Button } from "@repo/ui/components/button";
import { CountryCombobox } from "@repo/ui/components/combobox/country-combobox";
import { GenderCombobox } from "@repo/ui/components/combobox/gender-combobox";
import { StateCombobox } from "@repo/ui/components/combobox/state-combobox";
import { CityCombobox } from "@repo/ui/components/combobox/city-combobox";
import { FormInput } from "@repo/ui/components/input";
import { CalendarPopover } from "@repo/ui/components/popover/calendar-popover";
import MapPinIcon from "@repo/ui/icons/onboarding/map-pin-icon";
import NINIcon from "@repo/ui/icons/onboarding/nin-icon ";
import UserIcon from "@repo/ui/icons/onboarding/user-icon";
import { useCallback, useState, useEffect, type ReactNode } from "react";
import { APP_URL } from "#/lib/config";
import { checkNin } from "#/lib/server/auth";
import { getCities, getStates } from "#/lib/server/countries";
import { FormError } from "./-form-error";
import { useAppSelector } from "#/redux/hooks";

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
  city: string;
  role: UserRole;
};

type OnboardingFlowProps = {
  step: OnboardingStep;
  onFinish: () => void;
};

export function OnboardingFlow({ step, onFinish }: OnboardingFlowProps) {
  const { country: userCountry, iso2, countryId } = useAppSelector((state) => state.auth.onboardingData) ?? {};

  console.log(userCountry, iso2, countryId, "from onboarding flow")

  const [data, setData] = useState<OnboardingState>({
    firstName: "",
    surname: "",
    otherNames: "",
    gender: "",
    dateOfBirth: undefined,
    nin: "",
    country: userCountry || "",
    state: "",
    city: "",
    role: "citizen",
  });
  console.log(data)
  const navigate = useNavigate();
  const [isCheckingNIN, setIsCheckingNIN] = useState(false);
  const [ninError, setNinError] = useState<string | null>(null);

  const [states, setStates] = useState<{ id: number; value: string; label: string }[]>([]);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [statesError, setStatesError] = useState<string | null>(null);

  const [cities, setCities] = useState<{ id: number; value: string; label: string }[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [citiesError, setCitiesError] = useState<string | null>(null);

  const selectedStateObj = states.find((s) => s.value === data.state);
  const stateId = selectedStateObj?.id;

  // Fetch cities from backend when stateId changes
  useEffect(() => {
    if (!stateId) {
      setCities([]);
      return;
    }

    const fetchCities = async () => {
      setIsLoadingCities(true);
      setCitiesError(null);
      try {
        const res = await getCities({ data: { stateId } });
        if (res.status === "success" && Array.isArray(res.cities)) {
          const mappedCities = res.cities.map((c: { id: number; name: string }) => ({
            id: c.id,
            value: c.name,
            label: c.name,
          }));
          setCities(mappedCities);
        } else {
          setCitiesError(res.error || res.message || "Failed to fetch cities");
        }
      } catch (err) {
        console.error("Failed to load cities:", err);
        setCitiesError("An unexpected error occurred while loading cities.");
      } finally {
        setIsLoadingCities(false);
      }
    };

    fetchCities();
  }, [stateId]);

  // Fetch states from backend when countryId changes
  useEffect(() => {
    if (!countryId) return;

    const fetchStates = async () => {
      setIsLoadingStates(true);
      setStatesError(null);
      try {
        const res = await getStates({ data: { countryId } });
        if (res.status === "success" && Array.isArray(res.states)) {
          const mappedStates = res.states.map((s: { id: number; name: string }) => ({
            id: s.id,
            value: s.name,
            label: s.name,
          }));
          setStates(mappedStates);
        } else {
          setStatesError(res.error || res.message || "Failed to fetch states");
        }
      } catch (err) {
        console.error("Failed to load states:", err);
        setStatesError("An unexpected error occurred while loading states.");
      } finally {
        setIsLoadingStates(false);
      }
    };

    fetchStates();
  }, [countryId]);

  // Sync country from Redux if not already set locally
  useEffect(() => {
    if (userCountry && !data.country) {
      setData((current) => ({ ...current, country: userCountry }));
    }
  }, [userCountry, data.country]);

  // get current step index, using the step name from the url
  const currentStepIndex = Math.max(0, ONBOARDING_STEPS.indexOf(step));

  // handle nin submission
  const handleNINSubmit = async () => {
    if (data.nin.length !== 11) return;

    setIsCheckingNIN(true);
    setNinError(null);

    try {
      const res = await checkNin({ data: { nin: data.nin } });
      if (res.status === "success") {
        if (res.exists) {
          setNinError("This NIN is already registered to another account");
        } else {
          // NIN does not exist, proceed to next step
          goNext();
        }
      } else {
        setNinError(res.message || "Failed to verify NIN. Please try again.");
      }
    } catch (err) {
      console.error("NIN check failed:", err);
      setNinError("An unexpected error occurred while checking NIN.");
    } finally {
      setIsCheckingNIN(false);
    }
  };

  // handle step change
  const onStepChange = useCallback((nextStep: OnboardingStep) => {
    navigate({
      to: APP_URL.auth.onboarding,
      search: { step: nextStep },
      replace: true,
    })
  }, [navigate])

  const canContinue =
    step === "details"
      ? Boolean(data.firstName && data.surname && data.gender && data.dateOfBirth)
      : step === "nin" ? data.nin.length === 11
        : step === "location" ? Boolean(data.country && data.state && data.city)
          : Boolean(data.role);

  const goNext = () => {
    console.log(data)
    const nextStep = ONBOARDING_STEPS[currentStepIndex + 1];

    if (!nextStep) {
      onFinish();
      return;
    }

    onStepChange(nextStep);
  };

  const goBack = () => {
    console.log(data)
    setIsCheckingNIN(false);
    const previousStep = ONBOARDING_STEPS[currentStepIndex - 1];

    if (previousStep) {
      onStepChange(previousStep);
      return;
    }

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
          actionDisabled={!canContinue || isCheckingNIN}
          actionLoading={isCheckingNIN}
          onAction={handleNINSubmit}
        >
          <FormError message={ninError} />
          <FormInput
            placeholder="NIN"
            value={data.nin}
            inputMode="numeric"
            onChange={(event) => {
              setNinError(null);
              setData((current) => ({
                ...current,
                nin: event.target.value.replace(/[^0-9]/g, "").slice(0, 11),
              }));
            }}
          />
        </FlowScreen>
      ) : null}

      {step === "location" ? (
        <FlowScreen
          icon={<MapPinIcon className="size-6 text-primary" strokeWidth={1.8} />}
          title="Add your location"
          subtitle="Enter where you are currently located right now."
          onBack={goBack}
          actionLabel="Continue"
          actionDisabled={!canContinue || isLoadingStates || isLoadingCities}
          onAction={goNext}
        >
          <FormError message={statesError || citiesError} />
          <CountryCombobox
            value={data.country}
            iso2={iso2}
            disabled={true}
            onChange={(value) =>
              setData((current) => ({
                ...current,
                country: value,
                state: "",
                city: "",
              }))
            }
          />
          <StateCombobox
            country={data.country}
            value={data.state}
            options={states}
            disabled={isLoadingStates}
            placeholder={isLoadingStates ? "Loading states..." : "State of residence"}
            onChange={(value) =>
              setData((current) => ({
                ...current,
                state: value,
                city: "",
              }))
            }
          />
          <CityCombobox
            state={data.state}
            value={data.city}
            options={cities}
            disabled={isLoadingCities || !data.state}
            placeholder={isLoadingCities ? "Loading cities..." : "City of residence"}
            onChange={(value) =>
              setData((current) => ({ ...current, city: value }))
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
  actionLoading?: boolean;
  onAction: () => void;
  children: ReactNode;
};

function FlowScreen({ icon, title, subtitle, onBack, actionLabel, actionDisabled, actionLoading, onAction, children }: FlowScreenProps) {
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
          loading={actionLoading}
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
