import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthWrapper } from "./_components/-auth-wrapper";
import { useForm } from "@tanstack/react-form";

import { Button } from "@repo/ui/components/button";
import { FormInput, PasswordInput } from "@repo/ui/components/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({
    meta: [{ title: `Sign up: Join the movement - ${APP_NAME}` }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      country: "",
      phoneNumber: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      console.log(value);
      navigate({
        to: "/auth/verify-otp",
        search: { flow: "signup" },
      });
    },
  });

  const countries = [
    { name: "Nigeria", iso2: "NG" },
    { name: "United States", iso2: "US" },
    { name: "United Kingdom", iso2: "GB" },
    { name: "Canada", iso2: "CA" },
    { name: "Ghana", iso2: "GH" },
    { name: "Kenya", iso2: "KE" },
    { name: "South Africa", iso2: "ZA" },
    { name: "India", iso2: "IN" },
    { name: "Germany", iso2: "DE" },
    { name: "France", iso2: "FR" },
  ];

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
          name="country"
          validators={{
            onChange: ({ value }) => (!value ? "Country is required" : undefined),
          }}
          children={(field) => (
            <div className="selectElement flex flex-col gap-1">
              <Select onValueChange={field.handleChange} defaultValue={field.state.value}>
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
              const phoneRegex = /^\+?[\d\s-]{10,}$/;
              if (!phoneRegex.test(value)) {
                return "Enter a valid phone number";
              }
              return undefined;
            },
          }}
          children={(field) => (
            <div className="">
              <div className="text-sm text-grey-500 mb-1.5">
                We'll send you a code to verify your phone number.
              </div>
              <div className="amde">
                <div className="">+234</div>
                <div className="">
                  <FormInput
                    placeholder="Phone number"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    errorMsg={
                      field.state.meta.isTouched && field.state.meta.errors.length
                        ? (field.state.meta.errors[0] as string)
                        : undefined
                    }
                  />
                </div>
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
            <Button type="submit" variant="secondary" disabled={!canSubmit} loading={isSubmitting}>
              Create account
            </Button>
          )}
        />
      </form>
    </AuthWrapper>
  );
}
