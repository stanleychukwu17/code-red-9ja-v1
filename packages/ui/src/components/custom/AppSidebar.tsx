import { useEffect, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  PanelLeftClose,
  PanelRightClose,
  Menu,
  Ellipsis,
  LogIn,
  UserPlus,
  Sun,
  Monitor,
  Moon,
  Settings,
  LogOut,
} from "lucide-react";
import { useTheme } from "../../hooks/use-theme";
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
import { AppAvatar, Avatar, AvatarImage } from "@repo/ui/components/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverDescription,
} from "@repo/ui/components/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import LogoIcon from "@repo/ui/icons/logo-icon";
// import { Skeleton } from "@repo/ui/components/skeleton";
import { Button } from "@repo/ui/components/button";
import { cn } from "../../lib/utils";
import { useIsMobile } from "../../hooks/useMobile";
import SidebarIcon from "../../icons/navbar/sidebar-icon";
import SidebarSolidIcon from "../../icons/navbar/sidebar-solid-icon";
import { ProfileDropdown } from "../dropdowns/ProfileDropdown";

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
  logoIcon?: ReactNode;
  logoText?: string;
  onLogout?: () => void | Promise<void>;
  onSidebarStateChange?: (state: "expanded" | "collapsed") => void;
  avatarUrl?: string;
  username?: string;
  displayName?: string;
  homePageUrl?: string;
  profilePopoverExtraContent?: ReactNode;
  defaultOpen?: boolean;
  showSidebarFooter?: boolean;
};

export function AppSidebarShell({
  userDetails,
  items,
  logoIcon,
  logoText,
  onLogout,
  onSidebarStateChange,
  avatarUrl,
  username,
  displayName,
  homePageUrl,
  profilePopoverExtraContent,
  defaultOpen = true,
  showSidebarFooter,
}: AppSidebarShellProps) {
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith("/auth");

  if (isAuthPage) {
    return null;
  }

  const user = userDetails;

  return (
    <SidebarProvider
      id="sidebar-wrapper"
      defaultOpen={defaultOpen}
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
          logoIcon={logoIcon}
          logoText={logoText}
          onLogout={onLogout}
          onSidebarStateChange={onSidebarStateChange}
          avatarUrl={avatarUrl}
          username={username}
          displayName={displayName}
          homePageUrl={homePageUrl}
          profilePopoverExtraContent={profilePopoverExtraContent}
          showSidebarFooter={showSidebarFooter}
        />
      </TooltipProvider>

      <main className="bg-sidebar md:hidden h-12 flex flex-1 flex-col ">
        <div className="flex items-center justify-between px-4 w-dvw py-2">
          <div>
            <Link to={(homePageUrl ?? "/") as any}>
              <LogoIcon className="size-8 shrink-0 text-[#234f3e] dark:text-logo" />
            </Link>
          </div>

          <div className="relative overflow-hidden w-8 h-8">
            {user ? (
              <SidebarTrigger
                className="w-8 h-8! py-0 rounded-full hover:bg-white opacity-100"
                img={
                  avatarUrl ??
                  user?.avatar_url ??
                  "https://github.com/shadcn.png"
                }
              />
            ) : (
              <SidebarTrigger className="w-8 h-8! py-0">
                <Menu className="size-6" />
              </SidebarTrigger>
            )}
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
}

export function AppSidebar({
  userDetails,
  items,
  logoIcon,
  logoText,
  onLogout,
  onSidebarStateChange,
  avatarUrl,
  username,
  displayName,
  homePageUrl,
  profilePopoverExtraContent,
  showSidebarFooter = true,
}: AppSidebarShellProps) {
  const { state: sideBarState } = useSidebar();
  const activeItemFromUrl = useActiveItem(items);

  useEffect(() => {
    if (onSidebarStateChange) {
      onSidebarStateChange(sideBarState);
    }
  }, [sideBarState, onSidebarStateChange]);

  return (
    <Sidebar collapsible="icon" className="md:data-[side=left]:left-0">
      <div className="bg-sidebar-mobile md:bg-sidebar flex h-full flex-col px-4 pt-7">
        <LogoComponent
          logoIcon={logoIcon}
          logoText={logoText}
          homePageUrl={homePageUrl}
        />

        <SidebarContent className="gap-0 overflow-visible">
          <SidebarGroup className="p-0">
            <SidebarMenu className="space-y-0.5">
              {items.map((item) => (
                <EachLinkComponent
                  key={item.id}
                  item={item}
                  isActive={item.id === activeItemFromUrl}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        {showSidebarFooter && (
          <SidebarFooter className="py-4 px-0">
            <ProfilePicture
              userDetails={userDetails}
              avatarUrl={avatarUrl}
              username={username}
              displayName={displayName}
              onLogout={onLogout}
              homePageUrl={homePageUrl}
              profilePopoverExtraContent={profilePopoverExtraContent}
            />
          </SidebarFooter>
        )}
      </div>
    </Sidebar>
  );
}

function useActiveItem(items: AppSidebarItem[]): string {
  const location = useLocation();
  let activeItem: string = "";

  items.forEach((item) => {
    const toMatch = `/${item.id}`;

    if (location.pathname.startsWith(toMatch)) {
      activeItem = item.id;
    } else if (
      location.pathname.includes(toMatch) ||
      location.pathname.endsWith(toMatch)
    ) {
      activeItem = item.id;
    }
  });

  return activeItem;
}

function EachLinkComponent({
  item,
  isActive,
}: {
  item: AppSidebarItem;
  isActive: boolean;
}) {
  const { state: sideBarState, setOpenMobile, isMobile } = useSidebar();

  return (
    <SidebarMenuItem
      className={cn(isActive ? "bg-sidebar-active md:bg-transparent " : "")}
    >
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.label}
        className={cn(
          "h-8 md:h-12 py-0! px-0 md:px-2 text-[15px] md:text-[18px] rounded-[16px] cursor-pointer transition-all duration-300",
          "hover:bg-c-10 dark:hover:bg-black",
          isActive ? "md:bg-sidebar-active! " : "",
          sideBarState === "collapsed" && "justify-center my-3",
        )}
      >
        <Link
          to={item.href}
          className={cn("p-0", sideBarState !== "collapsed" && "justify-start")}
          // style={{ padding: "0px !important" }}
          onClick={() => {
            if (isMobile) {
              setOpenMobile(false);
            }
          }}
        >
          <div className="relative -right-1 size-4 md:size-8 py-2 flex shrink-0 items-center justify-center">
            {isActive ? item.selectedIcon : item.icon}
          </div>
          <span
            className={cn(
              "whitespace-nowrap max-md:w-[80%]",
              isActive
                ? "font-semibold text-c-90 dark:text-logo"
                : "font-normal text-c-70 dark:text-logo/80",
            )}
          >
            {item.label}
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function LogoComponent({
  logoIcon,
  logoText,
  homePageUrl,
}: {
  logoIcon?: ReactNode;
  logoText?: string;
  homePageUrl?: string;
}) {
  const { state: sideBarState, toggleSidebar } = useSidebar();

  let flexDir = "flex-row";
  try {
    flexDir = sideBarState === "collapsed" ? "flex-col" : "flex-row";
  } catch (error) {
    console.error(error);
  }

  return (
    <div
      className={cn(
        `mb-7 flex ${flexDir} justify-between items-center gap-3 px-2 text-[#234f3e] dark:text-logo`,
        sideBarState === "collapsed" && "px-0",
      )}
    >
      <Link to={(homePageUrl ?? "/") as any}>
        <div className="flex items-center gap-3">
          {logoIcon ?? <LogoIcon className="size-8 shrink-0" />}
          {sideBarState === "expanded" && (
            <div className="text-[20px] font-semibold tracking-[-0.04em]">
              {logoText ?? "Free9ja"}
            </div>
          )}
        </div>
      </Link>
      <div
        className="flex items-center justify-center rounded-full hover:bg-c-10 size-10 transition-all duration-300 cursor-pointer"
        onClick={toggleSidebar}
      >
        {sideBarState === "expanded" ? <SidebarIcon /> : <SidebarSolidIcon />}
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
  profilePopoverExtraContent,
}: {
  userDetails?: any;
  avatarUrl?: string;
  username?: string;
  displayName?: string;
  onLogout?: () => void | Promise<void>;
  homePageUrl?: string;
  profilePopoverExtraContent?: ReactNode;
}) {
  const { state: sideBarState, isMobile, openMobile } = useSidebar();

  const user = userDetails;

  const avatar = avatarUrl ?? user?.avatar_url;
  const dname =
    displayName ??
    (user?.first_name
      ? `${user.first_name} ${user.last_name}`
      : (user?.displayName ?? "User"));
  const uname = username ?? user?.username ?? "user";

  if (user === null || user === undefined) {
    if (sideBarState !== "collapsed") {
      return (
        <div className="flex flex-col gap-2 p-4">
          <Button asChild variant="green" className="w-full">
            <Link to="/auth/login">Log in</Link>
          </Button>
          <Button asChild variant="outline" className="w-full border-border">
            <Link to={"/auth/signup" as any}>Sign up</Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4 py-4 items-center justify-center">
        <Link
          to="/auth/login"
          className="flex items-center justify-center size-10 rounded-full hover:bg-c-10 dark:hover:bg-black"
          title="Log in"
        >
          <LogIn className="size-5 text-c-70" />
        </Link>
        <Link
          to={"/auth/signup" as any}
          className="flex items-center justify-center size-10 rounded-full hover:bg-c-10 dark:hover:bg-black"
          title="Sign up"
        >
          <UserPlus className="size-5 text-c-70" />
        </Link>
      </div>
    );
  }

  if (sideBarState === "collapsed" && !(isMobile && openMobile)) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <AppAvatar src={avatar} alt={dname} className="size-10" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="end"
          className="w-[300px] p-2 ml-2 rounded-[20px]"
        >
          <ProfileDropdown onLogout={onLogout} homePageUrl={homePageUrl} />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex gap-2 md:gap-2 w-full p-3 transition duration-300 hover:bg-sidebar-active dark:hover:bg-c-10 rounded-full cursor-pointer outline-none">
          <div className="md:flex-none">
            <AppAvatar src={avatar} alt={dname} className="size-10" />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[15px] md:text-[12px] font-semibold text-c-100 dark:text-logo mt-1 py-px text-left capitalize truncate overflow-hidden"
              style={{ maxWidth: "160px" }}
            >
              {dname}
            </p>
            <p
              className="mt-1 text-[12px] md:text-[12px] text-left text-c-80 dark:text-logo/80 truncate overflow-hidden"
              style={{ maxWidth: "160px" }}
            >
              @{uname}
            </p>
          </div>
          <div className="flex-none mt-2">
            <Ellipsis className="text-c-80 dark:text-logo/80 " />
          </div>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-[300px] p-2 mb-2 rounded-[20px]"
      >
        <ProfileDropdown onLogout={onLogout} homePageUrl={homePageUrl} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
