import { useEffect, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { PiWhatsappLogoDuotone } from "react-icons/pi";


import { Button } from "@repo/ui/components/button";
import { FormInput } from "@repo/ui/components/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@repo/ui/components/select";

import { AuthWrapper } from "./_components/-auth-wrapper";
// import { SignupError } from "./_components/-signup-error";
import { FormError } from "./_components/-form-error";
import { getAllCountries } from "@/lib/server/countries";
import { getPageHeader } from "@/lib/shared/meta";
import { fetchCountryDetailsFromUserIP } from "@/lib/client/ip";
import { checkIfRefreshTokenInCookie } from "@/lib/server/auth";
import { APP_URL } from "@/lib/config";

export const Route = createFileRoute('/auth/forgot-password')({
  // Check if user is already authenticated, if so redirect to home page
  beforeLoad: async () => {
    const response = await checkIfRefreshTokenInCookie({});
    const isAuthed = (response.status === "success") ? true : false
    if (isAuthed) {
      throw redirect({ to: APP_URL.homePage });
    }
  },

  // Page metadata
  head: () => getPageHeader({ title: "Forgot your password", robotsAllowed: "no" }),

  // Load countries data
  loader: async () => {
    const countries = await getAllCountries();
    if (countries.status !== 'success') throw new Error(countries.error);
    return { countries: countries.countries };
  },

  // Component to render
  component: RouteComponent,

  // Error component
  // errorComponent: SignupError,

})

function RouteComponent() {
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

      console.log(matchedCountry)
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
    <AuthWrapper type="forgot-password">
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

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button type="submit" variant="secondary" disabled={!canSubmit} loading={isSubmitting}>
              Next
            </Button>
          )}
        />
      </form>
    </AuthWrapper>
  );
}
