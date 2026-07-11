import { ClientOnly, HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import appCss from "../styles.css?url";
import store from "@/redux/store";

import { Toaster } from "@repo/ui/components/sonner";
import { OutletWrapper } from "#/components/OutletWrapper";
import LoadSitePreference from "#/components/LoadSitePreference";
import LoadAuthSession from "#/components/LoadAuthSession";
import LoadVisitorDetails from "#/components/LoadVisitorDetails";
import { getUserDetailsCookie } from "@/lib/server/auth/auth";
import { getSitePreference } from "@/lib/server/sitePreference";

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

export const Route = createRootRoute({
  beforeLoad: async () => {
    const userDetails = await getUserDetailsCookie();
    const sitePreference = await getSitePreference();
    return { userDetails, sitePreference };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Free9ja" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootLayout,
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
  errorComponent: ErrorComponent,
});

function RootLayout() {
  return (
    <OutletWrapper>
      <Outlet />
    </OutletWrapper>
  );
}


const queryClient = new QueryClient();

function RootDocument({ children }: { children: React.ReactNode }) {
  const { userDetails, sitePreference } = Route.useRouteContext();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body
        className="font-sans antialiased block relative overflow-x-hidden overflow-y-auto selection:bg-[rgba(79,184,178,0.24)]"
      >
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <Toaster />
            <ClientOnly>
              <LoadSitePreference sitePreference={sitePreference} />
              <LoadAuthSession />
              <LoadVisitorDetails />
            </ClientOnly>
            {children}
          </QueryClientProvider>
        </Provider>
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <div className="p-8">
      <h1>404</h1>
      <p>Page not found</p>
    </div>
  );
}

function ErrorComponent({ error }: { error: any }) {
  return (
    <div className="p-8">
      <p>Something went wrong</p>
      <p>{error?.message}</p>
      <pre>{error?.stack}</pre>
    </div>
  );
}
