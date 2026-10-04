import { isRedirect } from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route as AuthenticatedRoute } from "../../routes/_authenticated";
import { Route as LoginRoute } from "../../routes/auth/login";
import { Route as OnboardingRoute } from "../../routes/auth/onboarding";

const { checkSession, getUser } = vi.hoisted(() => ({
  checkSession: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("#/lib/server/auth/auth", () => ({
  checkIfRefreshTokenInCookie: checkSession,
  getUserDetailsCookie: getUser,
  logoutUser: vi.fn(),
  loginUser: vi.fn(),
}));
vi.mock("@repo/ui/components/custom/AppSidebar", () => ({ AppSidebarShell: vi.fn() }));
vi.mock("#/redux/hooks", () => ({ useAppDispatch: vi.fn(), useAppSelector: vi.fn() }));
vi.mock("#/redux/slice/siteSlice", () => ({ updateSiteState: vi.fn() }));
vi.mock("#/redux/slice/authSlice", () => ({ updateAuthState: vi.fn() }));
vi.mock("#/redux/store", () => ({ default: {} }));
vi.mock("#/lib/server/countries", () => ({ getAllCountries: vi.fn() }));
vi.mock("#/components/LoadElectionSession", () => ({ default: vi.fn() }));
vi.mock("#/hooks/useUser", () => ({ useUser: vi.fn() }));
vi.mock("#/routes/auth/_components/-onboarding-flow", () => ({
  OnboardingFlow: vi.fn(),
  ONBOARDING_STEPS: ["details", "username", "origin", "location", "referral"],
}));

describe("authentication route redirects", () => {
  const destination = "/applications?status=active#results";
  const user = { username: "some_user", roles: ["admin"], party: { short_name: "apc" } };

  beforeEach(() => {
    checkSession.mockReset();
    getUser.mockReset();
    getUser.mockResolvedValue(user);
  });

  async function runGuard() {
    return AuthenticatedRoute.options.beforeLoad!({
      context: { userDetails: user },
      location: { href: destination },
    } as never);
  }

  async function runLogin(search: { redirect?: string } = {}) {
    return LoginRoute.options.beforeLoad!({ search } as never);
  }

  it("carries the complete intended URL to login when logged out", async () => {
    checkSession.mockResolvedValue({ success: false });

    const result = await runGuard().catch((error: unknown) => error);

    if (!isRedirect(result)) throw new Error("Expected a login redirect");
    expect(result.options.to).toBe("/auth/login");
    expect(result.options.search).toEqual({ redirect: destination });
  });

  it("allows authorized users to load the protected route", async () => {
    checkSession.mockResolvedValue({ success: true });

    await expect(runGuard()).resolves.toBeUndefined();
  });

  it("validates the return URL on the login route", () => {
    const validateSearch = LoginRoute.options.validateSearch;
    if (typeof validateSearch !== "function") throw new Error("Expected a search validator");
    expect(validateSearch({ redirect: destination })).toEqual({
      redirect: destination,
    });
    expect(validateSearch({ redirect: "//example.com" })).toEqual({
      redirect: undefined,
    });
  });

  it("lets logged-out users remain on the login page", async () => {
    checkSession.mockResolvedValue({ success: false });

    await expect(runLogin({ redirect: destination })).resolves.toBeUndefined();
  });

  it("sends already authenticated users to the full intended URL", async () => {
    checkSession.mockResolvedValue({ success: true });

    const result = await runLogin({ redirect: destination }).catch((error: unknown) => error);

    if (!isRedirect(result)) throw new Error("Expected a destination redirect");
    expect(result.options.href).toBe(destination);
    expect(result.options.replace).toBe(true);
  });

  it("uses the home page when no return URL was supplied", async () => {
    checkSession.mockResolvedValue({ success: true });

    const result = await runLogin().catch((error: unknown) => error);

    if (!isRedirect(result)) throw new Error("Expected a home redirect");
    expect(result.options.href).toBe("/");
    expect(result.options.replace).toBe(true);
  });

  it("preserves the destination when onboarding is required", async () => {
    checkSession.mockResolvedValue({ success: true });

    const result = await Promise.resolve(AuthenticatedRoute.options.beforeLoad!({
      context: { userDetails: {} },
      location: { href: destination },
    } as never)).catch((error: unknown) => error);

    if (!isRedirect(result)) throw new Error("Expected an onboarding redirect");
    expect(result.options.to).toBe("/auth/onboarding");
    expect(result.options.search).toEqual({ step: "details", redirect: destination });
  });

  it("validates the destination together with the onboarding step", () => {
    const validateSearch = OnboardingRoute.options.validateSearch;
    if (typeof validateSearch !== "function") throw new Error("Expected a search validator");
    expect(validateSearch({
      step: "location",
      redirect: destination,
    })).toEqual({ step: "location", redirect: destination });
  });

  it("retains the original destination when the onboarding session expires", async () => {
    checkSession.mockResolvedValue({ success: false });

    const result = await Promise.resolve(OnboardingRoute.options.beforeLoad!({
      context: { userDetails: {} },
      search: { step: "location", redirect: destination },
      location: { href: "/auth/onboarding?step=location" },
    } as never)).catch((error: unknown) => error);

    if (!isRedirect(result)) throw new Error("Expected a login redirect");
    expect(result.options.to).toBe("/auth/login");
    expect(result.options.search).toEqual({ redirect: destination });
  });

  it("sends completed accounts from onboarding to their intended destination", async () => {
    checkSession.mockResolvedValue({ success: true });

    const result = await Promise.resolve(OnboardingRoute.options.beforeLoad!({
      context: { userDetails: user },
      search: { step: "location", redirect: destination },
    } as never)).catch((error: unknown) => error);

    if (!isRedirect(result)) throw new Error("Expected a destination redirect");
    expect(result.options.href).toBe(destination);
    expect(result.options.replace).toBe(true);
  });
});
