import {
  ClientOnly,
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import appCss from "../styles.css?url";

import store from "@/redux/store";

import { Toaster } from "@repo/ui/components/sonner";
import { AppSidebarShell as Header } from "#/components/Header";
import { OutletWrapper } from "#/components/OutletWrapper";
import Footer from "#/components/Footer";
import LoadSitePreference from "#/components/LoadSitePreference";
import LoadAuthSession from "#/components/LoadAuthSession";
import LoadVisitorDetails from "#/components/LoadVisitorDetails";
import { getUserDetailsCookie } from "@/lib/server/auth/auth";
import { getSitePreference } from "@/lib/server/sitePreference";

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

// queryClient for tanstack query
const queryClient = new QueryClient();

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
      { title: import.meta.env.VITE_APP_NAME },
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

            <div className="flex min-h-dvh">
              <Header userDetails={userDetails} sitePreference={sitePreference} />

              <div className="flex flex-col flex-1 w-full min-w-0">
                <main className="flex-1">
                  {children}
                </main>
                <Footer />
              </div>
            </div>
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
