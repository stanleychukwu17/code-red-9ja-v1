import { describe, expect, it } from "vitest";
import { getAuthRedirect } from "./auth-redirect";

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

