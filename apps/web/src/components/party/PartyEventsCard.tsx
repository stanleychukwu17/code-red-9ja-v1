import { Link } from "@tanstack/react-router";
import { HeaderAccent } from "@repo/ui/components/header-accent";
import { Skeleton } from "@repo/ui/components/skeleton";
import { CalendarDays, MapPin } from "lucide-react";
import type { PartyEventData } from "@/lib/server/parties";
import type { PartyEvent } from "./types";

export interface UnifiedPartyEvent {
  id: string | number;
  title: string;
  date?: string;
  location?: string;
  venue_name?: string;
  starts_at?: string;
}

interface PartyEventsCardProps {
  title?: string;
  events?: (PartyEventData | PartyEvent | UnifiedPartyEvent)[];
  isLoading?: boolean;
  href?: string;
}

function formatEventDate(startsAt?: string, fallbackDate?: string): string {
  if (fallbackDate) return fallbackDate;
  if (!startsAt) return "";
  try {
    const d = new Date(startsAt);
    if (isNaN(d.getTime())) return startsAt;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return startsAt;
  }
}

export function PartyEventsCard({
  title = "Events",
  events = [],
  isLoading = false,
  href,
}: PartyEventsCardProps) {
  return (
    <div className="space-y-4">
      {/* Header with underline accent mark matching PartyLeadersCard */}
      <HeaderAccent
        as="div"
        title={title}
        titleClassName="text-base sm:text-xl font-bold tracking-wide text-foreground"
        href={href}
      />

      {/* Card container */}
      <div className="bg-sidebar-mobile/50 rounded-[50px] p-6 sm:p-8 min-h-[220px] flex flex-col justify-center">
        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((idx) => (
              <div
                key={`event-skeleton-${idx}`}
                className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/40 shadow-xs"
              >
                <div className="space-y-2 flex-1 mr-4">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
                <Skeleton className="h-7 w-14 rounded-full" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-6 px-4 space-y-2">
            <CalendarDays className="size-8 mx-auto text-muted-foreground/60" />
            <h4 className="text-sm font-semibold text-foreground">
              No Upcoming Events
            </h4>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              There are currently no upcoming events or meetings scheduled for this chapter.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const displayDate = formatEventDate(
                "starts_at" in event ? event.starts_at : undefined,
                "date" in event ? event.date : undefined,
              );
              const displayLocation =
                "venue_name" in event && event.venue_name
                  ? `${event.venue_name}${event.location ? ` • ${event.location}` : ""}`
                  : event.location || "";

              const content = (
                <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/40 shadow-xs hover:border-border transition-colors w-full group">
                  <div className="space-y-1 text-left min-w-0 pr-3">
                    <h4 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {event.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      {displayDate && <span>{displayDate}</span>}
                      {displayDate && displayLocation && <span>•</span>}
                      {displayLocation && (
                        <span className="line-clamp-1 flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground shrink-0" />
                          {displayLocation}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-foreground/5 group-hover:bg-foreground/10 text-foreground transition-colors shrink-0">
                    View
                  </span>
                </div>
              );

              if (href) {
                return (
                  <Link key={event.id} to={href} className="block">
                    {content}
                  </Link>
                );
              }

              return <div key={event.id}>{content}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
