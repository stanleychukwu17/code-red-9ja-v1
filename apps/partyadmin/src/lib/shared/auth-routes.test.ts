import { isRedirect } from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route as AuthenticatedRoute } from "../../routes/_authenticated";
import { Route as LoginRoute } from "../../routes/auth/login";
import { Route as PartyRoute } from "../../routes/_authenticated/$partyShortName";

const { checkSession, getUser } = vi.hoisted(() => ({
  checkSession: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("#/lib/server/auth/auth", () => ({
  checkIfRefreshTokenInCookie: checkSession,
  getUserDetailsCookie: getUser,
  logoutUser: vi.fn(),
  loginPartyApp: vi.fn(),
}));
vi.mock("@repo/ui/components/custom/AppSidebar", () => ({ AppSidebarShell: vi.fn() }));
vi.mock("#/redux/hooks", () => ({ useAppDispatch: vi.fn(), useAppSelector: vi.fn() }));
vi.mock("#/redux/slice/siteSlice", () => ({ updateSiteState: vi.fn() }));
vi.mock("#/redux/slice/authSlice", () => ({ updateAuthState: vi.fn() }));
vi.mock("#/redux/store", () => ({ default: {} }));
vi.mock("#/lib/server/countries", () => ({ getAllCountries: vi.fn() }));
vi.mock("#/hooks/useUser", () => ({ useUser: vi.fn() }));
vi.mock("#/hooks/useUserParty", () => ({ useUserParty: vi.fn() }));

describe("authentication route redirects", () => {
  const destination = "/apc/agents?status=active#results";
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

  it("uses the user's party home when no return URL was supplied", async () => {
    checkSession.mockResolvedValue({ success: true });

    const result = await runLogin().catch((error: unknown) => error);

    if (!isRedirect(result)) throw new Error("Expected a home redirect");
    expect(result.options.to).toBe("/$partyShortName/home");
    expect(result.options.params).toEqual({ partyShortName: "apc" });
    expect(result.options.replace).toBe(true);
  });

  it("continues to reject users without an allowed role", async () => {
    checkSession.mockResolvedValue({ success: true });
    getUser.mockResolvedValue({ username: "some_user", roles: [] });

    await expect(runGuard()).rejects.toThrow("You do not have access to this platform.");
  });

  it("continues to enforce the party tenant boundary after returning", async () => {
    const result = await Promise.resolve().then(() =>
      PartyRoute.options.beforeLoad!({
        params: { partyShortName: "pdp" },
        context: { userDetails: { party: { short_name: "apc" }, roles: ["party_admin"] } },
      } as never)
    ).catch((error: unknown) => error);

    if (!isRedirect(result)) throw new Error("Expected a party home redirect");
    expect(result.options.to).toBe("/$partyShortName/home");
    expect(result.options.params).toEqual({ partyShortName: "apc" });
  });
});
