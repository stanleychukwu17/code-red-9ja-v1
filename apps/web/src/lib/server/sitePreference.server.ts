import { createServerOnlyFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { respondSuccess } from "@/lib/shared/response";

export const setSitePreferenceCookieImpl = createServerOnlyFn(async ({ data }) => {
  const stringifiedDetails = JSON.stringify(data);
  setCookie("site_preference", stringifiedDetails, {
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 24 * 60 * 60, // 1 year
  });
  return respondSuccess();
});

export const getSitePreferenceCookieImpl = createServerOnlyFn(async () => {
  const siteCookie = getCookie("site_preference");
  if (!siteCookie) return null;
  try {
    return JSON.parse(siteCookie);
  } catch {
    return null;
  }
});
