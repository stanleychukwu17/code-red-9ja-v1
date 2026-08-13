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
import { SelectSecurityQuestion } from "@repo/ui/components/selects/security-question-select";
import { SelectState } from "@repo/ui/components/selects/state-select";
import MapPinIcon from "@repo/ui/icons/onboarding/map-pin-icon";
import NINIcon from "@repo/ui/icons/onboarding/nin-icon ";
import UserIcon from "@repo/ui/icons/onboarding/user-icon";
import { useNavigate } from "@tanstack/react-router";
import { Shield, Users } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, } from "react";
import { useDebounceValue } from "usehooks-ts";
import { FormError } from "./-form-error";

// Ordered list of onboarding steps (commented steps are currently disabled)
export const ONBOARDING_STEPS = [
  "details",
  "username",
  // "nin",
  "origin",
  "location",
  "referral",
  // "security",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

type StateOption = { id: number; value: string; label: string };

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
  // security step
  securityQuestion1: number | undefined;
  securityAnswer1: string;
  securityQuestion2: number | undefined;
  securityAnswer2: string;
};

type OnboardingFlowProps = {
  step: OnboardingStep;
};

// Main component that orchestrates the multi‑step onboarding flow
export function OnboardingFlow({ step }: OnboardingFlowProps) {
  const navigate = useNavigate();

  const [data, setData] = useState<OnboardingState>({
    username: "",
    firstName: "",
    surname: "",
    otherNames: "",
    gender: "",
    dateOfBirth: undefined,
    referralCode: "",
    nin: "",
    countryOfOrigin: "",
    countryOfOriginId: undefined,
    stateOfOrigin: "",
    stateOfOriginId: undefined,
    country: "",
    countryId: undefined,
    state: "",
    stateId: undefined,
    city: "",
    cityId: undefined,
    securityQuestion1: undefined,
    securityAnswer1: "",
    securityQuestion2: undefined,
    securityAnswer2: "",
  });

  const currentStepIndex = Math.max(0, ONBOARDING_STEPS.indexOf(step));

  // ── Username suggestions (derived from details step) ──
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
        `${f}_${l}`,
        `${f}${l}`,
        `${f}_${l}${randomSuffixRef.current}`,
        `${f}_${l}_${FULL_YEAR}`,
        `${f}${l}${randomSuffixRef.current}`,
        `${f}${l}${FULL_YEAR}`,
      ]),
    );
  }, [data.firstName, data.surname, FULL_YEAR]);

  // ── Async states ──
  const [isCheckingNIN, setIsCheckingNIN] = useState(false);
  const [ninError, setNinError] = useState<string | null>(null);
  const [isNinAvailable, setIsNinAvailable] = useState<boolean | null>(null);
  const [isCheckingReferralCode, setIsCheckingReferralCode] = useState(false);
  const [referralCodeError, setReferralCodeError] = useState<string | null>(null);
  const [isReferralCodeValid, setIsReferralCodeValid] = useState<boolean | null>(null);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [referrerId, setReferrerId] = useState<number | null>(null);

  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const isSubmitting = completeOnboardingMutation.isPending;

  // Residence and Origin state is now directly managed by the Select components using react-query hooks internally

  // ----- Navigation helpers -----
  // onStepChange updates the URL query to reflect the current onboarding step
  const onStepChange = useCallback(
    (nextStep: OnboardingStep) => {
      navigate({
        to: APP_URL.auth.onboarding,
        search: { step: nextStep },
        replace: true,
      });
    },
    [navigate],
  );

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
    // Validation for optional security step (currently commented out)
    // if (!data.securityQuestion1 || !data.securityQuestion2) {
    //   setSecurityError("Please select both security questions.");
    //   return;
    // }
    // if (data.securityQuestion1 === data.securityQuestion2) {
    //   setSecurityError("Please choose two different security questions.");
    //   return;
    // }
    // if (!data.securityAnswer1 || !data.securityAnswer2) {
    //   setSecurityError("Please provide answers for both questions.");
    //   return;
    // }

    if (!data.countryId) {
      setSubmitError("Please select a country of residence.");
      return;
    }

    if (!data.stateId) {
      setSubmitError("Please select a state of residence.");
      return;
    }

    setSubmitError(null);
    setSecurityError(null);

    const dob = data.dateOfBirth
      ? data.dateOfBirth.toISOString().split("T")[0]
      : "";

    completeOnboardingMutation.mutate({
      data: {
        first_name: data.firstName.trim(),
        last_name: data.surname.trim(),
        middle_name: data.otherNames.trim() || "",
        gender: data.gender.toLowerCase(),
        date_of_birth: dob,
        referrer_user_id: referrerId,
        username: data.username.trim(),
        nin: data.nin,
        country_of_origin: data.countryOfOriginId ?? 0,
        state_of_origin: data.stateOfOriginId ?? 0,
        current_country: data.countryId ?? 0,
        current_state: data.stateId,
        current_city: data.cityId ?? 0,
        question1: data.securityQuestion1 ?? 0,
        answer1: data.securityAnswer1?.trim() || "",
        question2: data.securityQuestion2 ?? 0,
        answer2: data.securityAnswer2?.trim() || "",
      },
    });
  }, [data, completeOnboardingMutation]);

  // ----- Username availability check (debounced) -----
  // Runs a server check after the user stops typing for 500 ms
  const [debouncedUsername] = useDebounceValue(data.username, 500);

  useEffect(() => {
    setIsUsernameAvailable(null);
    setUsernameError(null);
  }, [data.username]);

  useEffect(() => {
    const username = debouncedUsername.trim();
    if (!username) return;

    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{1,28}[a-zA-Z0-9]$/;
    if (!usernameRegex.test(username)) {
      setUsernameError(
        "Username must start with a letter, be 3–30 chars, and not end with an underscore",
      );
      setIsUsernameAvailable(false);
      return;
    }

    setIsCheckingUsername(true);
    setUsernameError(null);

    let isMounted = true;
    const check = async () => {
      try {
        const res = await checkUsername({ data: { username } });
        if (!isMounted) return;
        if (res.success) {
          if (res.data?.exists) {
            setUsernameError("This username is already taken");
            setIsUsernameAvailable(false);
          } else {
            setIsUsernameAvailable(true);
          }
        } else {
          setUsernameError(res.message || "Failed to verify username.");
          setIsUsernameAvailable(false);
        }
      } catch {
        if (!isMounted) return;
        setUsernameError(
          "An unexpected error occurred while checking username.",
        );
        setIsUsernameAvailable(false);
      } finally {
        if (isMounted) setIsCheckingUsername(false);
      }
    };
    check();

    return () => {
      isMounted = false;
    };
  }, [debouncedUsername]);

  // ── Username handler ──
  const handleUsernameSubmit = async () => {
    if (isUsernameAvailable) {
      goNext();
    }
  };

  // ── NIN active check ──
  const [debouncedNin] = useDebounceValue(data.nin, 600);

  useEffect(() => {
    setIsNinAvailable(null);
    setNinError(null);
  }, [data.nin]);

  useEffect(() => {
    if (debouncedNin.length !== 11) return;
    setIsCheckingNIN(true);
    setNinError(null);
    let isMounted = true;
    const check = async () => {
      try {
        const res = await checkNin({ data: { nin: debouncedNin } });
        if (!isMounted) return;
        if (res.success) {
          if (res.data?.exists) {
            setNinError("This NIN is already registered to another account");
            setIsNinAvailable(false);
          } else {
            setIsNinAvailable(true);
          }
        } else {
          setNinError(res.message || "Failed to verify NIN.");
          setIsNinAvailable(false);
        }
      } catch {
        if (!isMounted) return;
        setNinError("An unexpected error occurred while checking NIN.");
        setIsNinAvailable(false);
      } finally {
        if (isMounted) setIsCheckingNIN(false);
      }
    };
    check();
    return () => {
      isMounted = false;
    };
  }, [debouncedNin]);

  // ── Referral Code active check ──
  const [debouncedReferralCode] = useDebounceValue(data.referralCode, 500);

  useEffect(() => {
    setIsReferralCodeValid(null);
    setReferralCodeError(null);
  }, [data.referralCode]);

  useEffect(() => {
    const code = debouncedReferralCode.trim();
    if (!code) return; // If empty, it's valid to skip

    setIsCheckingReferralCode(true);
    setReferralCodeError(null);
    setReferrerName(null);
    setReferrerId(null);

    let isMounted = true;
    const check = async () => {
      try {
        const res = await checkReferralCode({ data: { code } });
        console.log("referral response", res);
        if (!isMounted) return;
        if (res.success) {
          if (res.data?.exists) {
            setIsReferralCodeValid(true);
            setReferrerName(res.data.name);
            setReferrerId(res.data.referrerId);
          } else {
            setReferralCodeError("Referral code not found");
            setIsReferralCodeValid(false);
          }
        } else {
          setReferralCodeError(res.message || "Failed to verify code.");
          setIsReferralCodeValid(false);
        }
      } catch {
        if (!isMounted) return;
        setReferralCodeError("An unexpected error occurred.");
        setIsReferralCodeValid(false);
      } finally {
        if (isMounted) setIsCheckingReferralCode(false);
      }
    };
    check();
    return () => {
      isMounted = false;
    };
  }, [debouncedReferralCode]);

  // ── NIN handler ──
  const handleNINSubmit = () => {
    if (isNinAvailable) goNext();
  };

  // ── canContinue per step ──
  const canContinue =
    step === "username"
      ? isUsernameAvailable === true
      : step === "details"
        ? Boolean(
          data.firstName && data.surname && data.gender && data.dateOfBirth,
        )
        : // : step === "nin"
        //   ? isNinAvailable === true
        step === "origin"
          ? Boolean(data.stateOfOriginId)
          : step === "location"
            ? Boolean(data.stateId)
            : step === "referral"
              ? data.referralCode.trim()
                ? isReferralCodeValid === true
                : true
              : // : step === "security"
              //   ? Boolean(
              //       data.securityQuestion1 &&
              //       data.securityAnswer1.trim() &&
              //       data.securityQuestion2 &&
              //       data.securityAnswer2.trim(),
              //     )
              false;

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

      {/* {step === "nin" && (
        <NINStep
          data={data}
          setData={setData}
          canContinue={canContinue}
          onBack={goBack}
          onAction={handleNINSubmit}
          isChecking={isCheckingNIN}
          isNinAvailable={isNinAvailable}
          error={ninError}
          setError={setNinError}
        />
      )} */}

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

      {/* {step === "security" && (
        <SecurityStep
          data={data}
          setData={setData}
          canContinue={canContinue}
          onBack={goBack}
          onAction={onFinish}
          isSubmitting={isSubmitting}
          securityError={securityError}
          setSecurityError={setSecurityError}
          submitError={submitError}
        />
      )} */}
    </>
  );
}

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
          setData((c) => ({ ...c, username: e.target.value }));
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

type DetailsStepProps = {
  data: OnboardingState;
  setData: React.Dispatch<React.SetStateAction<OnboardingState>>;
  canContinue: boolean;
  onBack: () => void;
  onAction: () => void;
};

function DetailsStep({
  data,
  setData,
  canContinue,
  onBack,
  onAction,
}: DetailsStepProps) {
  return (
    <FlowScreen
      icon={<UserIcon className="size-6 text-primary" strokeWidth={1.8} />}
      title="Add your details"
      subtitle="Enter your full government name & personal info."
      onBack={onBack}
      actionLabel="Continue"
      actionDisabled={!canContinue}
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

type NINStepProps = {
  data: OnboardingState;
  setData: React.Dispatch<React.SetStateAction<OnboardingState>>;
  canContinue: boolean;
  onBack: () => void;
  onAction: () => void;
  isChecking: boolean;
  isNinAvailable: boolean | null;
  error: string | null;
  setError: (e: string | null) => void;
};

function NINStep({
  data,
  setData,
  canContinue,
  onBack,
  onAction,
  isChecking,
  isNinAvailable,
  error,
  setError,
}: NINStepProps) {
  return (
    <FlowScreen
      icon={<NINIcon />}
      title="Add your NIN"
      subtitle="Enter your 11-digit National Identification Number."
      onBack={onBack}
      actionLabel="Continue"
      actionDisabled={!canContinue || isChecking}
      actionLoading={isChecking}
      onAction={onAction}
    >
      <FormInput
        id="nin-input"
        placeholder="NIN (11 digits)"
        value={data.nin}
        inputMode="numeric"
        isLoading={isChecking}
        showCheckMark={isNinAvailable === true}
        errorMsg={error ?? ""}
        onChange={(e) => {
          setError(null);
          setData((c) => ({
            ...c,
            nin: e.target.value.replace(/[^0-9]/g, "").slice(0, 11),
          }));
        }}
      />
    </FlowScreen>
  );
}

type OriginStepProps = {
  data: OnboardingState;
  setData: React.Dispatch<React.SetStateAction<OnboardingState>>;
  canContinue: boolean;
  onBack: () => void;
  onAction: () => void;
};

function OriginStep({
  data,
  setData,
  canContinue,
  onBack,
  onAction,
}: OriginStepProps) {
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
        selectedId={data.countryOfOriginId}
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
        countryOriginalId={data.countryOfOriginId}
        selectedId={data.stateOfOriginId}
        disabled={!data.countryOfOriginId}
        update={(val) => {
          setData((c) => ({
            ...c,
            stateOfOrigin: val.name,
            stateOfOriginId: val.id,
          }));
        }}
      />
    </FlowScreen>
  );
}

type LocationStepProps = {
  data: OnboardingState;
  setData: React.Dispatch<React.SetStateAction<OnboardingState>>;
  canContinue: boolean;
  onBack: () => void;
  onAction: () => void;
};

function LocationStep({
  data,
  setData,
  canContinue,
  onBack,
  onAction,
}: LocationStepProps) {
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
        selectedId={data.countryId}
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
        countryOriginalId={data.countryId}
        selectedId={data.stateId}
        disabled={!data.countryId}
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
            setData((c) => ({ ...c, referralCode: e.target.value }));
          }}
        />
        {referrerName && (
          <p className=" font-bold text-green">{referrerName}</p>
        )}
      </div>
    </FlowScreen>
  );
}

type SecurityStepProps = {
  data: OnboardingState;
  setData: React.Dispatch<React.SetStateAction<OnboardingState>>;
  canContinue: boolean;
  onBack: () => void;
  onAction: () => void;
  isSubmitting: boolean;
  securityError: string | null;
  setSecurityError: (e: string | null) => void;
  submitError: string | null;
};

function SecurityStep({
  data,
  setData,
  canContinue,
  onBack,
  onAction,
  isSubmitting,
  securityError,
  setSecurityError,
  submitError,
}: SecurityStepProps) {
  return (
    <FlowScreen
      icon={<Shield className="size-6 text-primary" strokeWidth={1.8} />}
      title="Security questions"
      subtitle="Two questions to help recover your account."
      onBack={onBack}
      actionLabel="Complete setup"
      actionDisabled={!canContinue || isSubmitting}
      actionLoading={isSubmitting}
      onAction={onAction}
    >
      <FormError message={securityError || submitError} />

      {/* Question 1 */}
      <div className="flex flex-col gap-1">
        <Label title="Security question 1" />
        <SelectSecurityQuestion
          selectedId={data.securityQuestion1}
          update={(val) => {
            setSecurityError(null);
            setData((c) => ({ ...c, securityQuestion1: val }));
          }}
        />
      </div>
      <FormInput
        id="sa1-input"
        placeholder="Your answer"
        value={data.securityAnswer1}
        onChange={(e) =>
          setData((c) => ({ ...c, securityAnswer1: e.target.value }))
        }
      />

      {/* Question 2 */}
      <div className="flex flex-col gap-1 mt-2">
        <Label title="Security question 2" />
        <SelectSecurityQuestion
          selectedId={data.securityQuestion2}
          update={(val) => {
            setSecurityError(null);
            setData((c) => ({ ...c, securityQuestion2: val }));
          }}
        />
      </div>
      <FormInput
        id="sa2-input"
        placeholder="Your answer"
        value={data.securityAnswer2}
        onChange={(e) =>
          setData((c) => ({ ...c, securityAnswer2: e.target.value }))
        }
      />
    </FlowScreen>
  );
}

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
        <OnboardingWrapper className="space-y-5">{children}</OnboardingWrapper>
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
