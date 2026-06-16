import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  createFileRoute,
  useNavigate,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import LogoIcon from "@repo/ui/icons/logo-icon";
import { Button } from "@repo/ui/components/button";
import { FormInput, PasswordInput } from "@repo/ui/components/input";
import { useAppDispatch } from "#/redux/hooks";
import { updateAuthState } from "#/redux/slice/authSlice";
import {
  loginPartyApp,
  checkIfRefreshTokenInCookie,
  getUserDetailsCookie,
} from "#/lib/server/auth/auth";
import { getPageHeader } from "@/lib/shared/meta";

export const Route = createFileRoute("/auth/login")({
  beforeLoad: async () => {
    const isAuthed = await checkIfRefreshTokenInCookie({});
    if (isAuthed.status === "success") {
      const userDetails = await getUserDetailsCookie();
      const partyShortName = userDetails?.party?.short_name || "ndp";
      throw redirect({
        to: "/$partyShortName/home",
        params: { partyShortName },
      });
    }
  },
  head: () =>
    getPageHeader({
      title: "Log in - Free9ja Admin",
      description: "Log in to your Free9ja Admin account",
    }),
  component: LoginComponent,
});

function LoginComponent() {
  const navigate = useNavigate();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setErrorMsg(null);

      try {
        const response = await loginPartyApp({ data: value });
        console.log("Response:", response);

        if (response.success) {
          console.log(1);
          dispatch(updateAuthState({ user: response.data.user }));
          console.log(2);
          const partyShortName = response.data.user?.party?.short_name;
          console.log(3, partyShortName);
          await router.invalidate();
          console.log(4);
          navigate({ to: "/$partyShortName/home", params: { partyShortName } });
          console.log(5);
        } else {
          setErrorMsg(response.message || "Invalid email or password.");
        }
      } catch (err) {
        setErrorMsg("Connection error: Unable to reach the server.");
      }
    },
  });

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
        <p className="text-[15px] text-[#767676] mb-6">Make your vote count</p>

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
            name="email"
            validators={{
              onChange: ({ value }) =>
                !value
                  ? "Email is required"
                  : !/^[\w\d._%+-]+@[\w\d.-]+\.\w{2,}$/.test(value)
                    ? "Invalid email format"
                    : undefined,
            }}
            children={(field) => (
              <FormInput
                type="text"
                placeholder="Email address"
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

      {/* Footer spacing */}
      <div />
    </div>
  );
}
