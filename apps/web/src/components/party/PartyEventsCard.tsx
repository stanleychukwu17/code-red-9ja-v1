import { HeaderAccent } from "@repo/ui/components/header-accent";
import type { PartyEvent } from "./types";

interface PartyEventsCardProps {
  title?: string;
  events?: PartyEvent[];
}

const DEFAULT_EVENTS: PartyEvent[] = [
  {
    id: "e1",
    title: "National Youth Convention",
    date: "Oct 15, 2026 • 10:00 AM",
    location: "Eagle Square, Abuja",
  },
  {
    id: "e2",
    title: "Party Policy & Strategy Summit",
    date: "Nov 02, 2026 • 02:00 PM",
    location: "Eko Hotel, Lagos",
  },
  {
    id: "e3",
    title: "State Grassroots Mobilization Rally",
    date: "Nov 20, 2026 • 11:30 AM",
    location: "Port Harcourt Stadium",
  },
];

export function PartyEventsCard({
  title = "Events",
  events = DEFAULT_EVENTS,
}: PartyEventsCardProps) {
  return (
    <div className="space-y-4">
      {/* Header with underline accent mark matching PartyLeadersCard */}
      <div className="relative">
        <div className="relative text-base sm:text-xl font-bold tracking-wide text-foreground z-2">
          {title}
        </div>
        <HeaderAccent />
      </div>

      {/* Card container */}
      <div className="bg-sidebar-mobile/50 rounded-[50px] p-6 sm:p-8">
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/40 shadow-xs hover:border-border transition-colors"
            >
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-semibold text-foreground">
                  {event.title}
                </h4>
                <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                  <span>{event.date}</span>
                  <span>•</span>
                  <span>{event.location}</span>
                </div>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-semibold rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors"
              >
                View
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
