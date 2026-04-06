import { Button } from "@repo/ui/components/button";
import { FormInput, PasswordInput } from "@repo/ui/components/input";
import { createFileRoute } from "@tanstack/react-router";
import { AuthWrapper } from "./_components/-auth-wrapper";
import { useForm } from "@tanstack/react-form";

export const Route = createFileRoute("/auth/signup")({
  component: RouteComponent,
});

function RouteComponent() {
  const form = useForm({
    defaultValues: {
      identifier: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      console.log(value);
    },
  });

  return (
    <AuthWrapper type="signup">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field
          name="identifier"
          validators={{
            onChange: ({ value }) => {
              if (!value) return "Email or phone number is required";

              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              const phoneRegex = /^\+?[\d\s-]{10,}$/; // Basic phone regex

              if (!emailRegex.test(value) && !phoneRegex.test(value)) {
                return "Enter a valid email or phone number";
              }
              return undefined;
            },
          }}
          children={(field) => (
            <FormInput
              placeholder="Email or phone number"
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
                : value.length < 8
                  ? "Password must be at least 8 characters"
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
              if (value !== fieldApi.form.getFieldValue("password")) {
                return "Passwords do not match";
              }
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
            <Button type="submit" disabled={!canSubmit} loading={isSubmitting}>
              Create account
            </Button>
          )}
        />
      </form>
    </AuthWrapper>
  );
}
