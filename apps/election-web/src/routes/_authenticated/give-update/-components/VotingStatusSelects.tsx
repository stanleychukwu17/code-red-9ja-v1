import { useState } from "react";
import { STATIC_STATUS_CATEGORIES, type StatusCategory } from "#/lib/constants/update-options";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Check, ChevronDown } from "lucide-react";

export type VotingStatusSelectsProps = {
  selectedStatusCategoryId: number;
  selectedStatusOptionId?: number;
  onStatusCategoryChange: (categoryId: number) => void;
  onStatusOptionChange: (optionId?: number) => void;
};

export function VotingStatusSelects({
  selectedStatusCategoryId,
  selectedStatusOptionId,
  onStatusCategoryChange,
  onStatusOptionChange,
}: VotingStatusSelectsProps) {
  // Modal open states for category and sub-option dialogs
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isOptionDialogOpen, setIsOptionDialogOpen] = useState(false);

  // Find currently active status category from bundled static options
  const activeCategory = STATIC_STATUS_CATEGORIES.find(
    (c) => c.id === selectedStatusCategoryId,
  ) as StatusCategory;

  // Find currently active sub-option
  const activeOption = activeCategory?.options.find(
    (o) => o.id === selectedStatusOptionId,
  );

  const handleCategorySelect = (catId: number) => {
    onStatusCategoryChange(catId);
    // Sub-option is optional: reset to undefined when category changes
    onStatusOptionChange(undefined);
    setIsCategoryDialogOpen(false);
  };

  const handleOptionSelect = (optId?: number) => {
    onStatusOptionChange(optId);
    setIsOptionDialogOpen(false);
  };

  return (
    <>
      {/* Primary voting status trigger button */}
      <div className="space-y-1.5">
        <label className="text-xs sm:text-sm font-semibold text-foreground">
          Voting status
        </label>
        <button
          type="button"
          onClick={() => setIsCategoryDialogOpen(true)}
          className="w-full bg-[#F3F4F8] dark:bg-muted/40 border-0 rounded-xl px-4 py-3.5 text-sm font-semibold text-foreground outline-none cursor-pointer flex items-center justify-between hover:bg-[#EBEDF2] dark:hover:bg-muted/60 transition"
        >
          <span className="truncate">{activeCategory?.name || "Select status"}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground ml-2" />
        </button>
      </div>

      {/* Contextual sub-option trigger button (auto-hidden when category has no options e.g. Just Arrived) */}
      {activeCategory?.options.length > 0 ? (
        <div className="space-y-1.5">
          <label className="text-xs sm:text-sm font-semibold text-foreground">
            More on voting status
          </label>
          <button
            type="button"
            onClick={() => setIsOptionDialogOpen(true)}
            className="w-full bg-[#F3F4F8] dark:bg-muted/40 border-0 rounded-xl px-4 py-3.5 text-sm font-semibold text-foreground outline-none cursor-pointer flex items-center justify-between hover:bg-[#EBEDF2] dark:hover:bg-muted/60 transition"
          >
            <span
              className={`truncate ${activeOption ? "text-foreground" : "text-muted-foreground font-normal"
                }`}
            >
              {activeOption?.name || "Select detail (optional)"}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground ml-2" />
          </button>
        </div>
      ) : (
        <div className="hidden sm:block" />
      )}

      {/* Modal Dialog to pick from all status categories */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-md w-[92vw] p-5 rounded-2xl bg-card border border-border space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              Select Voting Status
            </DialogTitle>
          </DialogHeader>

          {/* List of status categories */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {STATIC_STATUS_CATEGORIES.map((cat) => {
              const isSelected = cat.id === selectedStatusCategoryId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition flex items-start justify-between gap-3 cursor-pointer ${isSelected
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-border/60 hover:bg-muted/50 bg-background"
                    }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">
                      {cat.name}
                    </p>
                    {cat.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {cat.description}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <span className="size-5 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="size-3 text-primary-foreground stroke-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog to pick sub-options for the active category */}
      <Dialog open={isOptionDialogOpen} onOpenChange={setIsOptionDialogOpen}>
        <DialogContent className="max-w-md w-[92vw] p-5 rounded-2xl bg-card border border-border space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              More on {activeCategory?.name}
            </DialogTitle>
          </DialogHeader>

          {/* List of sub-options */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {/* Clear selection option */}
            <button
              type="button"
              onClick={() => handleOptionSelect(undefined)}
              className={`w-full text-left p-3.5 rounded-xl border transition flex items-start justify-between gap-3 cursor-pointer ${!selectedStatusOptionId
                ? "border-primary bg-primary/5 dark:bg-primary/10"
                : "border-border/60 hover:bg-muted/50 bg-background"
                }`}
            >
              <p className="text-sm font-semibold text-foreground">
                No specific detail (General update)
              </p>
              {!selectedStatusOptionId && (
                <span className="size-5 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="size-3 text-primary-foreground stroke-3" />
                </span>
              )}
            </button>

            {activeCategory?.options.map((opt) => {
              const isSelected = opt.id === selectedStatusOptionId;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleOptionSelect(opt.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition flex items-start justify-between gap-3 cursor-pointer ${isSelected
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-border/60 hover:bg-muted/50 bg-background"
                    }`}
                >
                  <p className="text-sm font-semibold text-foreground">
                    {opt.name}
                  </p>
                  {isSelected && (
                    <span className="size-5 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="size-3 text-primary-foreground stroke-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
