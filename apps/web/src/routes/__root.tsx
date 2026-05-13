import { ClientOnly, HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { Provider } from "react-redux";

import store from "@/redux/store";
import appCss from "../styles.css?url";

import { Toaster } from "@repo/ui/components/sonner";
import { AppSidebarShell as Header } from "#/components/Header";
import { OutletWrapper } from "#/components/OutletWrapper";
import Footer from "#/components/Footer";
import LoadSitePrefrence from "#/components/LoadSitePrefrence";


const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {charSet: "utf-8"},
      {name: "viewport", content: "width=device-width, initial-scale=1"},
      {title: "Free9ja"},
    ],
    links: [
      {rel: "stylesheet", href: appCss},
    ],
  }),
  component: RootLayout,
  shellComponent: RootDocument,
});

function RootLayout() {
  return (
    <OutletWrapper>
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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased block relative overflow-hidden selection:bg-[rgba(79,184,178,0.24)]">
        <Provider store={store}>
            <Toaster />
            <Header />
            <ClientOnly>
              <LoadSitePrefrence />
            </ClientOnly>
            {children}
            <Footer />
        </Provider>
        <Scripts />
      </body>
    </html>
  );
}
