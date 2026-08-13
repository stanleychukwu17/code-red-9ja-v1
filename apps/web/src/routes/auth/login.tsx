import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";

import { Button } from "@repo/ui/components/button";
import { FormInput, PasswordInput } from "@repo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { AuthWrapper } from "./_components/-auth-wrapper";
import { useAppDispatch, useAppSelector } from "#/redux/hooks";
import { updateAuthState, clearOnboardingData } from "#/redux/slice/authSlice";
import { useQuery } from "@tanstack/react-query";
import { loginUser, checkIfRefreshTokenInCookie } from "#/lib/server/auth/auth";
import { FormError } from "./_components/-form-error";
import { SuccessMessage } from "./_components/-success-message";
import { getPageHeader } from "@/lib/shared/meta";
import { getAllCountries } from "@/lib/server/countries";
import { APP_URL, APP_NAME } from "#/lib/config";

export type countriesType = {
  success: boolean;
  data: {
    countries: {
      id: number;
      name: string;
      iso2: string;
      phonecode: string;
    }[];
  };
  message: string;
};

type payloadType = {
  country: string;
  identifier: string;
  password: string;
  identifierType?: string;
  iso2?: string;
};

export const Route = createFileRoute("/auth/login")({
  // Check if user is already authenticated, if so redirect to home page
  beforeLoad: async () => {
    const isAuthed = await checkIfRefreshTokenInCookie({});
    if (isAuthed.success) {
      throw redirect({ to: APP_URL.home });
    }
  },

  // Set page meta
  head: () =>
    getPageHeader({
      title: "Log in to your account",
      description: `Log in to your ${APP_NAME} account to access your dashboard and manage your profile`,
    }),

  // page component
  component: RouteComponent,

  // error component
  errorComponent: ({ error }) => (
    <div className="p-4 text-destructive">{`${error?.message}, Also check if the backend server is up and running`}</div>
  ),
});

function RouteComponent() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState<boolean>(false);
  const [showPasswordChangeSuccess, setShowPasswordChangeSuccess] = useState<boolean>(false);
  const onboardingData = useAppSelector((state) => state.auth.onboardingData);
  const visitorDetails = useAppSelector((state) => state.site.visitorDetails);
  const visitorCountry = visitorDetails?.location?.country?.toLowerCase();

  // fetch the countries
  const { data: countriesRes } = useQuery({
    queryKey: ['countries'],
    queryFn: () => getAllCountries() as Promise<countriesType>,
    staleTime: Infinity,
  });
  const countries = (countriesRes?.success ? countriesRes.data.countries : []) as { id: number; name: string; iso2: string; phonecode: string }[];

  // login form
  const form = useForm({
    defaultValues: {
      country: "",
      identifier: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setErrorMsg(null);

      const payload: payloadType = {
        ...value,
        identifier: value.identifier.trim().toLowerCase(),
      };

      // get the identifier type (email, username or phone number)
      const emailRegex = /^[\w\d._%+-]+@[\w\d.-]+\.\w{2,}$/;
      const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{1,28}[a-zA-Z0-9]$/; // username must start with a letter
      let identifierType = "phone";
      if (emailRegex.test(payload.identifier)) {
        identifierType = "email";
      } else if (usernameRegex.test(payload.identifier)) {
        identifierType = "username";
      }

      // if identifier looks like a phone number, format it with country code
      const phoneRegex = /^[\d\s-]+$/;
      if (identifierType === "phone" && phoneRegex.test(payload.identifier)) {
        const matchedCountry = countries.find(
          (c) => c.name.toLowerCase() === value.country.toLowerCase(),
        );

        if (matchedCountry) {
          payload.identifier = payload.identifier.startsWith("0")
            ? `+${matchedCountry.phonecode}${payload.identifier.slice(1)}`
            : `+${matchedCountry.phonecode}${payload.identifier}`;
          payload.iso2 = matchedCountry.iso2;
        }
      }

      // add the identifier type to the payload
      payload.identifierType = identifierType;

      try {
        const response = await loginUser({ data: payload });

        if (response.success) {
          dispatch(updateAuthState({ user: response.data.user }));

          // login successful, redirect user to dashboard
          navigate({ to: APP_URL.home });
        } else {
          // login failed, show error message
          setErrorMsg(
            response.message || "Login failed. Please check your credentials.",
          );
        }
      } catch (error) {
        setErrorMsg(`Connection error: ${error}`);
      }
    },
  });

  // auto-select the country where the user is browsing from once visitorCountry is available
  useEffect(() => {
    if (!visitorCountry) return;

    const timeoutId = setTimeout(() => {
      // find the matched country
      const matchedCountry = countries.find(
        (c) => c.name.toLowerCase() === visitorCountry,
      );

      // if no matched country, return
      if (!matchedCountry) return;

      // set the country value in the form
      form.setFieldValue("country", matchedCountry.name.toLowerCase());

      // find the select element for countries and set the value to the matched country
      const selectEl = document.querySelector("div.selectElement select");
      if (selectEl) {
        (selectEl as HTMLSelectElement).value = visitorCountry;
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [visitorCountry, countries, form]);

  // check if registration was just completed (within 5 minutes)
  useEffect(() => {
    if (
      onboardingData?.registrationCompleted &&
      onboardingData?.registrationCompletedAt
    ) {
      const completionTime = new Date(onboardingData.registrationCompletedAt);
      const currentTime = new Date();
      const timeDiff = currentTime.getTime() - completionTime.getTime();
      const fiveMinutesInMs = 5 * 60 * 1000;

      if (timeDiff < fiveMinutesInMs) {
        setShowRegistrationSuccess(true);
        // clear the onboarding data after showing the message
        dispatch(clearOnboardingData());
      }
    }
  }, [onboardingData, dispatch]);

  // check if password was just changed (within 5 minutes)
  useEffect(() => {
    if (
      onboardingData?.passwordChangeCompleted &&
      onboardingData?.passwordChangeCompletedAt
    ) {
      const completionTime = new Date(onboardingData.passwordChangeCompletedAt);
      const currentTime = new Date();
      const timeDiff = currentTime.getTime() - completionTime.getTime();
      const fiveMinutesInMs = 5 * 60 * 1000;

      if (timeDiff < fiveMinutesInMs) {
        setShowPasswordChangeSuccess(true);
        // clear the onboarding data after showing the message
        dispatch(clearOnboardingData());
      }
    }
  }, [onboardingData, dispatch]);

  return (
    <AuthWrapper type="login">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        {showRegistrationSuccess && (
          <SuccessMessage
            title="Registration completed successfully!"
            description="You can now log in with your credentials."
          />
        )}
        {showPasswordChangeSuccess && (
          <SuccessMessage
            title="Password changed successfully!"
            description="You can now log in with your new password."
          />
        )}
        <FormError message={errorMsg} />
        <form.Field
          name="country"
          validators={{
            onChange: ({ value }) =>
              !value ? "Country is required" : undefined,
          }}
          children={(field) => (
            <div className="selectElement flex flex-col gap-1">
              <Select
                onValueChange={(val) => {
                  field.handleChange(val);
                }}
                defaultValue={field.state.value}
              >
                <SelectTrigger className="w-full bg-yellow-100">
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Countries</SelectLabel>
                    {countries.map((country) => (
                      <SelectItem
                        key={country.name}
                        value={country.name.toLowerCase()}
                      >
                        <span className="flex items-center gap-2 capitalize py-1.5 cursor-pointer">
                          <span className="country">
                            <img
                              src={`https://flagcdn.com/w40/${country.iso2.toLowerCase()}.png`}
                              width="23"
                            />
                          </span>
                          <span>{country.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {field.state.meta.isTouched && field.state.meta.errors.length ? (
                <span className="text-xs text-destructive">
                  {field.state.meta.errors[0] as string}
                </span>
              ) : null}
            </div>
          )}
        />

        <form.Field
          name="identifier"
          validators={{
            onChange: ({ value }) =>
              !value ? "Identifier is required" : undefined,
          }}
          children={(field) => (
            <FormInput
              type="text"
              placeholder="Email or Username or Phone number"
              className="rounded-sm"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              errorMsg={
                field.state.meta.isTouched && field.state.meta.errors.length
                  ? (field.state.meta.errors[0] as string)
                  : undefined
              }
            />
          )}
        />

        <form.Field
          name="password"
          validators={{
            onChange: ({ value }) =>
              !value
                ? "Password is required"
                : value.length < 5
                  ? "Password must be at least 5 characters"
                  : undefined,
          }}
          children={(field) => (
            <PasswordInput
              placeholder="Password"
              className="rounded-sm"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              errorMsg={
                field.state.meta.isTouched && field.state.meta.errors.length
                  ? (field.state.meta.errors[0] as string)
                  : undefined
              }
            />
          )}
        />

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              className="rounded-sm"
              variant="secondary"
              disabled={!canSubmit}
              loading={isSubmitting}
            >
              Log in
            </Button>
          )}
        />
      </form>
    </AuthWrapper>
  );
}
