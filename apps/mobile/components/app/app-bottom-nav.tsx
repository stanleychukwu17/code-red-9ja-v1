import { usePathname, useRouter } from "expo-router";
import { type ComponentProps, type ComponentType } from "react";
import {
  Pressable,
  Text,
  View,
  type PressableProps,
  type TextProps,
  type ViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { SvgProps } from "react-native-svg";

import { cn } from "@/components/ui/cn";
import {
  NavbarFeedIcon,
  NavbarFeedSolidIcon,
  NavbarHomeIcon,
  NavbarHomeSolidIcon,
  NavbarPostIcon,
  NavbarProfileIcon,
  NavbarProfileSolidIcon,
  NavbarSearchIcon,
  NavbarSearchSolidIcon,
} from "@/components/ui/icons";

const StyledView = View as unknown as ComponentType<
  ViewProps & { className?: string }
>;
const StyledSafeAreaView = SafeAreaView as unknown as ComponentType<
  ComponentProps<typeof SafeAreaView> & { className?: string }
>;
const StyledText = Text as unknown as ComponentType<
  TextProps & { className?: string }
>;
const StyledPressable = Pressable as unknown as ComponentType<
  PressableProps & { className?: string }
>;

type RouteName = "dashboard" | "feed" | "search" | "profile";
type NavIcon = ComponentType<SvgProps>;

const NAV_ITEMS: {
  label: string;
  route?: RouteName;
  icon: NavIcon;
  activeIcon?: NavIcon;
  isPost?: boolean;
}[] = [
  {
    label: "Home",
    route: "dashboard",
    icon: NavbarHomeIcon,
    activeIcon: NavbarHomeSolidIcon,
  },
  {
    label: "Feed",
    route: "feed",
    icon: NavbarFeedIcon,
    activeIcon: NavbarFeedSolidIcon,
  },
  { label: "Post", icon: NavbarPostIcon, isPost: true },
  {
    label: "Search",
    route: "search",
    icon: NavbarSearchIcon,
    activeIcon: NavbarSearchSolidIcon,
  },
  {
    label: "Profile",
    route: "profile",
    icon: NavbarProfileIcon,
    activeIcon: NavbarProfileSolidIcon,
  },
];

function getCurrentRoute(pathname: string): RouteName | null {
  if (pathname.endsWith("/dashboard")) return "dashboard";
  if (pathname.endsWith("/feed")) return "feed";
  if (pathname.endsWith("/search")) return "search";
  if (pathname.endsWith("/profile")) return "profile";
  return null;
}

export function AppBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const currentRoute = getCurrentRoute(pathname);

  return (
    <StyledSafeAreaView
      edges={["bottom"]}
      className="absolute bottom-0 left-0 right-0 border-t border-[#EFE7B7] bg-white px-6 pt-3"
    >
      <StyledView className="flex-row items-end justify-between">
        {NAV_ITEMS.map((item) => {
          const active = item.route ? currentRoute === item.route : false;
          const Icon = active && item.activeIcon ? item.activeIcon : item.icon;

          return (
            <StyledPressable
              key={item.label}
              className="items-center"
              hitSlop={8}
              onPress={() => {
                if (item.isPost) {
                  router.push("/post");
                  return;
                }
                if (!item.route || currentRoute === item.route) {
                  return;
                }
                router.navigate(`/${item.route}`);
              }}
            >
              <Icon
                width={item.label === "Post" ? 28 : 24}
                height={item.label === "Post" ? 28 : 24}
                color={active ? "#1D1D1D" : "#6E6B6D"}
              />
              <StyledText
                className={cn(
                  "mt-1 text-[11px]",
                  active ? "text-[#1D1D1D]" : "text-[#6E6B6D]",
                )}
              >
                {item.label}
              </StyledText>
            </StyledPressable>
          );
        })}
      </StyledView>
    </StyledSafeAreaView>
  );
}
