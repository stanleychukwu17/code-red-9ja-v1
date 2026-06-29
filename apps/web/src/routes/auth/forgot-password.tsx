import { useEffect, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";

import { Button } from "@repo/ui/components/button";
import { FormInput } from "@repo/ui/components/input";

import { AuthWrapper } from "./_components/-auth-wrapper";
import { FormError } from "./_components/-form-error";
import { getPageHeader } from "@/lib/shared/meta";
import { checkIfRefreshTokenInCookie, resetPassword } from "@/lib/server/auth/auth";
import { APP_URL } from "@/lib/config";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateOnboardingData } from "#/redux/slice/authSlice";

export const Route = createFileRoute('/auth/forgot-password')({
  // Check if user is already authenticated, if so redirect to home page
  beforeLoad: async () => {
    const isAuthed = await checkIfRefreshTokenInCookie({});
    if (isAuthed.success) {
      throw redirect({ to: APP_URL.home });
    }
  },

  // Page metadata
  head: () => getPageHeader({ title: "Reset your password", robotsAllowed: "no" }),

  // Component to render
  component: RouteComponent,

})

function RouteComponent() {
  const [serverError, setServerError] = useState<string | null>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { changePasswordId, changeUserFid } = useAppSelector((state) => state.auth.onboardingData || { changePasswordId: "", changeUserFid: "" });

  useEffect(() => {
    if (!changePasswordId || !changeUserFid) {
      navigate({ to: APP_URL.auth.securityQuestions, search: { flow: "forgot-password" } });
    }
  }, [changePasswordId, changeUserFid, navigate]);

  const form = useForm({
    defaultValues: {
      password: "",
      password2: "",
    },
    onSubmit: async ({ value }) => {
      // clear any previous errors
      setServerError(null);

      if (value.password !== value.password2) {
        setServerError("Passwords do not match");
        return;
      }

      if (!changePasswordId || !changeUserFid) {
        setServerError("Missing verification token. Please try again.");
        return;
      }

      const res = await resetPassword({
        data: {
          password: value.password,
          confirmPassword: value.password2,
          change_password_id: changePasswordId,
          user_fid: changeUserFid,
        }
      });

      if (!res.success) {
        setServerError(res.message || "Failed to reset password");
        return;
      }

      // Dispatch to show that password has been changed successfully
      dispatch(
        updateOnboardingData({
          passwordChangeCompleted: true,
          passwordChangeCompletedAt: new Date().toISOString(),
        })
      );

      navigate({ to: APP_URL.auth.login });
    },
  });

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
          name="password"
          validators={{
            onChange: ({ value }) => (!value ? "password is required" : undefined),
          }}
          children={(field) => (
            <div className="">
              <div className="w-full">
                <FormInput
                  placeholder="Password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  maxLength={80}
                  onChange={(e) => field.handleChange(e.target.value)}
                  errorMsg={
                    field.state.meta.isTouched && field.state.meta.errors.length
                      ? (field.state.meta.errors[0] as string)
                      : undefined
                  }
                />
              </div>
            </div>
          )}
        />

        <form.Field
          name="password2"
          validators={{
            onChange: ({ value }) => {
              if (!value) return "Password is required";
              if (value.length < 5) return "Password must be at least 5 characters long";

              // const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{5,}$/;
              // if (!passwordRegex.test(value)) return "Password must be at least 5 characters long and contain at least one uppercase letter, one lowercase letter, one number and one special character";

              return undefined;
            },
          }}
          children={(field) => (
            <div className="">
              <div className="w-full">
                <FormInput
                  placeholder="Confirm Password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  maxLength={80}
                  errorMsg={
                    field.state.meta.isTouched && field.state.meta.errors.length
                      ? (field.state.meta.errors[0] as string)
                      : undefined
                  }
                />
              </div>
            </div>
          )}
        />

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button type="submit" variant="secondary" disabled={!canSubmit} loading={isSubmitting}>
              Change password
            </Button>
          )}
        />
      </form>
    </AuthWrapper>
  );
}
