import { Button } from "@repo/ui/components/button";
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
} from "@repo/ui/components/sidebar";
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
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

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
    icon: <HomeIcon className="!size-6" />,
    selectedIcon: <HomeSolidIcon className="!size-6 text-primary" />,
    href: "/dashboard",
  },
  {
    id: "feed",
    label: "Feed",
    icon: <FeedIcon className="!size-6" />,
    selectedIcon: <FeedSolidIcon className="!size-6 text-primary" />,
    href: "/feed",
  },
  {
    id: "search",
    label: "Search",
    icon: <SearchIcon className="!size-6" />,
    selectedIcon: <SearchSolidIcon className="!size-6 text-primary" />,
    href: "/search",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <NotificationIcon className="!size-6" />,
    selectedIcon: <NotificationSolidIcon className="!size-6 text-primary" />,
    href: "/notifications",
  },
  {
    id: "profile",
    label: "Profile",
    icon: <ProfileIcon className="!size-6" />,
    selectedIcon: <ProfileSolidIcon className="!size-6 text-primary" />,
    href: "/profile",
  },
];

export function AppSidebarShell({
  children,
  activeItem = "home",
}: {
  children: ReactNode;
  activeItem?: string;
}) {
  return (
    <SidebarProvider
      defaultOpen
      className="min-h-dvh bg-[#fbf6fa] text-[#181818]"
      style={
        {
          "--sidebar-width": "290px",
          "--sidebar-width-icon": "70px",
        } as CSSProperties
      }
    >
      <AppSidebar activeItem={activeItem} />
      <main className="flex min-h-dvh flex-1 flex-col bg-[#fbf6fa]">
        <div className="flex items-center justify-between px-4 pt-4 md:hidden">
          <SidebarTrigger className="rounded-full border border-[#ded8dc] bg-white/80 text-[#234f3e] hover:bg-white" />
          <div className="flex items-center gap-2 text-[#234f3e]">
            <LogoIcon className="size-7" />
            <span className="text-[22px] font-semibold tracking-[-0.03em]">
              Free9ja.
            </span>
          </div>
          <div className="w-9" />
        </div>
        {children}
      </main>
    </SidebarProvider>
  );
}

export function AppSidebar({ activeItem = "home" }: { activeItem?: string }) {
  return (
    <Sidebar
      collapsible="offcanvas"
      className="bg-sidebar md:data-[side=left]:left-0"
    >
      <div className="flex h-full flex-col px-4 py-7">
        <div className="mb-9 flex items-center gap-3 px-2 text-[#234f3e]">
          <LogoIcon className="size-8 shrink-0" />
          <span className="text-[20px] font-semibold tracking-[-0.04em]">
            Free
            <span className="font-normal">9ja.</span>
          </span>
        </div>

        <SidebarContent className="gap-0 overflow-visible">
          <SidebarGroup className="p-0">
            <SidebarMenu>
              {APP_SIDEBAR_ITEMS.map((item) => {
                const isActive = item.id === activeItem;
                const buttonClasses = isActive
                  ? "h-14 rounded-[16px] px-5 text-[18px] font-semibold text-[#2f6f57]"
                  : "h-14 rounded-[16px] px-5 text-[18px] font-normal text-[#1e1e1e]";

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={cn("hover:bg-c-5", buttonClasses)}
                    >
                      {item.href ? (
                        <Link to={item.href}>
                          <div className="size-7">
                            {isActive ? item.selectedIcon : item.icon}
                          </div>
                          <span className={cn(isActive ? "text-primary" : "")}>
                            {item.label}
                          </span>
                        </Link>
                      ) : (
                        <button type="button">
                          {isActive ? item.selectedIcon : item.icon}
                          <span>{item.label}</span>
                        </button>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>

          <div className="mt-8 px-1">
            <Button
              variant="default"
              className="h-[60px] w-full rounded-full bg-primary text-[18px] font-semibold text-white hover:bg-[#275d49]"
            >
              Post
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-3 px-1">
            <SidebarPollButton>Did you vote?</SidebarPollButton>
            <SidebarPollButton>Will you be voting?</SidebarPollButton>
          </div>
        </SidebarContent>

        <SidebarFooter className="mt-auto p-0 pt-6">
          <button
            type="button"
            className="flex h-[62px] w-full items-center justify-between rounded-[18px] bg-[#f0f0ef] px-5 text-left text-[18px] font-medium text-[#1d2c27] transition hover:bg-[#e9e8e7]"
          >
            <span>Presidential Election</span>
            <ChevronDown className="size-5 text-[#777777]" />
          </button>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}

function SidebarPollButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="flex h-[62px] items-center justify-center rounded-full border border-[#e6dfdf] bg-white text-center text-[18px] font-semibold text-[#1d2c27] transition hover:bg-[#faf8f8]"
    >
      {children}
    </button>
  );
}
