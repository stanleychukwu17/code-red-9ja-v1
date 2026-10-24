import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";

export type HeaderAccentProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
  title?: React.ReactNode;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div" | "span";
  titleClassName?: string;
  accentColor?: string;
  fromColor?: string;
  accentClassName?: string;
  href?: string;
  to?: string;
  showArrow?: boolean;
  arrowClassName?: string;
};

export const HeaderAccent = React.forwardRef<HTMLDivElement, HeaderAccentProps>(
  (
    {
      title,
      children,
      as: Tag = "h2",
      titleClassName,
      accentColor = "var(--lime)",
      fromColor = "var(--sidebar-softer)",
      accentClassName,
      href,
      to,
      showArrow,
      arrowClassName,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const content = title ?? children;
    const linkTarget = to || href;
    const shouldShowArrow = Boolean(showArrow || linkTarget);

    const accentBar = (
      <div
        ref={!content ? ref : undefined}
        className={cn(
          "absolute top-4 left-0 h-4 w-1/2 z-0 pointer-events-none",
          !content ? className : accentClassName,
        )}
        style={{
          background: `linear-gradient(to right, ${fromColor}, ${accentColor})`,
          ...(!content ? style : undefined),
        }}
        {...(!content ? props : {})}
      />
    );

    // If no title or children provided, return accentBar directly
    if (!content) {
      return accentBar;
    }

    return (
      <div
        ref={ref}
        className={cn("relative inline-flex items-center gap-2 group", className)}
        style={style}
        {...props}
      >
        <div className="relative inline-block">
          <Tag className={cn("relative font-bold text-foreground z-2", titleClassName)}>
            {linkTarget ? (
              <Link to={linkTarget as any} className="hover:text-primary transition-colors">
                {content}
              </Link>
            ) : (
              content
            )}
          </Tag>
          {accentBar}
        </div>

        {shouldShowArrow && (
          linkTarget ? (
            <Link
              to={linkTarget as any}
              className={cn(
                "relative z-2 inline-flex items-center justify-center size-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all group-hover:translate-x-0.5",
                arrowClassName
              )}
              aria-label={typeof content === "string" ? `View ${content}` : "View details"}
            >
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <span
              className={cn(
                "relative z-2 inline-flex items-center justify-center text-muted-foreground",
                arrowClassName
              )}
            >
              <ArrowRight className="size-4" />
            </span>
          )
        )}
      </div>
    );
  }
);

HeaderAccent.displayName = "HeaderAccent";
