import { createServerFn } from "@tanstack/react-start";
import { setSitePreferenceCookieImpl, getSitePreferenceCookieImpl } from "./sitePreference.server";

export const saveSitePreference = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    return await setSitePreferenceCookieImpl({ data });
  });

export const getSitePreference = createServerFn({ method: "GET" })
  .handler(async () => {
    return await getSitePreferenceCookieImpl();
  });
