// import { Button } from "@repo/ui/components/button";

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

import {
  Ellipsis, PanelRightClose, PanelLeftClose
} from "lucide-react";

import { TooltipProvider } from "@repo/ui/components/tooltip";

import { Avatar, AvatarImage } from "@repo/ui/components/avatar";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverDescription
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

import { cn } from "node_modules/@repo/ui/src/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import { type CSSProperties, type ReactNode } from "react";

// import { useIsMobile } from "@repo/ui/hooks/useMobile";

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
    selectedIcon: <HomeSolidIcon className="size-6! text-primary" />,
    href: "/dashboard",
  },
  {
    id: "feed",
    label: "Feed",
    icon: <FeedIcon className="size-6!" />,
    selectedIcon: <FeedSolidIcon className="size-6! text-primary" />,
    href: "/feed",
  },
  {
    id: "search",
    label: "Search",
    icon: <SearchIcon className="size-6!" />,
    selectedIcon: <SearchSolidIcon className="size-6! text-primary" />,
    href: "/search",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <NotificationIcon className="size-6!" />,
    selectedIcon: <NotificationSolidIcon className="size-6! text-primary" />,
    href: "/notifications",
  },
  {
    id: "profile",
    label: "Profile",
    icon: <ProfileIcon className="size-6!" />,
    selectedIcon: <ProfileSolidIcon className="size-6! text-primary" />,
    href: "/profile",
  },
];

function getActiveItemFromPath(pathname: string): string {
  for (const item of APP_SIDEBAR_ITEMS) {
    if (item.href && pathname.startsWith(item.href)) {
      return item.id;
    }
  }
  return "";
}



export function AppSidebarShell() {
  return (
    <div className="fixed">
      <SidebarProvider
        defaultOpen
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
          <AppSidebar />
        </TooltipProvider>

        {/* Collapsing of the sidebar */}
        <main className="flex min-h-dvh flex-1 flex-col md:hidden">
          <div className="flex items-center justify-between px-4 pt-4">
            {/* Sidebar trigger button with an optional image, The image is only visible on mobile devices */}
            <SidebarTrigger className="bg-white hover:bg-white opacity-100" img="https://github.com/shadcn.png" />
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
}

export function AppSidebar() {
  const { state: sideBarState } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="bg-sidebar md:data-[side=left]:left-0" >
      <div className="flex h-full flex-col px-4 py-7">
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
          <ProfilePicture />
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}


// Returns the active item's ID based on the current URL pathname.
function useActiveItem(): string {
  const location = useLocation();
  return getActiveItemFromPath(location.pathname);
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
          "h-14 rounded-[16px] px-5 text-[18px] hover:bg-c-5 transition-all duration-300",
          sideBarState === "collapsed" && "justify-center my-3"
        )}
      >
        <Link to={item.href} className="p-0" style={{ padding: "0px !important" }}>
          <div className="relative -right-1 size-8 py-2 flex shrink-0 items-center justify-center">
            {isActive ? item.selectedIcon : item.icon}
          </div>
          <span className={cn("whitespace-nowrap", isActive ? "text-primary" : "")}>
            {item.label}
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function LogoComponent () {
  const { state: sideBarState, toggleSidebar } = useSidebar();

  const flexDir = sideBarState === "collapsed" ? "flex-col" : "flex-row";

  return (
    <div
      className={cn(`mb-7 flex ${flexDir} justify-between items-center gap-3 px-2 text-[#234f3e]`, sideBarState === "collapsed" && "px-0")}
    >
      <div className="flex items-center gap-2">
        <LogoIcon className="size-8 shrink-0" />
        {sideBarState === "expanded" && (
          <div className="text-[20px] font-semibold tracking-[-0.04em]">
            Free <span className="font-normal">9ja</span>
          </div>
        )}
      </div>
      <div
        className="size-10 flex justify-center items-center rounded-full cursor-pointer hover:bg-[#f0f0ef]"
        onClick={toggleSidebar}
      >
        {sideBarState === "expanded" ?  <PanelLeftClose /> : <PanelRightClose />}
      </div>
    </div>
  )
}

function SidebarPollButton({ children }: { children: ReactNode }) {
  return (
    <button
      className="flex h-[62px] items-center justify-center rounded-full border border-[#e6dfdf] bg-white text-center text-[18px] font-semibold text-[#1d2c27] transition hover:bg-[#faf8f8]"
    >
      {children}
    </button>
  );
}

function ProfilePicture () {
  const { state: sideBarState } = useSidebar();

  if (sideBarState === "collapsed") {
    return (
      <Popover>
        <PopoverTrigger>
          <Avatar className="size-10">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          </Avatar>
        </PopoverTrigger>
        <PopoverContent>
          <ProfilePicturePopover />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Popover>
      <PopoverTrigger>
        <div className="flex gap-4 p-4 hover:bg-[#f0f0ef] active:bg-[#e9e8e7] rounded-full cursor-pointer" style={{width: "260px"}}>
          <div className="flex-none">
            <Avatar className="size-12">
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn"/>
            </Avatar>
          </div>
          <div className="flex-1">
            <p className="text-[16px] font-semibold text-[#171416] py-px truncate overflow-hidden" style={{maxWidth: "160px"}}>Chukwu Daniel</p>
            <p className="mt-1 text-[14px] text-[#8b8589] truncate overflow-hidden" style={{maxWidth: "160px"}}>@chukwudaniel</p>
          </div>
          <div className="flex-none mt-3 ">
            <Ellipsis />
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-[260px]">
        <ProfilePicturePopover />
      </PopoverContent>
    </Popover>
  );
}
function ProfilePicturePopover() {
  return (
    <>
      <PopoverHeader className="px-3">Chukwu Daniel</PopoverHeader>
      <PopoverDescription>
        <Link to="/auth/login"
          className="
          block py-2 px-3 text-[14px] text-[#8b8589] truncate overflow-hidden
          hover:bg-[#f0f0ef] hover:text-[#171416]
          "
        >
          Logout @chukwudaniel
        </Link>
      </PopoverDescription>
    </>
  );
}