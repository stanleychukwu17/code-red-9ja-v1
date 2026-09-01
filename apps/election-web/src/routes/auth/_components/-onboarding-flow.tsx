// Core UI components and utilities
import { StickyFooter } from "#/components/Footers";
import { APP_URL } from "#/lib/config";
// Server-side authentication helpers
import {
  checkNin,
  checkUsername,
  checkReferralCode,
  completeOnboarding,
} from "#/lib/server/auth/auth";
import { getAllCountries, getCities, getStates } from "#/lib/server/countries";
import { OnboardingHeader, OnboardingHeaderContent, OnboardingWrapper, } from "#/routes/auth/_components/-auth-wrapper";
import { Button } from "@repo/ui/components/button";
import { FormInput, Label } from "@repo/ui/components/input";
import { SelectCity } from "@repo/ui/components/selects/city-select";
import { SelectCountry } from "@repo/ui/components/selects/country-select";
import { SelectDate } from "@repo/ui/components/selects/date-select";
import { SelectGender } from "@repo/ui/components/selects/gender-select";
import { SelectState } from "@repo/ui/components/selects/state-select";
import MapPinIcon from "@repo/ui/icons/onboarding/map-pin-icon";
// import NINIcon from "@repo/ui/icons/onboarding/nin-icon ";
import UserIcon from "@repo/ui/icons/onboarding/user-icon";
import { useNavigate } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, } from "react";
import { useDebounceValue } from "usehooks-ts";
import { useAppSelector } from "#/redux/hooks";
import { useQuery } from "@tanstack/react-query";
import type { VisitorDetails } from "#/redux/slice/siteSlice";

// Ordered list of onboarding steps (commented steps are currently disabled)
export const ONBOARDING_STEPS = [
  "details",
  "username",
  "origin",
  "location",
  "referral",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

// Shape of the onboarding form state, covering all possible steps
type OnboardingState = {
  // username step
  username: string;
  // details step
  firstName: string;
  surname: string;
  otherNames: string;
  gender: string;
  dateOfBirth?: Date;
  referralCode: string;
  // nin step
  nin: string;
  // origin step — store names for display, IDs for submission
  countryOfOrigin: string;
  countryOfOriginId: number | undefined;
  stateOfOrigin: string;
  stateOfOriginId: number | undefined;
  // location step — store names for display, IDs for submission
  country: string;
  countryId: number | undefined;
  state: string;
  stateId: number | undefined;
  city: string;
  cityId: number | undefined;
};

type OnboardingFlowProps = {
  step: OnboardingStep;
};

// Main component that orchestrates the multi‑step onboarding flow
export function OnboardingFlow({ step }: OnboardingFlowProps) {
  const navigate = useNavigate();
  const { visitorDetails } = useAppSelector((state) => state.site);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [data, setData] = useState<OnboardingState>({
    username: "",
    firstName: "",
    surname: "",
    otherNames: "",
    gender: "",
    dateOfBirth: undefined,
    referralCode: "",
    nin: "",
    countryOfOrigin: "Nigeria",
    countryOfOriginId: 161,
    stateOfOrigin: "",
    stateOfOriginId: undefined,
    country: "",
    countryId: undefined,
    state: "",
    stateId: undefined,
    city: "",
    cityId: undefined,
  });

  const currentStepIndex = Math.max(0, ONBOARDING_STEPS.indexOf(step));

  // Generate username suggestions based on the user's first and last name
  const randomSuffixRef = useRef(Math.floor(100 + Math.random() * 900));
  const FULL_YEAR = useRef(new Date().getFullYear()).current;
  const usernameSuggestions = useMemo(() => {
    const first = data.firstName.trim();
    const last = data.surname.trim();
    if (!first || !last) return [];
    const f = first.toLowerCase().replace(/[^a-z0-9]/g, "");
    const l = last.toLowerCase().replace(/[^a-z0-9]/g, "");

    return Array.from(
      new Set([
        `${f}${randomSuffixRef.current}`,
        `${l}${randomSuffixRef.current}`,
        `${f}_${l}`,
        `${f}${l}`,
        `${f}_${l}${randomSuffixRef.current}`,
        `${f}_${l}_${FULL_YEAR}`,
        `${f}${l}${randomSuffixRef.current}`,
        `${f}${l}${FULL_YEAR}`,
      ]),
    );
  }, [data.firstName, data.surname, FULL_YEAR]);

  //--START-- Username states & query
  const [debouncedUsername] = useDebounceValue(data.username, 500);
  const isTypingUsername = data.username !== debouncedUsername;

  const { data: usernameData, isFetching: isCheckingUsernameQuery } = useQuery({
    queryKey: ['checkUsername', debouncedUsername],
    queryFn: async () => {
      const res = await checkUsername({ data: { username: debouncedUsername } });
      if (!res.success) return { available: false, error: res.message || "Failed to verify username." };
      if (res.data?.exists) return { available: false, error: "This username is already taken" };
      return { available: true, error: null };
    },
    enabled: Boolean(debouncedUsername && /^[a-zA-Z][a-zA-Z0-9_]{1,28}[a-zA-Z0-9]$/.test(debouncedUsername)),
    staleTime: Infinity,
    retry: false,
  });

  const isCheckingUsername = isCheckingUsernameQuery || isTypingUsername;
  const isUsernameAvailable = isTypingUsername ? null : (usernameData ? usernameData.available : null);
  const usernameError = isTypingUsername
    ? null
    : debouncedUsername && !/^[a-zA-Z][a-zA-Z0-9_]{1,28}[a-zA-Z0-9]$/.test(debouncedUsername)
      ? "Username must start with a letter, be 3–30 chars, and not end with an underscore"
      : usernameData?.error || null;
  //--END-- Username states & query


  //--START-- NIN states & query
  const [debouncedNin] = useDebounceValue(data.nin, 600);
  const isTypingNin = data.nin !== debouncedNin;
  const { data: ninData, isFetching: isCheckingNINQuery } = useQuery({
    queryKey: ['checkNin', debouncedNin],
    queryFn: async () => {
      const res = await checkNin({ data: { nin: debouncedNin } });
      if (!res.success) return { available: false, error: res.message || "Failed to verify NIN." };
      if (res.data?.exists) return { available: false, error: "This NIN is already registered to another account" };
      return { available: true, error: null };
    },
    enabled: Boolean(debouncedNin && debouncedNin.length === 11),
    staleTime: Infinity,
    retry: false,
  });

  const isCheckingNIN = isCheckingNINQuery || isTypingNin;
  const isNinAvailable = isTypingNin ? null : (ninData ? ninData.available : null);
  const ninError = isTypingNin
    ? null
    : debouncedNin && debouncedNin.length !== 11
      ? "NIN must be 11 digits"
      : ninData?.error || null;
  //--END-- NIN states & query



  //--START-- Referral states & query
  const [debouncedReferralCode] = useDebounceValue(data.referralCode, 500);
  const isTypingReferral = data.referralCode !== debouncedReferralCode;
  const { data: referralData, isFetching: isCheckingReferralCodeQuery } = useQuery({
    queryKey: ['checkReferralCode', debouncedReferralCode],
    queryFn: async () => {
      const code = debouncedReferralCode;
      const res = await checkReferralCode({ data: { code } });
      if (!res.success) return { valid: false, error: res.message || "Failed to verify code." };
      if (!res.data?.exists) return { valid: false, error: "Referral code not found" };
      return {
        valid: true,
        error: null,
        name: res.data.name,
        referrerId: res.data.referrerId
      };
    },
    enabled: Boolean(debouncedReferralCode && debouncedReferralCode.length >= 5),
    staleTime: Infinity,
    retry: false,
  });

  const isCheckingReferralCode = isCheckingReferralCodeQuery || isTypingReferral;
  const isReferralCodeValid = isTypingReferral ? null : (referralData?.valid ?? null);
  const referrerName = isTypingReferral ? null : (referralData?.name ?? null);
  const referrerId = isTypingReferral ? null : (referralData?.referrerId ?? null);
  const referralCodeError = isTypingReferral
    ? null
    : referralData?.error || null;
  //--END-- Referral states & query


  // Handle final submission when the user clicks the "Finish" button
  const completeOnboardingFn = useServerFn(completeOnboarding);
  const completeOnboardingMutation = useMutation({
    mutationFn: completeOnboardingFn,
    onSuccess: (result) => {
      if (result.success) {
        // Hard redirect without triggering any React state updates to prevent UI flashes
        window.location.href = APP_URL.home;
      } else {
        setSubmitError(result.message || "Failed to complete onboarding.");
      }
    },
    onError: () => {
      setSubmitError("An unexpected error occurred.");
    },
  });

  // Check if the final submission is in progress
  const isSubmitting = completeOnboardingMutation.isPending;

  // ----- Navigation helpers -----
  // onStepChange updates the URL query to reflect the current onboarding step
  const onStepChange = useCallback((nextStep: OnboardingStep) => {
    navigate({
      to: APP_URL.auth.onboarding,
      search: { step: nextStep } as any,
      replace: true,
    });
  }, [navigate]);

  // Move forward to the next onboarding step if available
  const goNext = useCallback(() => {
    const nextStep = ONBOARDING_STEPS[currentStepIndex + 1];
    if (nextStep) onStepChange(nextStep);
  }, [currentStepIndex, onStepChange]);

  // Navigate back to the previous onboarding step
  const goBack = useCallback(() => {
    const previousStep = ONBOARDING_STEPS[currentStepIndex - 1];
    if (previousStep) onStepChange(previousStep);
  }, [currentStepIndex, onStepChange]);

  // ----- Final submission -----
  // Handles the final API call when the user completes the onboarding flow
  const onFinish = useCallback(() => {
    if (!data.countryId || !data.stateId || !data.countryOfOriginId || !data.stateOfOriginId || !data.gender || !data.dateOfBirth || !data.username || !data.nin || !data.firstName || !data.surname) {
      setSubmitError("Please fill in all the required fields.");
      return;
    }

    // clear errors
    setSubmitError(null);

    // date of birth
    const dob = data.dateOfBirth ? data.dateOfBirth.toISOString().split("T")[0] : "";

    // submit the data to the backend
    completeOnboardingMutation.mutate({
      data: {
        first_name: data.firstName.trim(),
        last_name: data.surname.trim(),
        middle_name: data.otherNames.trim() || "",
        gender: data.gender.toLowerCase(),
        date_of_birth: dob,
        referrer_user_id: referrerId,
        referral_code: data.referralCode || "",
        username: data.username.trim(),
        nin: data.nin,
        country_of_origin: data.countryOfOriginId ?? 0,
        state_of_origin: data.stateOfOriginId ?? 0,
        current_country: data.countryId ?? 0,
        current_state: data.stateId,
        current_city: data.cityId ?? 0,
      },
    });
  }, [data, completeOnboardingMutation]);

  // Username submit handler
  const handleUsernameSubmit = async () => {
    if (isUsernameAvailable) {
      goNext();
    }
  };

  // No-op error setters to satisfy child component props.
  // The derived states (ninError, usernameError, referralCodeError) already 
  // handle clearing errors automatically when the user types!
  const setNinError = () => { };
  const setUsernameError = () => { };
  const setReferralCodeError = () => { };

  // ── canContinue per step ──
  const canContinue =
    step === "username"
      ? isUsernameAvailable === true
      : step === "details"
        ? Boolean(
          data.firstName && data.surname && data.gender && data.dateOfBirth && isNinAvailable === true,
        )
        : step === "origin"
          ? Boolean(data.countryOfOriginId && data.stateOfOriginId)
          : step === "location"
            ? Boolean(data.countryId && data.stateId)
            : step === "referral"
              ? data.referralCode.trim()
                ? isReferralCodeValid === true
                : true
              : false;

  // Render current step
  return (
    <>
      {step === "details" && (
        <DetailsStep
          data={data}
          setData={setData}
          canContinue={canContinue}
          onBack={goBack}
          onAction={goNext}
          isCheckingNIN={isCheckingNIN}
          isNinAvailable={isNinAvailable}
          ninError={ninError}
          setNinError={setNinError}
        />
      )}

      {step === "username" && (
        <UsernameStep
          data={data}
          setData={setData}
          canContinue={canContinue}
          onBack={goBack}
          onAction={handleUsernameSubmit}
          isChecking={isCheckingUsername}
          isUsernameAvailable={isUsernameAvailable}
          error={usernameError}
          setError={setUsernameError}
          suggestions={usernameSuggestions}
        />
      )}

      {step === "origin" && (
        <OriginStep
          data={data}
          setData={setData}
          canContinue={canContinue}
          onBack={goBack}
          onAction={goNext}
        />
      )}

      {step === "location" && (
        <LocationStep
          data={data}
          setData={setData}
          canContinue={canContinue}
          onBack={goBack}
          onAction={goNext}
          visitorDetails={visitorDetails}
        />
      )}

      {step === "referral" && (
        <ReferralStep
          data={data}
          setData={setData}
          canContinue={canContinue}
          onBack={goBack}
          onAction={onFinish}
          isChecking={isCheckingReferralCode || isSubmitting}
          isValid={isReferralCodeValid}
          referrerName={referrerName}
          error={referralCodeError || submitError}
          setError={setReferralCodeError}
        />
      )}
    </>
  );
}

// Props for the username selection step
type UsernameStepProps = {
  data: OnboardingState;
  setData: React.Dispatch<React.SetStateAction<OnboardingState>>;
  canContinue: boolean;
  onBack: () => void;
  onAction: () => void;
  isChecking: boolean;
  isUsernameAvailable: boolean | null;
  error: string | null;
  setError: (e: string | null) => void;
  suggestions: string[];
};

// UsernameStep component: Allows the user to choose a unique username
function UsernameStep({
  data,
  setData,
  canContinue,
  onBack,
  onAction,
  isChecking,
  isUsernameAvailable,
  error,
  setError,
  suggestions,
}: UsernameStepProps) {
  return (
    <FlowScreen
      icon={<UserIcon className="size-6 text-primary" strokeWidth={1.8} />}
      title="Choose a username"
      subtitle="Pick a unique username for your account."
      onBack={onBack}
      actionLabel="Continue"
      actionDisabled={!canContinue || isChecking}
      actionLoading={isChecking}
      onAction={onAction}
    >
      {/* <FormError message={error} /> */}
      <FormInput
        id="username-input"
        placeholder="Username"
        value={data.username}
        maxLength={30}
        isLoading={isChecking}
        showCheckMark={isUsernameAvailable === true}
        errorMsg={error ?? ""}
        onChange={(e) => {
          setError(null);
          setData((c) => ({ ...c, username: e.target.value.trim() }));
        }}
      />

      {suggestions.length > 0 && (
        <div className="space-y-2 px-1">
          <p className="text-xs font-medium text-c-60">Suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setError(null);
                  setData((c) => ({ ...c, username: s }));
                }}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 border",
                  data.username === s
                    ? "bg-emerald-100 text-emerald-800 scale-95"
                    : "bg-black/5 hover:bg-black/10 text-c-80 active:scale-95",
                ].join(" ")}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </FlowScreen>
  );
}

// Props for capturing user's personal details
type DetailsStepProps = {
  data: OnboardingState;
  setData: React.Dispatch<React.SetStateAction<OnboardingState>>;
  canContinue: boolean;
  onBack: () => void;
  onAction: () => void;
  isCheckingNIN: boolean;
  isNinAvailable: boolean | null;
  ninError: string | null;
  setNinError: (e: string | null) => void;
};

// DetailsStep component: Collects the user's personal information including NIN and date of birth
function DetailsStep({
  data,
  setData,
  canContinue,
  onBack,
  onAction,
  isCheckingNIN,
  isNinAvailable,
  ninError,
  setNinError,
}: DetailsStepProps) {
  return (
    <FlowScreen
      icon={<UserIcon className="size-6 text-primary" strokeWidth={1.8} />}
      title="Add your details"
      subtitle="Enter your full government name & personal info."
      onBack={onBack}
      actionLabel="Continue"
      actionDisabled={!canContinue || isCheckingNIN}
      actionLoading={isCheckingNIN}
      onAction={onAction}
    >
      <FormInput
        id="first-name-input"
        placeholder="First name"
        value={data.firstName}
        onChange={(e) => setData((c) => ({ ...c, firstName: e.target.value }))}
      />
      <FormInput
        id="middle-name-input"
        placeholder="Middle name (optional)"
        value={data.otherNames}
        onChange={(e) => setData((c) => ({ ...c, otherNames: e.target.value }))}
      />
      <FormInput
        id="last-name-input"
        placeholder="Surname"
        value={data.surname}
        onChange={(e) => setData((c) => ({ ...c, surname: e.target.value }))}
      />
      <FormInput
        id="nin-input"
        placeholder="NIN (11 digits)"
        value={data.nin}
        inputMode="numeric"
        isLoading={isCheckingNIN}
        showCheckMark={isNinAvailable === true}
        errorMsg={ninError ?? ""}
        onChange={(e) => {
          setData((c) => ({
            ...c,
            nin: e.target.value.replace(/[^0-9]/g, "").slice(0, 11).trim(),
          }));
        }}
      />
      <SelectGender
        initialData={data.gender}
        update={(value) => setData((c) => ({ ...c, gender: value }))}
        buttonText="Gender"
      />
      <SelectDate
        initialData={
          data.dateOfBirth ? data.dateOfBirth.toISOString() : undefined
        }
        update={(value) =>
          setData((c) => ({ ...c, dateOfBirth: new Date(value) }))
        }
        buttonText="Date of birth"
      />
    </FlowScreen>
  );
}

// Props for capturing user's origin
type OriginStepProps = {
  data: OnboardingState;
  setData: React.Dispatch<React.SetStateAction<OnboardingState>>;
  canContinue: boolean;
  onBack: () => void;
  onAction: () => void;
};

// OriginStep component: Collects the user's state and country of origin
function OriginStep({ data, setData, canContinue, onBack, onAction }: OriginStepProps) {
  return (
    <FlowScreen
      icon={<MapPinIcon className="size-6 text-primary" strokeWidth={1.8} />}
      title="Where are you from?"
      subtitle="Select your country and state of origin."
      onBack={onBack}
      actionLabel="Continue"
      actionDisabled={!canContinue}
      onAction={onAction}
    >
      <SelectCountry
        fetchCountries={() => getAllCountries()}
        selectedId={data.countryOfOriginId || 161}
        update={(val) => {
          setData((c) => ({
            ...c,
            countryOfOrigin: val.name,
            countryOfOriginId: val.id,
            stateOfOrigin: "",
            stateOfOriginId: undefined,
          }));
        }}
      />
      <SelectState
        fetchStates={getStates}
        countryOriginalId={data.countryOfOriginId || 161}
        selectedId={data.stateOfOriginId}
        disabled={!(data.countryOfOriginId || 161)}
        update={(val) => {
          setData((c) => ({
            ...c,
            countryOfOrigin: c.countryOfOrigin || "Nigeria",
            countryOfOriginId: c.countryOfOriginId || 161,
            stateOfOrigin: val.name,
            stateOfOriginId: val.id,
          }));
        }}
      />
    </FlowScreen>
  );
}

// Props for capturing user's current residence
type LocationStepProps = {
  data: OnboardingState;
  setData: React.Dispatch<React.SetStateAction<OnboardingState>>;
  canContinue: boolean;
  onBack: () => void;
  onAction: () => void;
  visitorDetails: VisitorDetails | null | undefined;
};

// LocationStep component: Collects the user's current residential location
function LocationStep({ data, setData, canContinue, onBack, onAction, visitorDetails }: LocationStepProps) {
  // Fetch countries
  const { data: countriesData } = useQuery({
    queryKey: ["GetAllCountries"],
    queryFn: getAllCountries,
    staleTime: Infinity,
  });

  // Get the matched country from the visitor details
  const matchedCountry = useMemo(() => {
    if (countriesData?.data?.countries && visitorDetails?.location?.country) {
      const visitorCountry = visitorDetails.location.country.toLowerCase();
      return (countriesData.data.countries as Array<{ id: number, name: string }>).find(
        (c) => c.name.toLowerCase() === visitorCountry
      );
    }
    return undefined;
  }, [countriesData, visitorDetails]);

  // Automatically sync matched country to form state when resolved if not yet set
  useEffect(() => {
    if (matchedCountry && !data.countryId) {
      setData((c) => ({
        ...c,
        country: matchedCountry.name,
        countryId: matchedCountry.id,
      }));
    }
  }, [matchedCountry, data.countryId, setData]);

  return (
    <FlowScreen
      icon={<MapPinIcon className="size-6 text-primary" strokeWidth={1.8} />}
      title="Where do you currently stay?"
      subtitle="Select your country, state and city of residence."
      onBack={onBack}
      actionLabel="Continue"
      actionDisabled={!canContinue}
      onAction={onAction}
    >
      <SelectCountry
        fetchCountries={() => getAllCountries()}
        selectedId={data.countryId || matchedCountry?.id}
        update={(val) => {
          setData((c) => ({
            ...c,
            country: val.name,
            countryId: val.id,
            state: "",
            stateId: undefined,
            city: "",
            cityId: undefined,
          }));
        }}
      />
      <SelectState
        fetchStates={getStates}
        countryOriginalId={data.countryId || matchedCountry?.id}
        selectedId={data.stateId}
        disabled={!(data.countryId || matchedCountry?.id)}
        update={(val) => {
          setData((c) => ({
            ...c,
            state: val.name,
            stateId: val.id,
            city: "",
            cityId: undefined,
          }));
        }}
      />
      <SelectCity
        fetchCities={getCities}
        stateId={data.stateId}
        selectedId={data.cityId}
        disabled={!data.stateId}
        update={(val) => {
          setData((c) => ({
            ...c,
            city: val.name,
            cityId: val.id,
          }));
        }}
      />
    </FlowScreen>
  );
}

// Props for referral tracking
type ReferralStepProps = {
  data: OnboardingState;
  setData: React.Dispatch<React.SetStateAction<OnboardingState>>;
  canContinue: boolean;
  onBack: () => void;
  onAction: () => void;
  isChecking: boolean;
  isValid: boolean | null;
  referrerName: string | null;
  error: string | null;
  setError: (e: string | null) => void;
};

// ReferralStep component: Allows the user to enter an optional referral code
function ReferralStep({
  data,
  setData,
  canContinue,
  onBack,
  onAction,
  isChecking,
  isValid,
  referrerName,
  error,
  setError,
}: ReferralStepProps) {
  const hasCode = data.referralCode.trim().length > 0;

  return (
    <FlowScreen
      icon={<Users className="size-6 text-primary" strokeWidth={1.8} />}
      title="Who told you about Free9ja?"
      subtitle="Enter code of the person who told you about Free9ja (ask them for it) or skip for now."
      onBack={onBack}
      actionLabel={hasCode ? "Continue" : "Skip for now"}
      actionDisabled={!canContinue || isChecking}
      actionLoading={isChecking}
      onAction={onAction}
    >
      <div className="space-y-2">
        <FormInput
          id="referral-code-input"
          placeholder="Referral code (optional)"
          value={data.referralCode}
          maxLength={30}
          isLoading={isChecking}
          showCheckMark={isValid === true}
          errorMsg={error ?? ""}
          onChange={(e) => {
            setError(null);
            setData((c) => ({ ...c, referralCode: e.target.value.trim() }));
          }}
        />
        {referrerName && (
          <p className=" font-bold text-green">{referrerName}</p>
        )}
      </div>
    </FlowScreen>
  );
}

// Props for the common screen layout in the onboarding flow
type FlowScreenProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onBack?: () => void;
  actionLabel: string;
  actionDisabled?: boolean;
  actionLoading?: boolean;
  onAction: () => void;
  children: ReactNode;
};

// FlowScreen component: A reusable wrapper for all onboarding steps, providing consistent layout and navigation
function FlowScreen({
  icon,
  title,
  subtitle,
  onBack,
  actionLabel,
  actionDisabled,
  actionLoading,
  onAction,
  children,
}: FlowScreenProps) {
  return (
    <>
      <OnboardingHeader onBack={onBack} />
      <div className="h-svh md:h-full md:mb-20 px-4">
        <OnboardingHeaderContent
          icon={icon}
          title={title}
          subtitle={subtitle}
        />
        <OnboardingWrapper className="space-y-5">
          {children}
        </OnboardingWrapper>
      </div>

      <StickyFooter className="pb-10">
        <OnboardingWrapper className="space-y-4">
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
            className="h-14 w-full rounded-[18px] font-bold hidden md:block"
          >
            Go back
          </Button>
        </OnboardingWrapper>
      </StickyFooter>
    </>
  );
}
