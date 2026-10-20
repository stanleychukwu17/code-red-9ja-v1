import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, MapPin, Building2, SlidersHorizontal, Landmark, Globe } from "lucide-react";
import { Input } from "@repo/ui/components/input";

export const Route = createFileRoute(
  "/_authenticated/party/$partyName/$partyId/party-chapters",
)({
  component: PartyChaptersTabComponent,
});

type ChapterTierFilter = "all" | "national" | "state" | "lga" | "ward";

function PartyChaptersTabComponent() {
  const { partyName, partyId } = Route.useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<ChapterTierFilter>("all");

  const tierFilters: { id: ChapterTierFilter; label: string; count?: number }[] = [
    { id: "all", label: "All Chapters" },
    { id: "national", label: "National" },
    { id: "state", label: "State" },
    { id: "lga", label: "LGA" },
    { id: "ward", label: "Ward" },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {partyName.toUpperCase()} Chapters
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Browse registered chapters across Nigeria or search for your local chapter by state, LGA, or ward.
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chapters by state, LGA, or city..."
            className="pl-10 h-11 bg-card border-border/60 rounded-xl"
          />
        </div>

        {/* Tier filter pill buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {tierFilters.map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => setSelectedTier(tier.id)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                selectedTier === tier.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chapters Content Placeholder / Workspace */}
      <div className="rounded-2xl border border-dashed border-border/80 bg-card/50 p-8 sm:p-12 text-center">
        <div className="mx-auto size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
          <Landmark className="size-7" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          Find or Explore {partyName.toUpperCase()} Chapters
        </h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
          Here you will be able to search and view all available national, state, local government, and ward chapters.
        </p>
      </div>
    </div>
  );
}
