import { useState, useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import LogoIcon from "@repo/ui/icons/logo-icon";
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
import { useAppDispatch, useAppSelector } from "#/redux/hooks";
import { updateAuthState } from "#/redux/slice/authSlice";
import {
  loginAdmin,
  refreshUserToken,
} from "#/lib/server/auth/auth";
import { getPageHeader } from "@/lib/shared/meta";
import { getAllCountries } from "#/lib/server/countries";

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
}

export const Route = createFileRoute("/auth/login")({
  beforeLoad: async () => {
    const res = await refreshUserToken();
    if (res.status === "success" && res.user?.role === "admin") {
      throw redirect({ to: "/home" });
    }
  },
  head: () =>
    getPageHeader({
      title: "Log in",
      description: "Log in to your Free9ja Admin account",
    }),
  loader: async () => {
    const countries = await getAllCountries() as countriesType;
    if (!countries.success) throw new Error(countries.message || "Failed to load countries");
    return { countries: countries.data.countries };
  },
  component: LoginComponent,
  errorComponent: ({ error }) => (
    <div className="p-4 text-red-600">{`${error?.message}, Also check if the backend server is up and running`}</div>
  ),
});

function LoginComponent() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const countries = Route.useLoaderData().countries;
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const visitorDetails = useAppSelector((state) => state.site.visitorDetails);
  const visitorCountry = visitorDetails?.location?.country?.toLowerCase();

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
        identifier: value.identifier.trim().toLowerCase()
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
        const response = await loginAdmin({ data: payload });

        if (response.success) {
          dispatch(updateAuthState({ user: response.data?.user }));
          navigate({ to: "/home" });
        } else {
          setErrorMsg(response.message || "Invalid email or password.");
        }
      } catch (err) {
        setErrorMsg("Connection error: Unable to reach the server.");
      }
    },
  });

  // auto-select the country where the user is browsing from once visitorCountry is available
  useEffect(() => {
    if (!visitorCountry) return;

    const timeoutId = setTimeout(() => {
      // find the matched country
      const matchedCountry = countries.find(
        (c) => c.name.toLowerCase() === visitorCountry
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

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between p-8 md:p-12">
      {/* Top Header Logo */}
      <div className="flex items-center gap-2 text-[#234f3e]">
        <LogoIcon className="size-8 shrink-0" />
        <span className="text-[24px] font-semibold tracking-[-0.04em]">
          Free9ja.
        </span>
      </div>

      {/* Center Form */}
      <div className="mx-auto w-full max-w-[420px] flex flex-col justify-center py-12">
        <h1 className="text-[28px] font-bold text-[#181818] mb-1">Log in</h1>
        <p className="text-[15px] text-[#767676] mb-6">Log in to Admin Dashboard</p>

        {errorMsg && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-100 text-[14px] text-red-600 font-medium">
            {errorMsg}
          </div>
        )}

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
                                alt=""
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

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                variant="secondary"
                disabled={!canSubmit}
                loading={isSubmitting}
                className="mt-2"
              >
                Log in
              </Button>
            )}
          />
        </form>
      </div>

      <div />
    </div>
  );
}
