import { useState, useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { Button } from "@repo/ui/components/button";
import { FormInput, PasswordInput } from "@repo/ui/components/input";
import { SelectCountry } from "@repo/ui/components/selects/country-select";
import { useAppDispatch, useAppSelector } from "#/redux/hooks";
import { updateAuthState } from "#/redux/slice/authSlice";
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
    if (isAuthed.success) {
      throw redirect({ to: APP_URL.home });
    }
  },
  head: () =>
    getPageHeader({
      title: "Log in",
      description: "Log in to your Free9ja Elections account",
    }),

  component: LoginComponent,

  errorComponent: ({ error }) => (
    <div className="p-4 text-destructive">{`${error?.message}, Also check if the backend server is up and running`}</div>
  ),
});

function LoginComponent() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const visitorDetails = useAppSelector((state) => state.site.visitorDetails);
  const visitorCountry = visitorDetails?.location?.country?.toLowerCase();

  const { data: countriesRes } = useQuery({
    queryKey: ["countries"],
    queryFn: () => getAllCountries() as Promise<countriesType>,
    staleTime: Infinity,
  });

  const countries = (countriesRes?.success ? countriesRes.data.countries : []) as { id: number; name: string; iso2: string; phonecode: string }[];

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (response) => {
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

      loginMutation.mutate({ data: payload });
    },
  });

  // auto-select the country where the user is browsing from once visitorCountry is available
  useEffect(() => {
    if (!visitorCountry) return;

    const timeoutId = setTimeout(() => {
      const matchedCountry = countries.find(
        (c) => c.name.toLowerCase() === visitorCountry,
      );

      if (!matchedCountry) return;

      form.setFieldValue("country", matchedCountry.name.toLowerCase());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [visitorCountry, countries, form]);

  return (
    <AuthWrapper type="login">
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
            <SelectCountry
              selectedId={field.state.value}
              update={(country) => {
                field.handleChange(country.name.toLowerCase());
              }}
              errorMsg={field.state.meta.errors?.[0]}
              fetchCountries={async () => getAllCountries()}
            />
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
              errorMsg={field.state.meta.errors?.[0]}
            />
          )}
        />

        <form.Field
          name="password"
          validators={{
            onChange: ({ value }) => {
              if (!value) return "Password is required";
              if (value.length < 5)
                return "Password must be at least 5 characters";
              return undefined;
            },
          }}
          children={(field) => (
            <PasswordInput
              placeholder="Password"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              errorMsg={field.state.meta.errors?.[0]}
            />
          )}
        />

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              size="2xl"
              variant="secondary"
              disabled={!canSubmit || loginMutation.isPending}
              loading={isSubmitting || loginMutation.isPending}
              className="mt-2"
            >
              Log in
            </Button>
          )}
        />
      </form>
    </AuthWrapper>
  );
}
