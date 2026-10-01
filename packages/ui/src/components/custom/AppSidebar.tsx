import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  PanelLeftClose,
  PanelRightClose,
  ChevronRight,
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
import { useTheme, type ThemeMode } from "../../hooks/use-theme";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../collapsible";
import LogoIcon from "@repo/ui/icons/logo-icon";
import { Button } from "@repo/ui/components/button";
import { cn } from "../../lib/utils";
import { useIsMobile } from "../../hooks/useMobile";
import SidebarIcon from "../../icons/navbar/sidebar-icon";
import SidebarSolidIcon from "../../icons/navbar/sidebar-solid-icon";
import { ProfileDropdown } from "../dropdowns/ProfileDropdown";

// ============================================================================
// TYPES
// ============================================================================

/** Nested submenu item definition */
export type AppSidebarSubItem = {
  id: string;
  label: string;
  href: string;
  icon?: ReactNode;
};

/** Primary navigation link definition (can include nested sub-items) */
export type AppSidebarItem = {
  id: string;
  label: string;
  icon: ReactNode;
  selectedIcon: ReactNode;
  href?: string;
  items?: AppSidebarSubItem[];
};

/** Shell props used to configure the entire sidebar provider and trigger */
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

// ============================================================================
// 1. APP SIDEBAR SHELL
// Top-level provider wrapping the desktop sidebar and mobile top navigation bar.
// ============================================================================
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

  // Do not render the sidebar shell on authentication pages
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

      {/* Mobile top header bar (hidden on md+ screens) */}
      <main className="bg-sidebar md:hidden h-12 flex flex-1 flex-col">
        <div className="flex items-center justify-between px-4 w-dvw py-2">
          {/* Mobile brand logo */}
          <div>
            <Link to={(homePageUrl ?? "/") as any}>
              <LogoIcon className="size-8 shrink-0 text-[#234f3e] dark:text-logo" />
            </Link>
          </div>

          {/* Mobile sidebar trigger / avatar */}
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

// ============================================================================
// 2. MAIN APP SIDEBAR
// Renders the collapsible sidebar container: logo, menu links, and profile footer.
// ============================================================================
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
  const isFirstMountRef = useRef(true);
  const prevSidebarStateRef = useRef(sideBarState);

  // Notify parent component on collapse/expand changes (skip initial mount)
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }

    if (prevSidebarStateRef.current !== sideBarState) {
      prevSidebarStateRef.current = sideBarState;
      onSidebarStateChange?.(sideBarState);
    }
  }, [sideBarState, onSidebarStateChange]);

  return (
    <Sidebar collapsible="icon" className="md:data-[side=left]:left-0">
      <div className="bg-sidebar-mobile md:bg-sidebar flex h-full flex-col px-4 pt-7">
        {/* Brand logo & collapse toggle */}
        <LogoComponent
          logoIcon={logoIcon}
          logoText={logoText}
          homePageUrl={homePageUrl}
        />

        {/* Primary navigation list */}
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

        {/* Footer profile & auth controls */}
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

// ============================================================================
// 3. HELPER HOOK: ACTIVE ITEM MATCHER
// Detects which menu item is currently active by comparing URL path to IDs & sub-routes.
// ============================================================================
function useActiveItem(items: AppSidebarItem[]): string {
  const location = useLocation();
  let activeItem: string = "";

  items.forEach((item) => {
    const toMatch = `/${item.id}`;

    // Direct match against top-level route
    if (location.pathname.startsWith(toMatch)) {
      activeItem = item.id;
    } else if (
      location.pathname.includes(toMatch) ||
      location.pathname.endsWith(toMatch)
    ) {
      activeItem = item.id;
      // Or match against any of the nested sub-item links
    } else if (
      item.items?.some(
        (sub) =>
          location.pathname.startsWith(sub.href) ||
          location.pathname.includes(`/${sub.id}`),
      )
    ) {
      activeItem = item.id;
    }
  });

  return activeItem;
}

// ============================================================================
// 4. EACH LINK COMPONENT
// Handles single flat navigation items; delegates to CollapsibleNavItem when sub-items exist.
// ============================================================================
function EachLinkComponent({ item, isActive }: { item: AppSidebarItem; isActive: boolean }) {
  // If the item has nested links, delegate to the collapsible component
  if (item.items && item.items.length > 0) {
    return <CollapsibleNavItem item={item} isActive={isActive} />;
  }

  const { state: sideBarState, setOpenMobile, isMobile } = useSidebar();

  return (
    <SidebarMenuItem className={cn(isActive ? "bg-sidebar-active md:bg-transparent " : "")}>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.label}
        className={cn(
          "h-8 md:h-10 py-0! px-0 md:px-2 text-[15px] md:text-[16px] rounded-2xl cursor-pointer transition-all duration-300",
          "hover:bg-c-10 dark:hover:bg-black",
          isActive ? "md:bg-sidebar-active! " : "",
          sideBarState === "collapsed" && "justify-center my-0.5",
        )}
      >
        <Link
          to={item.href}
          className={cn(
            "p-0",
            sideBarState !== "collapsed" && "justify-start",
          )}
          onClick={() => {
            if (isMobile) {
              setOpenMobile(false);
            }
          }}
        >
          {/* Active vs inactive icon */}
          <div className="relative -right-1 size-6 md:size-8 py-2 flex shrink-0 items-center justify-center [&_svg]:size-full!">
            {isActive ? item.selectedIcon : item.icon}
          </div>
          <span
            className={cn(
              "whitespace-nowrap max-md:w-[80%]",
              isActive ? "font-semibold text-c-90 dark:text-logo" : "font-normal text-c-70 dark:text-logo/80",
            )}
          >
            {item.label}
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

// ============================================================================
// 5. COLLAPSIBLE NAV ITEM
// Renders nested sub-items:
// - Collapsed desktop mode: Floating flyout DropdownMenu to the right
// - Expanded desktop & mobile: Inline smooth Collapsible accordion with Chevron
// ============================================================================
function CollapsibleNavItem({ item, isActive }: { item: AppSidebarItem; isActive: boolean }) {
  const { state: sideBarState, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();

  // Mode A: Collapsed desktop sidebar -> Flyout DropdownMenu to the right
  if (sideBarState === "collapsed" && !isMobile) {
    return (
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              isActive={isActive}
              tooltip={item.label}
              className={cn(
                "h-8 md:h-10 py-0! px-0 md:px-2 text-[15px] md:text-[16px] rounded-2xl cursor-pointer transition-all duration-300",
                "hover:bg-c-10 dark:hover:bg-black",
                isActive ? "md:bg-sidebar-active!" : "",
                "justify-center my-1",
              )}
            >
              <div className="relative -right-0.1 size-6 md:size-8 py-2 flex shrink-0 items-center justify-center [&_svg]:size-full!">
                {isActive ? item.selectedIcon : item.icon}
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="right" align="start" className="w-56 p-2 rounded-2xl">
            <DropdownMenuLabel className="font-semibold text-c-100 dark:text-logo px-2 py-1.5 text-sm">
              {item.label}
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="my-1" />

            {item.items?.map((sub) => {
              const isSubActive =
                location.pathname.startsWith(sub.href) ||
                location.pathname.includes(`/${sub.id}`);

              return (
                <DropdownMenuItem key={sub.id} asChild className="focus:bg-c-10 dark:focus:bg-black">
                  <Link
                    to={sub.href as any}
                    className={cn(
                      "flex items-center gap-2 text-sm transition-all duration-200 cursor-pointer w-full px-2.5 py-1.5 rounded-xl",
                      "hover:text-c-100 dark:hover:text-logo",
                      isSubActive
                        ? "font-semibold text-c-100 dark:text-logo"
                        : "font-normal text-c-70 dark:text-logo/80",
                    )}
                  >
                    {sub.icon && <span className="size-4 shrink-0 [&_svg]:size-full!">{sub.icon}</span>}
                    <span className="truncate">{sub.label}</span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

  // Mode B: Expanded desktop or mobile drawer -> Smooth Inline Collapsible Accordion
  return (
    <Collapsible defaultOpen={isActive} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            isActive={isActive}
            tooltip={item.label}
            className={cn(
              "h-8 md:h-10 py-0! px-0 md:px-2 text-[15px] md:text-[16px] rounded-2xl cursor-pointer transition-all duration-300 w-full",
              "hover:bg-c-10 dark:hover:bg-black",
              isActive ? "md:bg-sidebar-active!" : "",
            )}
          >
            <div className="relative -right-1 size-6 md:size-8 py-2 flex shrink-0 items-center justify-center [&_svg]:size-full!">
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
            <ChevronRight className="ml-auto mt-1 size-4.5! transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-c-70 dark:text-logo/70" />
          </SidebarMenuButton>
        </CollapsibleTrigger>

        {/* Collapsible Sub-item links */}
        <CollapsibleContent>
          <SidebarMenuSub className="mx-2 my-1 border-l border-c-10 dark:border-white/10 pl-3 space-y-1">
            {item.items?.map((sub) => {
              const isSubActive =
                location.pathname.startsWith(sub.href) ||
                location.pathname.includes(`/${sub.id}`);

              return (
                <SidebarMenuSubItem key={sub.id} className="group/sub-item relative flex items-center">
                  <SidebarMenuSubButton
                    asChild
                    isActive={isSubActive}
                    className={cn(
                      "h-8 rounded-xl px-2.5 text-sm transition-all duration-200 cursor-pointer w-full",
                      "hover:bg-c-10! dark:hover:bg-black! hover:text-c-100 dark:hover:text-logo",
                      isSubActive
                        ? "font-semibold text-c-100 dark:text-logo bg-sidebar-active! dark:bg-black!"
                        : "font-normal text-c-70 dark:text-logo/80",
                    )}
                  >
                    <Link
                      to={sub.href as any}
                      className="flex items-center w-full"
                      onClick={() => {
                        if (isMobile) {
                          setOpenMobile(false);
                        }
                      }}
                    >
                      {sub.icon && <span className="size-3.5 shrink-0 mr-1.5">{sub.icon}</span>}
                      <span className="truncate flex-1">{sub.label}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

// ============================================================================
// 6. LOGO COMPONENT
// Brand logo, app name, and toggle expand/collapse button.
// ============================================================================
function LogoComponent({
  logoIcon,
  logoText,
  homePageUrl,
}: { logoIcon?: ReactNode; logoText?: string; homePageUrl?: string }) {
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

// ============================================================================
// 7. PROFILE PICTURE & FOOTER
// User avatar, name, handle, and settings/logout dropdown menu,
// or guest Login/Sign up buttons.
// ============================================================================
type ProfilePictureProps = {
  userDetails?: any;
  avatarUrl?: string;
  username?: string;
  displayName?: string;
  onLogout?: () => void | Promise<void>;
  homePageUrl?: string;
  profilePopoverExtraContent?: ReactNode;
};

function ProfilePicture({
  userDetails, avatarUrl, username, displayName, onLogout, homePageUrl,
}: ProfilePictureProps) {
  const { state: sideBarState, isMobile, openMobile } = useSidebar();

  const user = userDetails;
  const avatar = avatarUrl ?? user?.avatar_url;
  const dname =
    displayName ??
    (user?.first_name
      ? `${user.first_name} ${user.last_name}`
      : (user?.displayName ?? "User"));
  const uname = username ?? user?.username ?? "user";

  // Guest State: Show Login & Sign Up buttons
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

  // Collapsed Mode: Avatar-only button with flyout DropdownMenu to the right
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
          <ProfileDropdown
            onLogout={onLogout}
            homePageUrl={homePageUrl}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Expanded Mode: Full profile pill card with avatar, name, handle & ellipsis
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
            <Ellipsis className="text-c-80 dark:text-logo/80" />
          </div>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-[300px] p-2 mb-2 rounded-[20px]"
      >
        <ProfileDropdown
          onLogout={onLogout}
          homePageUrl={homePageUrl}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
