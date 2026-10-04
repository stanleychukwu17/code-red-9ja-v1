import { isRedirect } from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "../../routes/_authenticated";
import { getAuthRedirect } from "./auth-redirect";

const { checkSession } = vi.hoisted(() => ({ checkSession: vi.fn() }));

vi.mock("#/lib/server/auth/auth", () => ({
  checkIfRefreshTokenInCookie: checkSession,
}));

describe("authentication return URLs", () => {
  it.each([
    "/home",
    "/feed/post-123?comment=456#replies",
    "/search?q=hello%20world&tab=people#results",
    "/profile/some_user/followers",
    "/",
  ])("preserves the full local URL %s", (href) => {
    expect(getAuthRedirect(href)).toBe(href);
  });

  it.each([
    undefined,
    null,
    123,
    ["/home"],
    "",
    "home",
    "https://example.com/home",
    "//example.com/home",
    "javascript:alert(1)",
    "/\\example.com",
    "/.//example.com",
    "/%2fexample.com",
    "/%5cexample.com",
    "/home\n",
    "/%0ahome",
    "/%invalid",
    "/auth/login?redirect=/home",
    "/auth/onboarding",
    "/auth/logout",
    "/feed/../auth/login",
    "/%61uth/login",
  ])("rejects unsafe or authentication destinations: %s", (href) => {
    expect(getAuthRedirect(href)).toBeUndefined();
  });
});

describe("authenticated route guard", () => {
  beforeEach(() => {
    checkSession.mockReset();
  });

  const destination = "/feed/post-123?comment=456#replies";

  async function runGuard(userDetails: { username?: string } | null = null) {
    return Route.options.beforeLoad!({
      context: { userDetails },
      location: { href: destination },
    } as never);
  }

  it("passes the intended URL to login when the session is missing", async () => {
    checkSession.mockResolvedValue({ success: false });

    const result = await runGuard().catch((error: unknown) => error);

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) throw new Error("Expected a login redirect");
    expect(result.options.to).toBe("/auth/login");
    expect(result.options.search).toEqual({ redirect: destination });
  });

  it("keeps the intended URL when onboarding is required", async () => {
    checkSession.mockResolvedValue({ success: true });

    const result = await runGuard({}).catch((error: unknown) => error);

    expect(isRedirect(result)).toBe(true);
    if (!isRedirect(result)) throw new Error("Expected an onboarding redirect");
    expect(result.options.to).toBe("/auth/onboarding");
    expect(result.options.search).toEqual({
      step: "details",
      redirect: destination,
    });
  });

  it("allows authenticated users with a username to load the route", async () => {
    checkSession.mockResolvedValue({ success: true });

    await expect(runGuard({ username: "some_user" })).resolves.toEqual({
      isLoggedIn: { success: true },
    });
  });
});
