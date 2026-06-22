// This Sidebar component was copied from the shadcn repo.
// More info about the shadcn UI can be found at https://shadcn.com/ui/
// the shadcn sidebar component can be found at: https://ui.shadcn.com/docs/components/radix/sidebar
// the shadcn blocks can be found at: https://ui.shadcn.com/blocks

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@repo/ui/components/sidebar";

import { TooltipProvider } from "@repo/ui/components/tooltip";
import { Avatar, AvatarImage } from "@repo/ui/components/avatar";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverDescription,
} from "@repo/ui/components/popover";

import LogoIcon from "@repo/ui/icons/logo-icon";
import FeedIcon from "@repo/ui/icons/navbar/feed-icon";
import FeedSolidIcon from "@repo/ui/icons/navbar/feed-solid-icon";
import HomeIcon from "@repo/ui/icons/navbar/home-icon";
import HomeSolidIcon from "@repo/ui/icons/navbar/home-solid-icon";
import NotificationIcon from "@repo/ui/icons/navbar/notification-icon";
import NotificationSolidIcon from "@repo/ui/icons/navbar/notification-solid-icon";
import ProfileIcon from "@repo/ui/icons/navbar/profile-icon";
import ProfileSolidIcon from "@repo/ui/icons/navbar/profile-solid-icon";
import SearchIcon from "@repo/ui/icons/navbar/search-icon";
import SearchSolidIcon from "@repo/ui/icons/navbar/search-solid-icon";

import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";

import { Ellipsis, PanelRightClose, PanelLeftClose, Sun, Moon, Monitor } from "lucide-react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, type CSSProperties, type ReactNode } from "react";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateSiteState } from "@/redux/slice/siteSlice";
import type { SiteState } from "@/redux/slice/siteSlice";
import { updateAuthState } from "@/redux/slice/authSlice";
import type { UserProps } from "@/redux/slice/authSlice";
import { logoutUser } from "#/lib/server/auth/auth";
// import { useIsMobile } from "@repo/ui/hooks/useMobile";
import { APP_URL, APP_NAME } from "#/lib/config";
import { useTheme } from "#/components/ThemeToggle";

type AppSidebarItem = {
  id: string;
  label: string;
  icon: ReactNode;
  selectedIcon: ReactNode;
  href?: string;
};

const APP_SIDEBAR_ITEMS: AppSidebarItem[] = [
  {
    id: "home",
    label: "Home",
    icon: <HomeIcon className="size-6!" />,
    selectedIcon: <HomeSolidIcon className="size-6!" />,
    href: "/dashboard",
  },
  {
    id: "feed",
    label: "Feed",
    icon: <FeedIcon className="size-6!" />,
    selectedIcon: <FeedSolidIcon className="size-6!" />,
    href: "/feed",
  },
  {
    id: "search",
    label: "Search",
    icon: <SearchIcon className="size-6!" />,
    selectedIcon: <SearchSolidIcon className="size-6!" />,
    href: "/search",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <NotificationIcon className="size-6!" />,
    selectedIcon: <NotificationSolidIcon className="size-6!" />,
    href: "/notifications",
  },
  {
    id: "profile",
    label: "Profile",
    icon: <ProfileIcon className="size-6!" />,
    selectedIcon: <ProfileSolidIcon className="size-6!" />,
    href: "/profile",
  },
];

// the main SideBar wrapper
export function AppSidebarShell({ userDetails, sitePreference }: { userDetails?: UserProps; sitePreference?: Partial<SiteState> }) {
  const preloadedSiteState = sitePreference;
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith("/auth");

  if (isAuthPage) {
    return null;
  }


  return (
    <div className="fixed">
      <SidebarProvider
        id="sidebar-wrapper"
        defaultOpen={preloadedSiteState?.sideBarState === "expanded"}
        className="min-h-dvh text-[#181818] bg-transparent"
        style={
          {
            "--sidebar-width": "290px",
            "--sidebar-width-icon": "70px",
          } as CSSProperties
        }
      >
        {/* This TooltipProvider is needed for the SidebarMenuButton with tooltips */}
        <TooltipProvider>
          <AppSidebar userDetails={userDetails} sitePreference={sitePreference} />
        </TooltipProvider>

        {/* Collapsing of the sidebar */}
        <main className="flex min-h-dvh flex-1 flex-col md:hidden">
          <div className="flex items-center justify-between px-4 pt-4">
            {/* Sidebar trigger button with an optional image, The image is only visible on mobile devices */}
            <SidebarTrigger className="bg-white hover:bg-white opacity-100" img={userDetails?.avatar_url || "https://github.com/shadcn.png"} />
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
}

export function AppSidebar({ userDetails }: { userDetails?: UserProps; sitePreference?: Partial<SiteState> }) {
  const { state: sideBarState } = useSidebar();
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(updateSiteState({ sideBarState }));
  }, [sideBarState, dispatch]);

  return (
    <Sidebar
      collapsible="icon"
      className="md:data-[side=left]:left-0"
    >
      <div className="bg-sidebar flex h-full flex-col px-4 py-7">
        {/* This component is responsible for rendering the logo of the application */}
        <LogoComponent />

        <SidebarContent className="gap-0 overflow-visible">
          <SidebarGroup className="p-0">
            <SidebarMenu>
              {APP_SIDEBAR_ITEMS.map((item) => (
                <EachLinkComponent key={item.id} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroup>

          {sideBarState === "expanded" && (
            <div className="mt-4 flex flex-col gap-3 px-1">
              <SidebarPollButton>Will you be voting?</SidebarPollButton>
            </div>
          )}
        </SidebarContent>

        <SidebarFooter className="py-4 px-0">
          <ProfilePicture userDetails={userDetails} />
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}

// Returns the active tab based on the current URL
function useActiveItem(): string {
  const location = useLocation();
  let activeItem: string = "";

  for (const item of APP_SIDEBAR_ITEMS) {
    if (item.href && location.pathname.startsWith(item.href)) {
      activeItem = item.id;
      break;
    }
  }

  return activeItem;
}

function EachLinkComponent({ item }: { item: AppSidebarItem }) {
  const activeItemFromUrl = useActiveItem();
  const { state: sideBarState } = useSidebar();
  const isActive = item.id === activeItemFromUrl;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.label}
        className={cn(
          "h-14 rounded-[16px] px-5 text-[18px] transition-all duration-300 cursor-pointer",
          isActive
            ? "bg-sidebar-active! text-(--text-80)! hover:bg-sidebar-active-hover! hover:text-white!"
            : "hover:bg-c-10 text-[#181818] hover:text-[#181818]",
          sideBarState === "collapsed" && "justify-center my-3"
        )}
      >
        <Link
          to={item.href}
          className="p-0"
          style={{ padding: "0px !important" }}
        >
          <div className="relative -right-1 size-8 py-2 flex shrink-0 items-center justify-center">
            {isActive ? item.selectedIcon : item.icon}
          </div>
          <span className={cn("whitespace-nowrap")}>
            {item.label}
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function LogoComponent() {
  const { state: sideBarState, toggleSidebar } = useSidebar();

  let flexDir = "flex-row";
  try {
    flexDir = sideBarState === "collapsed" ? "flex-col" : "flex-row";
  } catch (error) {
    console.error(error);
  }

  return (
    <div
      className={cn(`mb-7 flex ${flexDir} justify-between items-center gap-3 px-2 text-logo`, sideBarState === "collapsed" && "px-0")}
    >
      <div className="flex items-center gap-2">
        <LogoIcon className="size-8 shrink-0" />
        {sideBarState === "expanded" && (
          <div className="text-[20px] font-semibold tracking-[-0.04em]">
            {APP_NAME}
          </div>
        )}
      </div>
      <div
        className="size-10 flex justify-center items-center rounded-full cursor-pointer hover:bg-muted text-foreground/80 hover:text-foreground"
        onClick={toggleSidebar}
      >
        {sideBarState === "expanded" ? <PanelLeftClose /> : <PanelRightClose />}
      </div>
    </div>
  );
}

// SidebarPollButton renders a styled button typically used for polls within a sidebar context.
function SidebarPollButton({ children }: { children: ReactNode }) {
  return (
    <button className="flex h-[62px] items-center justify-center rounded-full border border-[#e6dfdf] bg-white text-center text-[18px] font-semibold text-[#1d2c27] transition hover:bg-[#faf8f8]">
      {children}
    </button>
  );
}

// ProfilePicture renders the user's profile picture or a default avatar.
// It uses the user data from the auth store or the userDetails prop.
function ProfilePicture({ userDetails }: { userDetails?: UserProps }) {
  const { state: sideBarState } = useSidebar();
  const { user: authUser, userHydrated } = useAppSelector((state) => state.auth);
  const user = authUser || userDetails;

  if (user === null) {
    // If user is null and userHydrated is true, it means the user is not logged in
    if (userHydrated) {
      return null;
    }

    if (sideBarState != "collapsed") {
      return <>
        <div className="flex gap-4 p-4 hover:bg-[#f0f0ef] active:bg-[#e9e8e7] rounded-full cursor-pointer" style={{ width: "260px" }}>
          <div className="flex-none">
            <Skeleton className="size-12 bg-light-green/25 rounded-full" />
          </div>
          <div className="flex-1">
            <Skeleton className="w-full mt-1 py-2 bg-light-green/25 rounded-xl" />
            <Skeleton className="w-3/4 mt-2 py-2 bg-light-green/25 rounded-xl" />
          </div>
        </div>
      </>
    }
  }

  // If the sidebar is collapsed, show a popover with the profile picture
  if (sideBarState === "collapsed") {
    return (
      <Popover>
        {/* The trigger element is the avatar */}
        <PopoverTrigger>
          <Avatar className="size-10 bg-[#f0f0ef]">
            <AvatarImage src={user?.avatar_url} alt={user?.username || "User"} />
          </Avatar>
        </PopoverTrigger>

        {/* The content of the popover is the profile picture */}
        <PopoverContent>
          <ProfilePicturePopover userDetails={user} />
        </PopoverContent>
      </Popover>
    );
  }

  // If the sidebar is expanded, show a popover with the profile picture, name, and username
  return (
    <Popover>
      {/* The trigger element is a div that contains the avatar, name, and username */}
      <PopoverTrigger>
        <div className="flex gap-4 p-4 bg-sidebar-active dark:hover:bg-c-10 rounded-full cursor-pointer" style={{ width: "260px" }}>
          <div className="flex-none">
            {/* The avatar */}
            <Avatar className="size-12 bg-[#f0f0ef]">
              <AvatarImage src={user?.avatar_url} alt={user?.username || "User"} />
            </Avatar>
          </div>
          <div className="flex-1">
            <p className="text-[16px] font-semibold text-c-100 dark:text-logo py-px truncate overflow-hidden" style={{ maxWidth: "160px" }}>
              {user?.last_name} {user?.first_name}
            </p>
            <p className="mt-1 text-[14px] text-c-80 dark:text-logo/80 truncate overflow-hidden" style={{ maxWidth: "160px" }}>
              @{user?.username}
            </p>
          </div>
          <div className="flex-none mt-3 ">
            <Ellipsis />
          </div>
        </div>
      </PopoverTrigger>

      {/* The content of the popover is the profile picture popover */}
      <PopoverContent className="w-[260px]">
        <ProfilePicturePopover userDetails={user} />
      </PopoverContent>
    </Popover>
  );
}

// The profile picture popover component
function ProfilePicturePopover({ userDetails }: { userDetails?: UserProps }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Failed to call logoutUser on server:", error);
    }

    dispatch(updateAuthState({ user: null }));
    navigate({ to: APP_URL.homePage });
  };

  return (
    <>
      <PopoverHeader className="px-3 pb-1 border-b border-border capitalize text-foreground font-semibold">
        {userDetails?.last_name} {userDetails?.first_name}
      </PopoverHeader>
      <PopoverDescription className="mt-2 flex flex-col gap-2">
        <span
          onClick={handleLogout}
          className="
          block py-2 px-3 text-[14px] text-muted-foreground truncate overflow-hidden cursor-pointer
          hover:bg-accent hover:text-accent-foreground rounded-md transition-colors
          "
        >
          Logout @{userDetails?.username}
        </span>

        <div className="border-t border-border my-1" />

        <div className="px-3 py-1">
          <p className="text-[12px] text-muted-foreground font-medium mb-2">Theme</p>
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setTheme('light')}
              className={cn(
                "flex-1 flex justify-center items-center py-1.5 rounded-md text-[13px] font-medium transition-all cursor-pointer",
                theme === 'light' ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
              title="Light Mode"
            >
              <Sun className="size-4 mr-1.5" />
              Light
            </button>
            <button
              onClick={() => setTheme('auto')}
              className={cn(
                "flex-1 flex justify-center items-center py-1.5 rounded-md text-[13px] font-medium transition-all cursor-pointer",
                theme === 'auto' ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
              title="System Mode"
            >
              <Monitor className="size-4 mr-1.5" />
              Auto
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                "flex-1 flex justify-center items-center py-1.5 rounded-md text-[13px] font-medium transition-all cursor-pointer",
                theme === 'dark' ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
              title="Dark Mode"
            >
              <Moon className="size-4 mr-1.5" />
              Dark
            </button>
          </div>
        </div>
      </PopoverDescription>
    </>
  );
}
