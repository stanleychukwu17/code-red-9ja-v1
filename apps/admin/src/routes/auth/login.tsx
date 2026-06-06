import * as React from "react";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import LogoIcon from "@repo/ui/icons/logo-icon";
import { useAppDispatch } from "#/redux/hooks";
import { updateAuthState } from "#/redux/slice/authSlice";
import { loginUser, checkIfRefreshTokenInCookie } from "#/lib/server/auth/auth";
import { getPageHeader } from "@/lib/shared/meta";

export const Route = createFileRoute("/auth/login")({
  beforeLoad: async () => {
    const isAuthed = await checkIfRefreshTokenInCookie({});
    if (isAuthed.status === "success") {
      throw redirect({ to: "/home" });
    }
  },
  head: () => getPageHeader({
    title: "Log in - Free9ja Admin",
    description: "Log in to your Free9ja Admin account",
  }),
  component: LoginComponent,
});

function LoginComponent() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;

    setErrorMsg(null);
    setIsSubmitting(true);

    const emailRegex = /^[\w\d._%+-]+@[\w\d.-]+\.\w{2,}$/;
    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{1,28}[a-zA-Z0-9]$/;
    let identifierType = "phone";
    if (emailRegex.test(identifier)) {
      identifierType = "email";
    } else if (usernameRegex.test(identifier)) {
      identifierType = "username";
    }

    try {
      const response = await loginUser({
        data: {
          identifier,
          password,
          identifierType,
        },
      });

      if (response.status === "success") {
        dispatch(updateAuthState({ user: response.user }));
        navigate({ to: "/home" });
      } else {
        setErrorMsg(response.message || "Invalid identifier or password.");
      }
    } catch (err) {
      setErrorMsg("Connection error: Unable to reach the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between p-8 md:p-12">
      {/* Top Header Logo */}
      <div className="flex items-center gap-2 text-[#234f3e]">
        <LogoIcon className="size-8 shrink-0" />
        <span className="text-[24px] font-semibold tracking-[-0.04em]">Free9ja.</span>
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <input
              type="text"
              placeholder="Email or Phone number"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full h-14 px-4 bg-[#ececef] rounded-[16px] border border-transparent text-[16px] text-[#181818] outline-none focus:border-[#00cf79] focus:bg-white transition-all"
              required
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 px-4 bg-[#ececef] rounded-[16px] border border-transparent text-[16px] text-[#181818] outline-none focus:border-[#00cf79] focus:bg-white transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !identifier || !password}
            className="w-full h-14 bg-[#00cf79] hover:bg-[#00b568] disabled:bg-[#a3f3cf] disabled:cursor-not-allowed text-white text-[16px] font-bold rounded-full transition-all mt-2 cursor-pointer flex items-center justify-center"
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>
        </form>
      </div>

      {/* Footer spacing */}
      <div />
    </div>
  );
}
