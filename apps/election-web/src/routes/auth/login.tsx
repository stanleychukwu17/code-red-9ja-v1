import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import LogoIcon from "@repo/ui/icons/logo-icon";
import { Button } from "@repo/ui/components/button";
import { FormInput, PasswordInput } from "@repo/ui/components/input";
import { SelectCountry } from "@repo/ui/components/selects/country-select";
import { useAppDispatch, useAppSelector } from "#/redux/hooks";
import { updateAuthState } from "#/redux/slice/authSlice";
import store from "#/redux/store";
import { updateCountryState } from "#/redux/slice/countrySlice";
import { loginUser, checkIfRefreshTokenInCookie } from "#/lib/server/auth/auth";
import { getPageHeader } from "@/lib/shared/meta";
import { getAllCountries } from "#/lib/server/countries";
import { APP_URL } from "#/lib/config";
import { AuthWrapper } from "./_components/-auth-wrapper";

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
  countryId?: number;
  identifier: string;
  password: string;
  identifierType?: string;
  iso2?: string;
};

export const Route = createFileRoute("/auth/login")({
  beforeLoad: async () => {
    const isAuthed = await checkIfRefreshTokenInCookie();
    if (isAuthed.status === "success") {
      throw redirect({ to: APP_URL.home });
    }
  },
  head: () =>
    getPageHeader({
      title: "Log in - Free9ja Elections",
      description: "Log in to your Free9ja Elections account",
    }),
  loader: async () => {
    if (typeof window !== "undefined") {
      const state = store.getState();
      if (state.country.countries && state.country.countries.length > 0) {
        return { countries: state.country.countries };
      }
    }

    const countries = (await getAllCountries()) as countriesType;
    if (!countries.success) {
      throw new Error(countries.message || "Failed to load countries");
    }

    if (typeof window !== "undefined") {
      store.dispatch(
        updateCountryState({ countries: countries.data.countries }),
      );
    }

    return { countries: countries.data.countries };
  },
  component: LoginComponent,
  errorComponent: ({ error }) => (
    <div className="p-4 text-destructive">{`${error?.message}, Also check if the backend server is up and running`}</div>
  ),
});

function LoginComponent() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const countries = Route.useLoaderData().countries;
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const visitorDetails = useAppSelector((state) => state.site.visitorDetails);
  const visitorCountry = visitorDetails?.location?.country?.toLowerCase();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm({
    mode: "onChange",
    defaultValues: {
      country: "",
      identifier: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (response) => {
      console.log(response);
      if (response.success) {
        dispatch(updateAuthState({ user: response.data?.user }));
        navigate({ to: "/" });
      } else {
        setErrorMsg(response.message || "Invalid email or password.");
      }
    },
    onError: () => {
      setErrorMsg("Connection error: Unable to reach the server.");
    },
  });

  const onSubmit = (value: any) => {
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

    const matchedCountry = countries.find(
      (c) => c.name.toLowerCase() === value.country.toLowerCase(),
    );
    if (matchedCountry) {
      payload.countryId = matchedCountry.id;
      payload.iso2 = matchedCountry.iso2;
    }

    // if identifier looks like a phone number, format it with country code
    const phoneRegex = /^[\d\s-]+$/;
    if (identifierType === "phone" && phoneRegex.test(payload.identifier)) {
      if (matchedCountry) {
        payload.identifier = payload.identifier.startsWith("0")
          ? `+${matchedCountry.phonecode}${payload.identifier.slice(1)}`
          : `+${matchedCountry.phonecode}${payload.identifier}`;
      }
    }

    // add the identifier type to the payload
    payload.identifierType = identifierType;

    console.log({ payload });
    loginMutation.mutate({ data: payload });
  };

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
      setValue("country", matchedCountry.name.toLowerCase(), {
        shouldValidate: true,
        shouldDirty: true,
      });

      // find the select element for countries and set the value to the matched country
      const selectEl = document.querySelector("div.selectElement select");
      if (selectEl) {
        (selectEl as HTMLSelectElement).value = visitorCountry;
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [visitorCountry, countries, setValue]);

  return (
    <AuthWrapper type="login">
      {errorMsg && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-100 text-[14px] text-red-600 font-medium">
          {errorMsg}
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Controller
          name="country"
          control={control}
          rules={{ required: "Country is required" }}
          render={({ field }) => (
            <SelectCountry
              selectedId={field.value}
              update={(country) => {
                field.onChange(country.name.toLowerCase());
              }}
              errorMsg={errors.country?.message as string | undefined}
              fetchCountries={async () => getAllCountries()}
            />
          )}
        />

        <Controller
          name="identifier"
          control={control}
          rules={{ required: "Identifier is required" }}
          render={({ field }) => (
            <FormInput
              type="text"
              placeholder="Email or Username or Phone number"
              value={field.value}
              onBlur={field.onBlur}
              onChange={(e) => field.onChange(e.target.value)}
              errorMsg={errors.identifier?.message as string | undefined}
            />
          )}
        />

        <Controller
          name="password"
          control={control}
          rules={{
            required: "Password is required",
            minLength: {
              value: 5,
              message: "Password must be at least 5 characters",
            },
          }}
          render={({ field }) => (
            <PasswordInput
              placeholder="Password"
              value={field.value}
              onBlur={field.onBlur}
              onChange={(e) => field.onChange(e.target.value)}
              errorMsg={errors.password?.message as string | undefined}
            />
          )}
        />

        <Button
          type="submit"
          size="2xl"
          variant="secondary"
          disabled={!isValid}
          loading={isSubmitting || loginMutation.isPending}
          className="mt-2"
        >
          Log in
        </Button>
      </form>
    </AuthWrapper>
  );
}
