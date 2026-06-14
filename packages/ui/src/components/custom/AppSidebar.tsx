import { useEffect, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronUp,
  CircleDollarSign,
  FileText,
  House,
  PanelLeftClose,
  PanelRightClose,
  Users,
} from "lucide-react";
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
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "../../lib/utils";
import { useIsMobile } from "../../hooks/useMobile";

export type AppSidebarItem = {
  id: string;
  label: string;
  icon: ReactNode;
  selectedIcon: ReactNode;
  href?: string;
};

export type AppSidebarShellProps = {
  userDetails?: any;
  items: AppSidebarItem[];
  logoBadge?: ReactNode;
  onLogout?: () => void | Promise<void>;
  onSidebarStateChange?: (state: "expanded" | "collapsed") => void;
  avatarUrl?: string;
  username?: string;
  displayName?: string;
  homePageUrl?: string;
};

export function AppSidebarShell({
  userDetails,
  items,
  logoBadge,
  onLogout,
  onSidebarStateChange,
  avatarUrl,
  username,
  displayName,
  homePageUrl,
}: AppSidebarShellProps) {
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith("/auth");

  if (isAuthPage) {
    return null;
  }

  return (
    <SidebarProvider
      id="sidebar-wrapper"
      defaultOpen
      className="min-h-dvh text-[#181818] bg-transparent w-auto"
      style={
        {
          "--sidebar-width": "260px",
          "--sidebar-width-icon": "70px",
        } as CSSProperties
      }
    >
      <TooltipProvider>
        <AppSidebar
          userDetails={userDetails}
          items={items}
          logoBadge={logoBadge}
          onLogout={onLogout}
          onSidebarStateChange={onSidebarStateChange}
          avatarUrl={avatarUrl}
          username={username}
          displayName={displayName}
          homePageUrl={homePageUrl}
        />
      </TooltipProvider>

      <main className="flex min-h-dvh flex-1 flex-col md:hidden">
        <div className="flex items-center justify-between px-4 pt-4">
          <SidebarTrigger
            className="bg-white hover:bg-white opacity-100"
            img="https://github.com/shadcn.png"
          />
        </div>
      </main>
    </SidebarProvider>
  );
}

export function AppSidebar({
  userDetails,
  items,
  logoBadge,
  onLogout,
  onSidebarStateChange,
  avatarUrl,
  username,
  displayName,
  homePageUrl,
}: AppSidebarShellProps) {
  const { state: sideBarState } = useSidebar();

  useEffect(() => {
    if (onSidebarStateChange) {
      onSidebarStateChange(sideBarState);
    }
  }, [sideBarState, onSidebarStateChange]);

  return (
    <Sidebar
      collapsible="icon"
      className="bg-sidebar md:data-[side=left]:left-0"
    >
      <div className="flex h-full flex-col px-4 py-7">
        <LogoComponent logoBadge={logoBadge} />

        <SidebarContent className="gap-0 overflow-visible">
          <SidebarGroup className="p-0">
            <SidebarMenu>
              {items.map((item) => (
                <EachLinkComponent key={item.id} item={item} items={items} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        {/* 
        <SidebarFooter className="py-4 px-0">
          <ProfilePicture
            userDetails={userDetails}
            avatarUrl={avatarUrl}
            username={username}
            displayName={displayName}
            onLogout={onLogout}
            homePageUrl={homePageUrl}
          />
        </SidebarFooter> */}
      </div>
    </Sidebar>
  );
}

function useActiveItem(items: AppSidebarItem[]): string {
  const location = useLocation();
  let activeItem: string = "";

  for (const item of items) {
    if (item.href && location.pathname.startsWith(item.href)) {
      activeItem = item.id;
      break;
    }
  }

  return activeItem;
}

function EachLinkComponent({
  item,
  items,
}: {
  item: AppSidebarItem;
  items: AppSidebarItem[];
}) {
  const activeItemFromUrl = useActiveItem(items);
  const { state: sideBarState } = useSidebar();
  const isActive = item.id === activeItemFromUrl;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.label}
        className={cn(
          "h-12 rounded-[10px] text-[18px] hover:bg-c-5 transition-all duration-300",
          sideBarState === "collapsed" && "justify-center my-3",
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
          <span
            className={cn(
              "whitespace-nowrap font-normal text-c-70",
              isActive ? "text-c-90 font-semibold" : "",
            )}
          >
            {item.label}
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function LogoComponent({ logoBadge }: { logoBadge?: ReactNode }) {
  const { state: sideBarState, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();

  let flexDir = "flex-row";
  try {
    flexDir = sideBarState === "collapsed" ? "flex-col" : "flex-row";
  } catch (error) {
    console.error(error);
  }

  useEffect(() => {
    if (isMobile) {
      return;
    }

    const savedSiteState = localStorage.getItem("site") || null;
    const preloadedSiteState = savedSiteState
      ? JSON.parse(savedSiteState)
      : undefined;
    if (
      preloadedSiteState &&
      preloadedSiteState?.sideBarState !== sideBarState
    ) {
      toggleSidebar();
    }
  }, []);

  return (
    <div
      className={cn(
        `mb-7 flex ${flexDir} justify-between items-center gap-3 px-2 text-[#234f3e]`,
        sideBarState === "collapsed" && "px-0",
      )}
    >
      <div className="flex items-center gap-2">
        <LogoIcon className="size-8 shrink-0" />
        {sideBarState === "expanded" && (
          <div className="text-[24px] font-semibold tracking-[-0.04em]">
            Free9ja.
          </div>
        )}
      </div>
      {sideBarState === "expanded" && logoBadge}
      <div
        className="size-10 flex justify-center items-center rounded-full cursor-pointer hover:bg-[#f0f0ef]"
        onClick={toggleSidebar}
      >
        {sideBarState === "expanded" ? <PanelLeftClose /> : <PanelRightClose />}
      </div>
    </div>
  );
}

function ProfilePicture({
  userDetails,
  avatarUrl,
  username,
  displayName,
  onLogout,
  homePageUrl,
}: {
  userDetails?: any;
  avatarUrl?: string;
  username?: string;
  displayName?: string;
  onLogout?: () => void | Promise<void>;
  homePageUrl?: string;
}) {
  const { state: sideBarState } = useSidebar();

  const user = userDetails;

  const avatar = avatarUrl ?? "https://github.com/shadcn.png";
  const dname =
    displayName ??
    (user?.first_name
      ? `${user.first_name} ${user.last_name}`
      : (user?.displayName ?? "User"));
  const uname = username ?? user?.username ?? "user";

  if (user === null || user === undefined) {
    return (
      <div
        className="flex gap-4 p-4 hover:bg-[#f0f0ef] active:bg-[#e9e8e7] rounded-full cursor-pointer"
        style={{ width: "260px" }}
      >
        <div className="flex-none">
          <Skeleton className="size-12 bg-light-green/25 rounded-full" />
        </div>
        <div className="flex-1">
          <Skeleton className="w-full mt-1 py-2 bg-light-green/25 rounded-xl" />
          <Skeleton className="w-3/4 mt-2 py-2 bg-light-green/25 rounded-xl" />
        </div>
      </div>
    );
  }

  if (sideBarState === "collapsed") {
    return (
      <Popover>
        <PopoverTrigger>
          <Avatar className="size-10">
            <AvatarImage src={avatar} alt={dname} />
          </Avatar>
        </PopoverTrigger>
        <PopoverContent>
          <ProfilePicturePopover
            userDetails={user}
            onLogout={onLogout}
            homePageUrl={homePageUrl}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover>
      <PopoverTrigger>
        <div
          className="flex gap-4 p-4 hover:bg-[#f0f0ef] active:bg-[#e9e8e7] rounded-full cursor-pointer"
          style={{ width: "260px" }}
        >
          <div className="flex-none">
            <Avatar className="size-12">
              <AvatarImage src={avatar} alt={dname} />
            </Avatar>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-semibold text-[#171416] py-px truncate">
              {dname}
            </p>
            <p className="mt-1 text-[14px] text-[#8b8589] truncate">@{uname}</p>
          </div>
          <div className="flex-none mt-3 text-[#8b8589]">
            <ChevronUp className="size-4 rotate-180" />
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-[260px]">
        <ProfilePicturePopover
          userDetails={user}
          onLogout={onLogout}
          homePageUrl={homePageUrl}
        />
      </PopoverContent>
    </Popover>
  );
}

function ProfilePicturePopover({
  userDetails,
  onLogout,
  homePageUrl,
}: {
  userDetails: any;
  onLogout?: () => void | Promise<void>;
  homePageUrl?: string;
}) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
    }
    if (homePageUrl) {
      navigate({ to: homePageUrl as never });
    }
  };

  const dname = userDetails?.first_name
    ? `${userDetails.first_name} ${userDetails.last_name}`
    : (userDetails?.displayName ?? "User");
  const uname = userDetails?.username ?? "user";

  return (
    <>
      <PopoverHeader className="px-3 capitalize">{dname}</PopoverHeader>
      <PopoverDescription>
        <span
          onClick={handleLogout}
          className="
          block py-2 px-3 text-[14px] text-[#8b8589] truncate overflow-hidden cursor-pointer
          hover:bg-[#f0f0ef] hover:text-[#171416]
          "
        >
          Logout @{uname}
        </span>
      </PopoverDescription>
    </>
  );
}
