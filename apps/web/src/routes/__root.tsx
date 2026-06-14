import {
  ClientOnly,
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { Provider } from "react-redux";
import appCss from "../styles.css?url";

import store from "@/redux/store";

import { Toaster } from "@repo/ui/components/sonner";
import { AppSidebarShell as Header } from "#/components/Header";
import { OutletWrapper } from "#/components/OutletWrapper";
import Footer from "#/components/Footer";
import LoadSitePreference from "#/components/LoadSitePreference";
import LoadAuthSession from "#/components/LoadAuthSession";
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
  const { sitePreference } = Route.useRouteContext();
  return (
    <OutletWrapper sitePreference={sitePreference}>
      {/*
        I use the OutletWrapper to calculate the width of the div that wraps the <Outlet /> component.
        It gets the width of the sidebar from the DOM and adjusts the width of the <Outlet /> accordingly.
        This is done to ensure that the <Outlet /> always fills the remaining space in the page, regardless of the width of the sidebar.
      */}
      <Outlet />
    </OutletWrapper>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { userDetails, sitePreference } = Route.useRouteContext();

  // Check if userDetails is not undefined, null or empty object
  let userDetailsString = "{}";
  if (userDetails && Object.keys(userDetails).length > 0) {
    userDetailsString = JSON.stringify(userDetails);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body
        data-user-details={userDetailsString}
        className="font-sans antialiased block relative overflow-x-hidden overflow-y-auto selection:bg-[rgba(79,184,178,0.24)]"
      >
        <Provider store={store}>
          <Toaster />
          <Header userDetails={userDetails} sitePreference={sitePreference} />
          <ClientOnly>
            <LoadSitePreference sitePreference={sitePreference} />
            <LoadAuthSession />
          </ClientOnly>
          {children}
          <Footer sitePreference={sitePreference} />
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
