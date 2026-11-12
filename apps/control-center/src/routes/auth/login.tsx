/**
 * @file Control Center Authentication Login Page
 * @description Secure login portal for authorized party situation room operators, election directors, and administrators.
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate, redirect, useRouter } from "@tanstack/react-router";
import { Radio } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { FormInput, PasswordInput } from "@repo/ui/components/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { useAppDispatch, useAppSelector } from "#/redux/hooks";
import { updateAuthState } from "#/redux/slice/authSlice";

import { APP_URL } from "#/lib/config";
import { getAuthRedirect } from "#/lib/shared/auth-redirect";
import { loginPartyApp, checkIfRefreshTokenInCookie, getUserDetailsCookie } from "#/lib/server/auth/auth";
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
};

export const Route = createFileRoute("/auth/login")({
  validateSearch: (search): { redirect?: string } => ({
    redirect: getAuthRedirect(search.redirect),
  }),

  beforeLoad: async ({ search }) => {
    const isAuthed = await checkIfRefreshTokenInCookie();
    if (isAuthed.success) {
      if (search.redirect) {
        throw redirect({ href: search.redirect, replace: true });
      }
      const userDetails = await getUserDetailsCookie();
      const partyShortName = userDetails?.party?.short_name;
      if (partyShortName) {
        throw redirect({
          to: APP_URL.controlCenter.home(partyShortName),
          replace: true,
        });
      }
      throw redirect({
        to: APP_URL.parties,
        replace: true,
      });
    }
  },

  head: () =>
    getPageHeader({
      title: "Situation Room Login | Free9ja Control Center",
      description: "Log in to the Party Situation Room and Collation Control Center",
    }),

  component: LoginComponent,
  errorComponent: ({ error }) => (
    <div className="p-4 text-destructive">{`${error?.message}, Also check if the backend server is up and running`}</div>
  ),
});

function LoginComponent() {
  const navigate = useNavigate();
  const { redirect: returnTo } = Route.useSearch();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: countriesRes } = useQuery({
    queryKey: ["countries"],
    queryFn: () => getAllCountries() as Promise<countriesType>,
    staleTime: Infinity,
  });
  const countries = (
    countriesRes?.success ? countriesRes.data.countries : []
  ) as { id: number; name: string; iso2: string; phonecode: string }[];
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
        identifier: value.identifier.trim().toLowerCase(),
      };

      const emailRegex = /^[\w\d._%+-]+@[\w\d.-]+\.\w{2,}$/;
      const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{1,28}[a-zA-Z0-9]$/;
      let identifierType = "phone";
      if (emailRegex.test(payload.identifier)) {
        identifierType = "email";
      } else if (usernameRegex.test(payload.identifier)) {
        identifierType = "username";
      }

      const phoneRegex = /^[\d\s-]+$/;
      if (identifierType === "phone" && phoneRegex.test(payload.identifier)) {
        const matchedCountry = countries.find(
          (c) => c.name.toLowerCase() === value.country.toLowerCase(),
        );
        if (matchedCountry) {
          payload.identifier = payload.identifier.replace(/^0+/, "");
          payload.iso2 = matchedCountry.iso2.toLowerCase();
        }
      }

      payload.identifierType = identifierType;
      loginMutation.mutate(payload);
    },
  });

  const loginMutation = useMutation({
    mutationFn: (data: payloadType) => loginPartyApp({ data }),
    onSuccess: async (data) => {
      if (!data?.success) {
        setErrorMsg(data?.message || "Invalid credentials. Please try again.");
        return;
      }

      if (data?.data?.user) {
        dispatch(updateAuthState({ user: data.data.user }));
      }

      await router.invalidate();

      if (returnTo) {
        window.location.href = returnTo;
        return;
      }

      const userDetails = await getUserDetailsCookie();
      const partyShortName = userDetails?.party?.short_name;

      if (partyShortName) {
        navigate({
          to: APP_URL.controlCenter.home(partyShortName),
          replace: true,
        });
      } else {
        navigate({
          to: APP_URL.parties,
          replace: true,
        });
      }
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || "Authentication failed.");
    },
  });

  useEffect(() => {
    if (countries.length > 0 && !form.getFieldValue("country")) {
      const match =
        countries.find((c) => c.name.toLowerCase() === visitorCountry) ||
        countries.find((c) => c.name.toLowerCase() === "nigeria");
      if (match) {
        form.setFieldValue("country", match.name.toLowerCase());
      }
    }
  }, [countries, visitorCountry, form]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between items-center px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Radio className="size-5 animate-pulse" />
        </div>
        <div>
          <span className="font-bold text-lg text-white">Free9ja</span>
          <span className="text-[11px] text-emerald-400 font-semibold uppercase block tracking-wider">
            Control Center &bull; Situation Room
          </span>
        </div>
      </div>

      {/* Main card */}
      <div className="w-full max-w-[420px] bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="text-2xl font-bold text-white mb-1">Situation Room Access</h1>
        <p className="text-xs text-neutral-400 mb-6">
          Authorized party leadership, election directors &amp; collation coordinators only.
        </p>

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 font-medium">
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
                  <SelectTrigger className="w-full bg-neutral-800/80 border-neutral-700 text-white">
                    <SelectValue placeholder="Select Country" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-neutral-700 text-white">
                    <SelectGroup>
                      <SelectLabel>Countries</SelectLabel>
                      {countries.map((country) => (
                        <SelectItem key={country.name} value={country.name.toLowerCase()}>
                          <span className="flex items-center gap-2 capitalize py-1 cursor-pointer">
                            <img
                              src={`https://flagcdn.com/w40/${country.iso2.toLowerCase()}.png`}
                              width="20"
                              alt=""
                            />
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
              onChange: ({ value }) => (!value ? "Identifier is required" : undefined),
            }}
            children={(field) => (
              <FormInput
                type="text"
                className="bg-neutral-800/80 border-neutral-700 text-white placeholder:text-neutral-500 rounded-xl"
                placeholder="Email, Username or Phone number"
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
                className="bg-neutral-800/80 border-neutral-700 text-white placeholder:text-neutral-500 rounded-xl"
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
                variant="default"
                disabled={!canSubmit || isSubmitting}
                loading={isSubmitting}
                className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl mt-2 py-3"
              >
                Authenticate &amp; Enter Situation Room
              </Button>
            )}
          />
        </form>
      </div>

      <div className="text-center text-xs text-neutral-500">
        Free9ja Real-Time Situation Room &bull; Encrypted Session
      </div>
    </div>
  );
}
