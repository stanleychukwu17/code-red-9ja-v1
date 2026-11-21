import { useState } from "react";
import { STATIC_ISSUE_CATEGORIES } from "#/lib/constants/update-options";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Check, ChevronDown, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";

export type ActiveIssueItem = {
  id: number;
  issueName: string;
};

export type VotingIssueSelectsProps = {
  issueActionValue: string;
  onIssueActionValueChange: (val: string) => void;
  selectedIssueOptionIds: number[];
  onIssueOptionIdsChange: (optionIds: number[]) => void;
  activeIssuesList: ActiveIssueItem[];
  forWho?: "agent" | "supervisor";
};

export function VotingIssueSelects({
  issueActionValue,
  onIssueActionValueChange,
  selectedIssueOptionIds,
  onIssueOptionIdsChange,
  activeIssuesList,
  forWho = "agent",
}: VotingIssueSelectsProps) {
  // Modal open states for action dialog and multi-select detail dialog
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Set of expanded issue category IDs in the dialog (default opens first category)
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<number[]>([1]);

  const toggleCategoryExpand = (catId: number) => {
    setExpandedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId],
    );
  };

  // Derived state
  const isExistingIssue = issueActionValue.startsWith("existing_");
  const isNewIssue = issueActionValue === "new";
  const existingIssueId = isExistingIssue ? Number(issueActionValue.replace("existing_", "")) : undefined;
  const linkedActiveIssue = activeIssuesList.find((i) => i.id === existingIssueId);

  // Handle action selection
  const handleActionSelect = (action: string) => {
    onIssueActionValueChange(action);
    setIsActionDialogOpen(false);

    // If user tapped report new issue, auto open the specific issue dialog
    if (action === "new") {
      setIsDetailDialogOpen(true);
    } else {
      onIssueOptionIdsChange([]);
    }
  };

  // Toggle selection for multiple issue options
  const toggleIssueOption = (optId: number) => {
    if (selectedIssueOptionIds.includes(optId)) {
      onIssueOptionIdsChange(selectedIssueOptionIds.filter((id) => id !== optId));
    } else {
      onIssueOptionIdsChange([...selectedIssueOptionIds, optId]);
    }
  };

  // Label for the action trigger
  const getActionTriggerLabel = () => {
    if (isExistingIssue && linkedActiveIssue) {
      return `Ongoing: ${linkedActiveIssue.issueName}`;
    }
    if (isNewIssue) {
      return "+ Report a new issue";
    }
    return "None (All smooth)";
  };

  // Label for the multi-select issue detail trigger
  const getDetailTriggerLabel = () => {
    const count = selectedIssueOptionIds.length;
    if (count === 0) return "Select specific issues";
    if (count === 1) {
      for (const cat of STATIC_ISSUE_CATEGORIES) {
        const found = cat.options.find((o) => o.id === selectedIssueOptionIds[0]);
        if (found) return found.name;
      }
    }
    return `${count} issues selected`;
  };

  return (
    <>
      {/* Any ongoing issues trigger */}
      <div className="space-y-1.5">
        <label className="text-xs sm:text-sm font-semibold text-foreground">
          Any ongoing issues?
        </label>
        <button
          type="button"
          onClick={() => setIsActionDialogOpen(true)}
          className={`w-full border-0 rounded-xl px-4 py-3.5 text-sm font-semibold outline-none cursor-pointer flex items-center justify-between transition ${isExistingIssue
            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
            : isNewIssue
              ? "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20"
              : "bg-[#F3F4F8] dark:bg-muted/40 text-foreground hover:bg-[#EBEDF2] dark:hover:bg-muted/60"
            }`}
        >
          <span className="truncate">{getActionTriggerLabel()}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground ml-2" />
        </button>
      </div>

      {/* Detail issue multi-select trigger or context pill */}
      {isNewIssue ? (
        <div className="space-y-1.5">
          <label className="text-xs sm:text-sm font-semibold text-foreground">
            What is the issue going on
          </label>
          <button
            type="button"
            onClick={() => setIsDetailDialogOpen(true)}
            className="w-full bg-[#F3F4F8] dark:bg-muted/40 border-0 rounded-xl px-4 py-3.5 text-sm font-semibold text-foreground outline-none cursor-pointer flex items-center justify-between hover:bg-[#EBEDF2] dark:hover:bg-muted/60 transition"
          >
            <span
              className={`truncate ${selectedIssueOptionIds.length > 0
                ? "text-foreground"
                : "text-muted-foreground font-normal"
                }`}
            >
              {getDetailTriggerLabel()}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground ml-2" />
          </button>
        </div>
      ) : isExistingIssue ? (
        <div className="space-y-1.5">
          <label className="text-xs sm:text-sm font-semibold text-foreground">
            Issue context
          </label>
          <div className="w-full bg-amber-500/10 dark:bg-amber-500/20 rounded-xl px-4 py-3.5 text-sm font-medium text-amber-700 dark:text-amber-400 truncate flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>Linking update to ongoing issue</span>
          </div>
        </div>
      ) : (
        <div className="hidden sm:block" />
      )}

      {/* Dialog 1: Pick Issue Action */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="max-w-md w-[92vw] p-5 rounded-2xl bg-card border border-border space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              Any Ongoing Issues?
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {/* Option 1: None (All smooth) */}
            <button
              type="button"
              onClick={() => handleActionSelect("none")}
              className={`w-full text-left p-3.5 rounded-xl border transition flex items-start justify-between gap-3 cursor-pointer ${issueActionValue === "none"
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-border/60 hover:bg-muted/50 bg-background"
                }`}
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="size-5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-foreground">
                    None (All smooth)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    No active disruption or crisis at this polling unit
                  </p>
                </div>
              </div>
              {issueActionValue === "none" && (
                <span className="size-5 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="size-3 text-white stroke-3" />
                </span>
              )}
            </button>

            {/* Option 2: Active ongoing issues list */}
            {activeIssuesList.map((issue) => {
              const val = `existing_${issue.id}`;
              const isSelected = issueActionValue === val;
              return (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => handleActionSelect(val)}
                  className={`w-full text-left p-3.5 rounded-xl border transition flex items-start justify-between gap-3 cursor-pointer ${isSelected
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-border/60 hover:bg-muted/50 bg-background"
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="size-5 text-amber-600 mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-foreground">
                        Ongoing: {issue.issueName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Provide a progress or status update on this open issue
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="size-5 rounded-full bg-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="size-3 text-white stroke-3" />
                    </span>
                  )}
                </button>
              );
            })}

            {/* Option 3: Report a new issue */}
            <button
              type="button"
              onClick={() => handleActionSelect("new")}
              className={`w-full text-left p-3.5 rounded-xl border transition flex items-start justify-between gap-3 cursor-pointer ${issueActionValue === "new"
                ? "border-red-500 bg-red-500/10"
                : "border-border/60 hover:bg-muted/50 bg-background"
                }`}
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className="size-5 text-red-600 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-foreground">
                    + Report a new issue
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Report violence, BVAS technical failure, missing materials, or malpractice
                  </p>
                </div>
              </div>
              {issueActionValue === "new" && (
                <span className="size-5 rounded-full bg-red-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="size-3 text-white stroke-3" />
                </span>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Multi-Select Specific New Issues */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-md w-[92vw] p-5 rounded-2xl bg-card border border-border flex flex-col max-h-[85vh]">
          <DialogHeader className="shrink-0 pb-2 flex-col items-start px-0 pt-0 gap-1">
            <DialogTitle className="text-xl font-bold text-foreground">
              What issues are going on?
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Select all issues that apply at this polling unit
            </p>
          </DialogHeader>

          {/* Grouped list of issue categories and options */}
          <div className="overflow-y-auto pr-1 flex-1 my-2 divide-y divide-border">
            {STATIC_ISSUE_CATEGORIES.map((cat) => {
              const roleOptions = cat.options.filter((o) => (o.forWho ?? "agent") === forWho);
              if (roleOptions.length === 0) return null;

              const isExpanded = expandedCategoryIds.includes(cat.id);
              const selectedCount = roleOptions.filter((o) =>
                selectedIssueOptionIds.includes(o.id),
              ).length;

              return (
                <div key={cat.id} className="py-2.5 ">
                  {/* Category toggle header button */}
                  <button
                    type="button"
                    onClick={() => toggleCategoryExpand(cat.id)}
                    className="w-full flex items-center justify-between py-2 px-1 text-left cursor-pointer rounded-lg hover:bg-muted/40 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {cat.name}
                      </span>
                      {selectedCount > 0 && (
                        <span className="size-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                          {selectedCount}
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      className={`size-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                        }`}
                    />
                  </button>

                  {/* Expandable options list */}
                  {isExpanded && (
                    <div className="space-y-1.5 pt-2 pb-1">
                      {roleOptions.map((opt) => {
                        const isSelected = selectedIssueOptionIds.includes(opt.id);

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggleIssueOption(opt.id)}
                            className={`w-full bg-sidebar-softer text-left p-3 rounded-xl transition flex items-center justify-between gap-3 cursor-pointer ${isSelected
                              ? "bg-primary/10 dark:bg-primary/20"
                              : "hover:bg-muted/50 bg-background"
                              }`}
                          >
                            <p className="text-xs font-medium text-foreground">
                              {opt.name}
                            </p>
                            <span
                              className={`size-5 rounded-md border flex items-center justify-center shrink-0 transition ${isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/40 bg-transparent"
                                }`}
                            >
                              {isSelected && <Check className="size-3.5 stroke-3" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sticky footer with Done button */}
          <div className="pt-3 border-t border-border shrink-0 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground font-medium">
              {selectedIssueOptionIds.length} selected
            </span>
            <button
              type="button"
              onClick={() => setIsDetailDialogOpen(false)}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
