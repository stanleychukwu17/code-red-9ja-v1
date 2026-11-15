import { useRef, useState, useEffect, useCallback } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export type ScrollableTabItem = {
  id?: string;
  path?: string;
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
  onClick?: () => void;
  badge?: React.ReactNode;
};

export type ScrollableNavTabsProps = {
  tabs: ScrollableTabItem[];
  className?: string;
  navClassName?: string;
  ariaLabel?: string;
  scrollAmount?: number;
};

export function ScrollableNavTabs({
  tabs,
  className,
  navClassName,
  ariaLabel = "Navigation tabs",
  scrollAmount = 240,
}: ScrollableNavTabsProps) {
  const routerState = useRouterState();
  const currentPath = routerState?.location?.pathname ?? "";

  const navRef = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = navRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = navRef.current;
    if (!el) return;

    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className={cn("relative max-w-3xl w-full md:w-fit group", className)}>
      {/* Scroll Left Button */}
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
        aria-label={ariaLabel}
        className={cn(
          "w-full md:w-fit rounded-full overflow-x-auto no-scrollbar py-2 px-3 bg-sidebar-softer",
          navClassName
        )}
      >
        <div className="flex items-center gap-2 min-w-max">
          {tabs.map((tab) => {
            const key = tab.id || tab.path || tab.href || tab.label;
            const Icon = tab.icon;
            const isTabActive =
              tab.isActive !== undefined
                ? tab.isActive
                : tab.href
                  ? currentPath === tab.href || (tab.path && currentPath.endsWith(`/${tab.path}`))
                  : false;

            const tabContent = (
              <>
                {Icon && <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />}
                <span>{tab.label}</span>
                {tab.badge}
              </>
            );

            const tabClassName = cn(
              "flex items-center gap-1.5 px-4 py-3 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer no-underline",
              isTabActive
                ? "bg-hover-10 text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-hover-5"
            );

            if (tab.onClick || !tab.href) {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={tab.onClick}
                  className={tabClassName}
                >
                  {tabContent}
                </button>
              );
            }

            return (
              <Link
                key={key}
                to={tab.href}
                className={tabClassName}
              >
                {tabContent}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Scroll Right Button */}
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
