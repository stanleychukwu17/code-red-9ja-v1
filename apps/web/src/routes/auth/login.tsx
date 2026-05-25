import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";

import { Button } from "@repo/ui/components/button";
import { FormInput, PasswordInput } from "@repo/ui/components/input";
import { AuthWrapper } from "./_components/-auth-wrapper";
import { useAppDispatch } from "#/redux/hooks";
import { updateAuthState } from "#/redux/slice/authSlice";
import { loginUser, checkIfRefreshTokenInCookie } from "#/lib/server/auth";
import { FormError } from "./_components/-form-error";
import { getPageHeader } from "@/lib/shared/meta";
import { APP_URL } from "#/lib/config";

export const Route = createFileRoute("/auth/login")({
  // Check if user is already authenticated, if so redirect to home page
  beforeLoad: async () => {
    const response = await checkIfRefreshTokenInCookie({});
    const isAuthed = (response.status === "success") ? true : false

    // if the user is authenticated and the server is up and running, redirect to home page
    if (isAuthed) {
      // throw redirect({ to: APP_URL.homePage });
    }
  },

  // Set page meta
  head: () => getPageHeader({
    title: "Log in to your account",
    description: "Log in to your Free9ja account to access your dashboard and manage your profile",
  }),

  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      identifier: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setErrorMsg(null);

      try {
        const response = await loginUser({ data: value });

        if (response.status === "success") {
          dispatch(
            updateAuthState({user: response.user})
          );

          // login successful, redirect user to dashboard
          // navigate({ to: APP_URL.homePage });
        } else {
          // login failed, show error message
          setErrorMsg(response.message || "Login failed. Please check your credentials.");
        }
      } catch (error) {
        setErrorMsg(`Connection error: ${error}`);
      }
    },
  });

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
        <FormError message={errorMsg} />
        <form.Field
          name="identifier"
          validators={{
            onChange: ({ value }) => (!value ? "Identifier is required" : undefined),
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
            <Button type="submit" variant="secondary" disabled={!canSubmit} loading={isSubmitting}>
              Log in
            </Button>
          )}
        />
      </form>
    </AuthWrapper>
  );
}
