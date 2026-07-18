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
import { useCallback, useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import { APP_URL } from "#/lib/config";
import { checkNin, checkUsername, completeRegistration } from "#/lib/server/auth/auth";
import { getCities, getStates } from "#/lib/server/countries";
import { FormError } from "./-form-error";
import { useAppSelector, useAppDispatch } from "#/redux/hooks";
import { updateOnboardingData } from "#/redux/slice/authSlice";


const ONBOARDING_STEPS = ["details", "nin", "location"] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

type OnboardingState = {
  firstName: string;
  surname: string;
  otherNames: string;
  gender: string;
  dateOfBirth?: Date;
  username: string;
  nin: string;
  country: string;
  state: string;
  city: string;
};

type OnboardingFlowProps = {
  step: OnboardingStep;
};

export function OnboardingFlow({ step }: OnboardingFlowProps) {
  const dispatch = useAppDispatch();
  const onboardingData = useAppSelector((state) => state.auth.onboardingData);
  const { country: userCountry, iso2, countryId } = onboardingData ?? {};

  const [data, setData] = useState<OnboardingState>({
    firstName: "",
    surname: "",
    otherNames: "",
    gender: "",
    dateOfBirth: undefined,
    username: "",
    nin: "",
    country: userCountry || "",
    state: "",
    city: "",
  });
  const navigate = useNavigate();

  // if there is no onboardingId, redirect back to signup page
  useEffect(() => {
    if (!onboardingData?.id || !onboardingData?.countryId) {
      navigate({ to: APP_URL.auth.signup });
      return
    }
  }, [navigate, onboardingData?.id, onboardingData?.countryId]);

  // get current step index, using the step name from the url
  const currentStepIndex = Math.max(0, ONBOARDING_STEPS.indexOf(step));

  // Random suffix, FULL_YEAR is used for username suggestions
  const randomSuffixRef = useRef(Math.floor(100 + Math.random() * 900));
  const FULL_YEAR = useRef(new Date().getFullYear()).current;

  const usernameSuggestions = useMemo(() => {
    const first = data.firstName.trim();
    const last = data.surname.trim();

    if (!first || !last) return [];

    const f = first.toLowerCase().replace(/[^a-z0-9]/g, "");
    const l = last.toLowerCase().replace(/[^a-z0-9]/g, "");

    const suggestions = [
      `${f}_${l}`,
      `${f}${l}`,
      `${f}_${l}${randomSuffixRef.current}`,
      `${f}_${l}_${FULL_YEAR}`,
      `${f}${l}${randomSuffixRef.current}`,
      `${f}${l}${FULL_YEAR}`,
    ];

    return Array.from(new Set(suggestions));
  }, [data.firstName, data.surname, data.otherNames]);

  const [isCheckingNIN, setIsCheckingNIN] = useState(false);
  const [ninError, setNinError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [states, setStates] = useState<{ id: number; value: string; label: string }[]>([]);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [statesError, setStatesError] = useState<string | null>(null);

  const [cities, setCities] = useState<{ id: number; value: string; label: string }[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [citiesError, setCitiesError] = useState<string | null>(null);

  // Cache for cities data: Map<stateId, citiesArray>
  const citiesCache = useRef<Map<number, { id: number; value: string; label: string }[]>>(new Map());

  // gets the stateId from the selected state, will update when user changes their state of residence,
  // state id is used to fetch the cities of the selected state
  const stateId = useMemo(() => {
    const selectedState = states.find((s) => s.value === data.state)
    return selectedState?.id
  }, [states, data.state]);

  // Function to handle the final submission of onboarding data
  const onFinish = useCallback(async () => {
    const { firstName, surname, otherNames, gender, dateOfBirth, username, nin } = data;
    const { email, phoneNumber, password, countryId: onboardingCountryId, id: onboardingId, question1, answer1, question2, answer2 } = onboardingData ?? {};

    // Get city id
    const selectedCity = cities.find((c) => c.value === data.city);
    const cityId = selectedCity?.id;

    if (!onboardingId || onboardingId.length === 0) {
      setSubmitError("You need to go back to the signup page");
      return;
    }

    if (firstName.length < 2 || surname.length < 2 || !gender || !dateOfBirth || username.length < 2 || nin.length < 11 || !onboardingCountryId || !stateId || !onboardingId) {
      setSubmitError("Missing required parameters for registration.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      email,
      phone: phoneNumber,
      onboarding_id: onboardingId,
      username,
      nin,
      password,
      question1,
      answer1,
      question2,
      answer2,
      last_name: surname.trim(),
      first_name: firstName.trim(),
      middle_name: otherNames || "",
      gender: gender.toLowerCase(),
      date_of_birth: `${dateOfBirth.getFullYear()}-${String(dateOfBirth.getMonth() + 1).padStart(2, '0')}-${String(dateOfBirth.getDate()).padStart(2, '0')}`,
      current_country: onboardingCountryId,
      current_state: stateId,
      current_city: cityId ?? 0,
    };

    try {
      const result = await completeRegistration({ data: payload });
      if (result.success || result.data?.id) {
        // Navigate to login page
        navigate({ to: APP_URL.auth.login, replace: true });

        // Set registration completion status in authSlice
        dispatch(updateOnboardingData({
          registrationCompleted: true,
          registrationCompletedAt: new Date().toISOString(),
        }))

      } else {
        setSubmitError(result.message || "Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("An error occurred during final registration", error);
      setSubmitError("An unexpected error occurred during final registration.");
    } finally {
      setIsSubmitting(false);
    }
  }, [data, onboardingData, stateId, cities, navigate]);

  // handle step change
  const onStepChange = useCallback((nextStep: OnboardingStep) => {
    navigate({
      to: APP_URL.auth.onboarding,
      search: { step: nextStep },
      replace: true,
    })
  }, [navigate])

  // used to navigate to the next step
  const goNext = useCallback(() => {
    const nextStep = ONBOARDING_STEPS[currentStepIndex + 1];

    if (!nextStep) {
      onFinish();
      return;
    }

    onStepChange(nextStep);
  }, [currentStepIndex, onFinish, onStepChange]);

  // used to navigate to the previous step
  const goBack = useCallback(() => {
    const previousStep = ONBOARDING_STEPS[currentStepIndex - 1];

    if (previousStep) {
      onStepChange(previousStep);
      return;
    }
  }, [currentStepIndex, onStepChange]);

  // Fetch cities from backend when stateId changes, with caching
  useEffect(() => {
    if (!stateId) {
      setCities([]);
      return;
    }

    // Check cache first
    const cachedCities = citiesCache.current.get(stateId);
    if (cachedCities) {
      setCities(cachedCities);
      return;
    }

    // for fetching the cities
    const fetchCities = async () => {
      setIsLoadingCities(true);
      setCitiesError(null);

      try {
        const res = await getCities({ data: { stateId } });
        if (res.success && Array.isArray(res.data.cities)) {
          const mappedCities = res.data.cities.map((c: { id: number; name: string }) => ({
            id: c.id,
            value: c.name,
            label: c.name,
          }));

          // Store in cache
          citiesCache.current.set(stateId, mappedCities);

          // Set cities
          setCities(mappedCities);
        } else {
          setCities([]);
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

  // Fetch states from backend on component mount or when countryId changes
  useEffect(() => {
    if (!countryId) return;

    const fetchStates = async () => {
      setIsLoadingStates(true);
      setStatesError(null);
      try {
        const res = await getStates({ data: { countryId } });
        if (res.success && Array.isArray(res.data.states)) {
          const mappedStates = res.data.states.map((s: { id: number; name: string }) => ({
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
  }, [userCountry]);

  // handle username submission for checks if the username already exist
  const handleUsernameSubmit = async () => {
    const username = data.username.trim();
    if (!username) return;

    // Check username validation (regex matching the backend validation: ^[a-zA-Z][a-zA-Z0-9_]{2,30}$)
    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{1,28}[a-zA-Z0-9]$/; // username must start with a letter
    if (!usernameRegex.test(username)) {
      setUsernameError("Username must start with a letter and be between 3 and 30 characters, underscores not allowed at the end");
      return;
    }

    setIsCheckingUsername(true);
    setUsernameError(null);

    try {
      const res = await checkUsername({ data: { username } });
      if (res.success) {
        if (res.data?.exists) {
          setUsernameError("This username is already taken");
        } else {
          // Username does not exist, proceed to next step
          goNext();
        }
      } else {
        setUsernameError(res.message || "Failed to verify username. Please try again.");
      }
    } catch (err) {
      console.error("Username check failed:", err);
      setUsernameError("An unexpected error occurred while checking username.");
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // handle nin submission for checks if the nin already exist
  const handleNINSubmit = async () => {
    if (data.nin.length !== 11) return;

    setIsCheckingNIN(true);
    setNinError(null);

    try {
      const res = await checkNin({ data: { nin: data.nin } });
      if (res.success) {
        if (res.data?.exists) {
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

  // if canContinue is true, the user can proceed to the next step
  const canContinue =
    step === "details"
      ? Boolean(data.firstName && data.surname && data.gender && data.dateOfBirth && data.username)
      : step === "nin" ? data.nin.length === 11
        : Boolean(data.country && data.state);

  return (
    <OnboardingWrapper>
      {step === "details" ? (
        <FlowScreen
          icon={<UserIcon className="size-6 text-primary" strokeWidth={1.8} />}
          title="Add your details"
          subtitle="Enter your full government name & gender."
          onBack={goBack}
          actionLabel="Continue"
          actionDisabled={!canContinue || isCheckingUsername}
          actionLoading={isCheckingUsername}
          onAction={handleUsernameSubmit}
        >
          <FormError message={usernameError} />
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
            placeholder="Middle name"
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
          <FormInput
            placeholder="Username"
            value={data.username}
            maxLength={30}
            onChange={(event) => {
              setUsernameError(null);
              setData((current) => ({
                ...current,
                username: event.target.value,
              }));
            }}
          />
          {usernameSuggestions.length > 0 && (
            <div className="space-y-2 px-1">
              <p className="text-xs font-medium text-c-60">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {usernameSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setUsernameError(null);
                      setData((current) => ({
                        ...current,
                        username: suggestion,
                      }));
                    }}
                    className={[
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 border",
                      // if the current username is the same as the suggestion, show emerald background
                      data.username === suggestion
                        ? "bg-emerald-100 text-emerald-800 scale-95"
                        : "bg-black/5 hover:bg-black/10 text-c-80 active:scale-95",
                    ].join(" ")}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
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
          actionLabel="Finish"
          actionDisabled={!canContinue || isLoadingStates || isLoadingCities || isSubmitting}
          actionLoading={isSubmitting}
          onAction={onFinish}
        >
          <FormError message={submitError || statesError || citiesError} />
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
            onChange={(value) => setData((current) => ({ ...current, city: value }))}
          />
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
