// Only allow local application pages as destinations after authentication.
export function getAuthRedirect(value: unknown): string | undefined {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(value)
  ) {
    return undefined;
  }

  try {
    const url = new URL(value, "https://app.local");
    const pathname = decodeURIComponent(url.pathname);

    // Avoid protocol-relative URLs and loops through authentication routes.
    if (
      pathname.startsWith("//") ||
      /[\\\u0000-\u001f\u007f]/.test(pathname) ||
      /^\/auth(?:\/|$)/i.test(pathname)
    ) {
      return undefined;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}
