import { useRef, useState, useEffect, useCallback } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { PARTY_NAV_TABS } from "./types";

interface PartyNavTabsProps {
  partyName: string;
  partyId: string;
}

export function PartyNavTabs({ partyName, partyId }: PartyNavTabsProps) {
  // Current route location to highlight active tab
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  // =========================================================================
  // SCROLL BUTTON & OVERFLOW TRACKING: START
  // =========================================================================
  // Reference to the scrollable tab container
  const navRef = useRef<HTMLElement>(null);

  // Track whether left/right scroll arrows should be shown
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll boundary positions to dynamically toggle arrow buttons
  const checkScroll = useCallback(() => {
    const el = navRef.current;
    if (!el) return;

    // Get the scroll boundaries from the element
    const { scrollLeft, scrollWidth, clientWidth } = el;

    setCanScrollLeft(scrollLeft > 2); // Show left button if we've scrolled forward by at least 2px
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2); // Show right button if there is still un-viewed content to the right
  }, []);

  // Listen for scroll & window resize events to keep button visibility in sync
  useEffect(() => {
    const el = navRef.current;

    // Guard clause: exit if the nav container hasn't mounted yet
    if (!el) return;

    // Run an immediate check on mount to set initial button visibility
    checkScroll();

    // Re-check whenever the user scrolls horizontally (passive for better scroll performance)
    el.addEventListener("scroll", checkScroll, { passive: true });

    // Re-check whenever the viewport/window resizes (which changes clientWidth)
    window.addEventListener("resize", checkScroll);

    // Clean up event listeners on unmount or before re-running the effect
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  // Smoothly step the navigation left or right on arrow button click
  const scroll = (direction: "left" | "right") => {
    const el = navRef.current;
    if (!el) return;

    const scrollAmount = 240;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };
  // =========================================================================
  // SCROLL BUTTON & OVERFLOW TRACKING: END
  // =========================================================================

  return (
    <div className="relative max-w-3xl w-full md:w-fit group">
      {/* Scroll Left Button: Only visible when scrolled to the right */}
      {canScrollLeft && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 z-10 flex items-center pr-2">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Scroll tabs left"
            className="size-7 rounded-full bg-background/90 hover:bg-background text-foreground shadow-md backdrop-blur-xs border border-border/50 flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Navigation Tab Bar Container */}
      <nav
        ref={navRef}
        aria-label="Party navigation tabs"
        className="w-full md:w-fit rounded-full overflow-x-auto no-scrollbar py-2 px-3 bg-sidebar-softer"
      >
        <div className="flex items-center gap-2 min-w-max">
          {PARTY_NAV_TABS.map((tab) => {
            const tabHref = `/party/${partyName.toLowerCase()}/${partyId}/${tab.path}`;
            const isActive = currentPath.endsWith(`/${tab.path}`);

            return (
              <Link
                key={tab.path}
                to={tabHref}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-3 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer no-underline",
                  isActive
                    ? "bg-hover-10 text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-hover-5"
                )}
              >
                {/* Tab icon and label */}
                <tab.icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Scroll Right Button: Only visible when more tabs exist offscreen */}
      {canScrollRight && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10 flex items-center pl-2">
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Scroll tabs right"
            className="size-7 rounded-full bg-background/90 hover:bg-background text-foreground shadow-md backdrop-blur-xs border border-border/50 flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      )}
    </div>
  );
}
