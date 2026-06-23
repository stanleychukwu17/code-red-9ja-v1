import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useAppDispatch } from "@/redux/hooks";
import { setOnboardingData, updateOnboardingData } from "@/redux/slice/authSlice";
import { AuthWrapper } from "./_components/-auth-wrapper";
import { SignupError } from "./_components/-signup-error";
import { FormError } from "./_components/-form-error";

import { Button } from "@repo/ui/components/button";
import { FormInput, PasswordInput } from "@repo/ui/components/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { APP_URL, APP_NAME } from "@/lib/config";
import { getPageHeader } from "@/lib/shared/meta";
import { fetchCountryDetailsFromUserIP } from "@/lib/client/ip";
import { getAllCountries } from "@/lib/server/countries";
import { checkIfRefreshTokenInCookie, startUserRegistration } from "@/lib/server/auth/auth";
import type { countriesType } from "./login";

import { PiWhatsappLogoDuotone } from "react-icons/pi";

export const Route = createFileRoute("/auth/signup")({
  // Check if user is already authenticated, if so redirect to home page
  beforeLoad: async () => {
    const isLoggedIn = await checkIfRefreshTokenInCookie({});
    if (isLoggedIn.success) {
      throw redirect({ to: APP_URL.home });
    }
  },

  // Page metadata
  head: () => getPageHeader({
    title: "Sign up: Join the movement ",
    description: `Create your account to start enjoying premium content on ${APP_NAME}`,
  }),

  // Load countries data
  loader: async () => {
    const countries = await getAllCountries() as countriesType;
    if (!countries.success) throw new Error(countries.message);
    return { countries: countries.data.countries };
  },

  // Component to render
  component: RouteComponent,

  // Error component
  errorComponent: SignupError,
});

function RouteComponent() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const countries = Route.useLoaderData().countries as { id: number; name: string; iso2: string; phonecode: string }[];
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      country: "",
      phoneNumber: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      // clear any previous errors
      setServerError(null);

      // find the matched country and add it to the payload
      const matchedCountry = countries.find(
        (c) => c.name.toLowerCase() === value.country.toLowerCase()
      );

      // create the payload for the server
      const payload = {
        ...value,
        countryId: matchedCountry?.id,
        iso2: matchedCountry?.iso2,
        phoneNumber: value.phoneNumber.startsWith("0")
          ? `+${matchedCountry?.phonecode}${value.phoneNumber.slice(1)}`
          : `+${matchedCountry?.phonecode}${value.phoneNumber}`,
      };

      // update the onboarding data
      dispatch(setOnboardingData(payload));

      // send the data to the server
      const result = await startUserRegistration({ data: payload });

      // if the request was successful
      if (result.success) {
        // update the onboarding data with the result returned from the register request
        dispatch(updateOnboardingData({ id: result.data.id }));

        // navigate to the verify otp page
        navigate({
          to: APP_URL.auth.securityQuestions,
          search: { flow: "signup" },
        });
      } else {
        // set error
        setServerError(result.error || result.message || "An error occurred during registration");
      }
    },
  });



  // on page load, auto-select the country where the user is browsing from
  useEffect(() => {
    const fetchUserIpCountry = async () => {
      const visitorDetails = await fetchCountryDetailsFromUserIP() // get country from IP
      const country = visitorDetails?.country_name?.toLowerCase() || "nigeria"; // get country name

      // find the matched country
      const matchedCountry = countries.find(
        (c) => c.name.toLowerCase() === country
      );

      // if no matched country, return
      if (!matchedCountry) return;

      // set the country value in the form
      form.setFieldValue("country", matchedCountry.name.toLowerCase());

      // find the select element for countries and set the value to the matched country
      const selectEl = document.querySelector("div.selectElement select");
      if (selectEl && country) {
        (selectEl as HTMLSelectElement).value = country;
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    fetchUserIpCountry()
  }, []);

  return (
    <AuthWrapper type="signup">
      <FormError message={serverError} />
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field
          name="country"
          validators={{
            onChange: ({ value }) => (!value ? "Country is required" : undefined),
          }}
          children={(field) => (
            <div className="selectElement flex flex-col gap-1">
              <Select
                onValueChange={(val) => {
                  field.handleChange(val);
                }}
                defaultValue={field.state.value}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Countries</SelectLabel>
                    {countries.map((country) => (
                      <SelectItem key={country.name} value={country.name.toLowerCase()}>
                        <span className="flex items-center gap-2 capitalize py-1.5 cursor-pointer">
                          <span className="country"><img src={`https://flagcdn.com/w40/${country.iso2.toLowerCase()}.png`} width="23" /></span>
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
          name="phoneNumber"
          validators={{
            onChange: ({ value }) => {
              if (!value) return "Phone number is required";

              const phoneRegex = /^[\d\s-]{10,}$/;
              if (!phoneRegex.test(value)) return "Enter a valid phone number";

              return undefined;
            },
          }}
          children={(field) => (
            <div className="">
              <div className="flex items-center gap-2">
                {/* 
                  Subscribe to the `country` field state. anytime the `countryValue` changes, we display it's phone-code
                  close to the phoneNumber input
                */}
                <form.Subscribe selector={(state) => state.values.country}>
                  {(countryValue) => {
                    const country = countries.find((c) => c.name.toLowerCase() === countryValue);
                    return (
                      <div className="font-semibold tracking-[1px] text-lg">
                        {country ? `+${country.phonecode}` : "+"}
                      </div>
                    );
                  }}
                </form.Subscribe>
                <div className="w-full">
                  <FormInput
                    placeholder="Phone number (whatsapp)"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    maxLength={12}
                    errorMsg={
                      field.state.meta.isTouched && field.state.meta.errors.length
                        ? (field.state.meta.errors[0] as string)
                        : undefined
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-x-2 text-xs text-grey-500 ml-10 mt-2.5">
                <PiWhatsappLogoDuotone className="size-6 text-green-600" />
                We'll send you a code to verify your phone number.
              </div>
            </div>
          )}
        />

        <form.Field
          name="email"
          validators={{
            onChange: ({ value }) => {
              if (!value) return undefined; // Email is optional
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(value)) {
                return "Enter a valid email address";
              }
              return undefined;
            },
          }}
          children={(field) => (
            <FormInput
              type="email"
              placeholder="Email (Optional)"
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
          name="confirmPassword"
          validators={{
            onChange: ({ value, fieldApi }) => {
              if (!value) return "Please confirm your password";
              if (value !== fieldApi.form.getFieldValue("password")) return "Passwords do not match";
              return undefined;
            },
          }}
          children={(field) => (
            <PasswordInput
              placeholder="Confirm Password"
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
            <Button type="submit" variant="secondary" disabled={!canSubmit} loading={isSubmitting}>
              Create account
            </Button>
          )}
        />
      </form>
    </AuthWrapper>
  );
}
