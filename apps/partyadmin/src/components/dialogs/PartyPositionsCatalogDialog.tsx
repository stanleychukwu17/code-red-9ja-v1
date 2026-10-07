/**
 * @file Party Positions Catalog Dialog
 * @description Catalog viewer for standard constitutional positions and creator for custom party positions.
 */

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPadding,
  DialogFooter,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Shield, Check, Trash2, ListFilter, Pencil } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import {
  createPartyCustomPosition,
  updatePartyCustomPosition,
  deletePartyCustomPosition,
  type PartyPositionItem,
} from "#/lib/server/parties";
import { usePartyPositions } from "#/hooks/usePartyPositions";
import { ConfirmAlertDialog } from "#/components/alerts/confirm-alert-dialog";

export function PartyPositionsCatalogDialog({ open, onClose }: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"default" | "custom">("default");
  const [isCreating, setIsCreating] = useState(false);
  const [editingPosition, setEditingPosition] = useState<PartyPositionItem | null>(null);
  const [positionToDelete, setPositionToDelete] = useState<PartyPositionItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states for custom position (create or edit)
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowedLevels, setAllowedLevels] = useState<string[]>(["national", "zonal", "state", "lga", "ward"]);
  const [maxOccupants, setMaxOccupants] = useState(1);
  const [rankOrder, setRankOrder] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch pre-arranged positions (default + custom) with shared staleTime: Infinity
  const { positions, defaultPositions, customPositions, isLoading, partyId } = usePartyPositions({ enabled: open });

  const displayedPositions: PartyPositionItem[] =
    activeTab === "default" ? defaultPositions : customPositions;

  // Reset form fields and editing status
  const resetForm = () => {
    setName("");
    setDescription("");
    setAllowedLevels(["national", "zonal", "state", "lga", "ward"]);
    setMaxOccupants(1);
    setRankOrder(50);
    setIsCreating(false);
    setEditingPosition(null);
  };

  // Populate form with existing position details for editing
  const handleStartEdit = (pos: PartyPositionItem) => {
    setEditingPosition(pos);
    setName(pos.name);
    setDescription(pos.description || "");
    setAllowedLevels(pos.allowed_levels || ["national", "zonal", "state", "lga", "ward"]);
    setMaxOccupants(pos.max_occupants || 1);
    setRankOrder(pos.rank_order || 50);
    setIsCreating(true);
    setActiveTab("custom");
  };

  // Toggle selection of allowed administrative chapter levels
  const handleLevelToggle = (lvl: string) => {
    setAllowedLevels((prev) =>
      prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl],
    );
  };

  // Submit and create or update a custom party position
  const handleSavePosition = async (e: FormEvent) => {
    e.preventDefault();
    if (!partyId) return;

    // Validate required fields
    if (!name.trim()) {
      toast.error("Please provide a position title");
      return;
    }
    if (allowedLevels.length === 0) {
      toast.error("Please select at least one allowed chapter level");
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingPosition) {
        // Call API to update existing custom position
        const res = await updatePartyCustomPosition({
          data: {
            partyId,
            positionId: editingPosition.id,
            name: name.trim(),
            description: description.trim() || undefined,
            allowedLevels,
            maxOccupants,
            rankOrder,
          },
        });

        if (!res?.success) {
          throw new Error(res?.message || "Failed to update custom position");
        }

        const updatedPos: PartyPositionItem | undefined = res?.data?.position;
        if (updatedPos) {
          queryClient.setQueryData(["partyPositions", partyId], (oldData: any) => {
            if (!oldData) return oldData;
            const prevCustom = oldData.data?.custom || [];
            const updatedCustom = prevCustom.map((p: PartyPositionItem) =>
              p.id === updatedPos.id ? updatedPos : p,
            );
            const updatedPositions = (oldData.data?.positions || []).map((p: PartyPositionItem) =>
              p.id === updatedPos.id ? updatedPos : p,
            );

            return {
              ...oldData,
              data: {
                ...oldData.data,
                custom: updatedCustom,
                positions: updatedPositions,
              },
            };
          });
        }

        toast.success("Custom position updated successfully!");
      } else {
        // Call API to create new custom position
        const res = await createPartyCustomPosition({
          data: {
            partyId,
            name: name.trim(),
            description: description.trim() || undefined,
            allowedLevels,
            maxOccupants,
            rankOrder,
          },
        });

        if (!res?.success) {
          throw new Error(res?.message || "Failed to create custom position");
        }

        // Append new custom position directly to query cache without lazy refetching
        const newPosition: PartyPositionItem | undefined = res?.data?.position;
        if (newPosition) {
          const updatePositionsCache = (oldData: any) => {
            if (!oldData) return oldData;
            const prevCustom = oldData.data?.custom || [];
            const updatedCustom = [...prevCustom, newPosition];
            const updatedPositions = [...(oldData.data?.positions || []), newPosition];

            return {
              ...oldData,
              data: {
                ...oldData.data,
                custom: updatedCustom,
                positions: updatedPositions,
              },
            };
          };

          // update party positions cache
          queryClient.setQueryData(["partyPositions", partyId], updatePositionsCache);
        }

        // show success message
        toast.success("Custom position added successfully!");
      }

      // Reset form fields and switch to custom tab
      resetForm();
      setActiveTab("custom");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save position");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete custom position from party catalog
  const handleDeletePosition = async () => {
    if (!partyId || !positionToDelete) return;

    try {
      setIsDeleting(true);
      const res = await deletePartyCustomPosition({
        data: {
          partyId,
          positionId: positionToDelete.id,
        },
      });

      if (!res?.success) {
        throw new Error(res?.message || "Failed to delete custom position");
      }

      // Remove deleted custom position from query cache
      queryClient.setQueryData(["partyPositions", partyId], (oldData: any) => {
        if (!oldData) return oldData;
        const updatedCustom = (oldData.data?.custom || []).filter(
          (p: PartyPositionItem) => p.id !== positionToDelete.id,
        );
        const updatedPositions = (oldData.data?.positions || []).filter(
          (p: PartyPositionItem) => p.id !== positionToDelete.id,
        );

        return {
          ...oldData,
          data: {
            ...oldData.data,
            custom: updatedCustom,
            positions: updatedPositions,
          },
        };
      });

      toast.success("Custom position deleted successfully!");
      if (editingPosition?.id === positionToDelete.id) {
        resetForm();
      }
      setPositionToDelete(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete position");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-3xl max-h-[90vh] flex flex-col"
      >
        {/* Dialog Header: Title and descriptive summary of positions catalog */}
        <DialogHeader
          title="Party Positions Catalog"
          description="View standard pre-seeded constitutional positions or create custom party-specific offices."
        />

        {/* Action Bar: Total available position count & toggle button for creating custom position */}
        <div className="flex items-center justify-between px-6 pt-2 pb-1 border-b border-border">
          <div className="text-[14px] text-c-60 font-medium">
            {positions.length} Total Positions Available
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (isCreating) {
                resetForm();
              } else {
                resetForm();
                setIsCreating(true);
                setActiveTab("custom");
              }
            }}
            className="bg-orange hover:bg-orange-accent text-white dark:bg-black dark:border dark:border-border text-[13px] h-9 gap-1.5"
          >
            <Plus className="size-4" />
            {isCreating ? "View Positions" : "New Custom Position"}
          </Button>
        </div>

        <DialogPadding className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Custom Position Creation & Edit Form */}
          {isCreating ? (
            <form onSubmit={handleSavePosition} className="space-y-4 p-4 bg-sidebar-mobile/50 rounded-2xl border border-border/60">
              <h4 className="text-[15px] font-semibold text-c-80">
                {editingPosition ? "Edit Custom Position" : "Define Custom Position"}
              </h4>

              {/* Position Title */}
              <div>
                <label className="block text-[13px] font-medium text-c-70 mb-1">
                  Position Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Director of Diaspora Affairs"
                  className="w-full h-10 px-3 text-[14px] rounded-xl border border-border bg-background text-c-90 placeholder:text-c-40 focus:ring-1 focus:ring-orange focus:outline-none"
                />
              </div>

              {/* Responsibilities & Mandate Description */}
              <div>
                <label className="block text-[13px] font-medium text-c-70 mb-1">
                  Description / Responsibilities
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline the responsibilities and mandate of this office..."
                  className="w-full p-2.5 text-[13px] rounded-xl border border-border bg-background text-c-90 placeholder:text-c-40 focus:ring-1 focus:ring-orange focus:outline-none"
                />
              </div>

              {/* Chapter Hierarchy Eligibility (Allowed Admin Tiers) */}
              <div>
                <label className="block text-[13px] font-medium text-c-70 mb-1.5">
                  Allowed Chapter Levels
                </label>
                <div className="flex flex-wrap gap-2">
                  {["national", "zonal", "state", "lga", "ward"].map((lvl) => {
                    const active = allowedLevels.includes(lvl);
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleLevelToggle(lvl)}
                        className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition capitalize flex items-center gap-1.5 border border-transparent cursor-pointer
                          ${active
                            ? "bg-black text-white"
                            : "bg-sidebar-mobile text-c-60 border border-black!"
                          }`}
                      >
                        {active && <Check className="size-3.5" />}
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Concurrency & Precedence (Max occupants per chapter & rank order) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-c-70 mb-1">
                    Max Occupants Per Chapter
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={maxOccupants}
                    onChange={(e) => setMaxOccupants(Number(e.target.value))}
                    className="w-full h-10 px-3 text-[14px] rounded-xl border border-border bg-background text-c-90 focus:ring-1 focus:ring-orange focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-c-70 mb-1">
                    Precedence / Rank Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={rankOrder}
                    onChange={(e) => setRankOrder(Number(e.target.value))}
                    className="w-full h-10 px-3 text-[14px] rounded-xl border border-border bg-background text-c-90 focus:ring-1 focus:ring-orange focus:outline-none"
                  />
                </div>
              </div>

              {/* Form Action Controls */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-orange hover:bg-orange-accent text-white dark:bg-black dark:border dark:border-border"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-1.5" /> Saving...
                    </>
                  ) : editingPosition ? (
                    "Save Changes"
                  ) : (
                    "Create Custom Position"
                  )}
                </Button>
              </div>
            </form>
          ) : null}

          {/* Tabs: Default Positions vs Custom Positions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center p-1 bg-c-10/70 dark:bg-hover-3 rounded-xl border border-border w-fit gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("default")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition cursor-pointer",
                  activeTab === "default"
                    ? "bg-background text-c-90 shadow-xs font-semibold"
                    : "text-c-60 hover:text-c-90"
                )}
              >
                <Shield className="size-3.5 text-c-50" />
                <span>Default Positions</span>
                <span
                  className={cn(
                    "text-[11px] px-1.5 py-0.2 rounded-full font-semibold",
                    activeTab === "default"
                      ? "bg-hover-5 text-c-80"
                      : "bg-hover-5/60 text-c-50"
                  )}
                >
                  {defaultPositions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("custom")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition cursor-pointer",
                  activeTab === "custom"
                    ? "bg-background text-c-90 shadow-xs font-semibold"
                    : "text-c-60 hover:text-c-90"
                )}
              >
                <span>Custom Positions</span>
                <span
                  className={cn(
                    "text-[11px] px-1.5 py-0.2 rounded-full font-semibold",
                    activeTab === "custom"
                      ? "bg-orange/15 text-orange"
                      : "bg-hover-5/60 text-c-50"
                  )}
                >
                  {customPositions.length}
                </span>
              </button>
            </div>

            <div className="text-[12px] text-c-50">
              Showing {displayedPositions.length} {activeTab === "default" ? "standard" : "custom"} {displayedPositions.length === 1 ? "position" : "positions"}
            </div>
          </div>

          {/* Positions Catalog Display */}
          {isLoading ? (
            /* Loading State: Progress indicator while positions query resolves */
            <div className="py-12 flex justify-center items-center gap-2 text-c-50 text-[14px]">
              <Loader2 className="size-5 animate-spin" /> Loading catalog...
            </div>
          ) : displayedPositions.length === 0 ? (
            activeTab === "custom" ? (
              /* Empty State: Custom Positions - encourages creating party-specific roles */
              <div className="py-12 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
                <div className="size-10 rounded-full bg-orange/10 text-orange flex items-center justify-center mb-2.5">
                  <Plus className="size-5" />
                </div>
                <p className="text-[14px] font-semibold text-c-80">No custom positions created yet</p>
                <p className="text-[12px] text-c-50 max-w-sm mt-1">
                  Define custom roles and offices specific to your party structure across national, state, or grassroots chapters.
                </p>
                {!isCreating && (
                  <Button
                    size="sm"
                    onClick={() => {
                      resetForm();
                      setIsCreating(true);
                    }}
                    className="mt-4 bg-orange hover:bg-orange-accent text-white dark:bg-black dark:border dark:border-border text-[13px] h-8.5 gap-1.5"
                  >
                    <Plus className="size-4" />
                    Create Custom Position
                  </Button>
                )}
              </div>
            ) : null
          ) : (
            /* Positions List: Displays active positions with badges, occupancy rules, allowed chapter levels, and rank */
            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
              {displayedPositions.map((pos) => (
                <PositionCatalogItem
                  key={pos.id}
                  position={pos}
                  onEdit={handleStartEdit}
                  onDelete={(p) => setPositionToDelete(p)}
                  isEditing={editingPosition?.id === pos.id}
                />
              ))}
            </div>
          )}
        </DialogPadding>

        {/* Dialog Footer: Dismiss dialog action */}
        <DialogFooter className="p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close Catalog
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Confirmation Dialog for Position Deletion */}
      <ConfirmAlertDialog
        open={!!positionToDelete}
        setOpen={(isOpen) => {
          if (!isOpen) setPositionToDelete(null);
        }}
        onConfirm={handleDeletePosition}
        isPending={isDeleting}
        headerTitle="Delete Custom Position"
        title={`Delete "${positionToDelete?.name}"?`}
        subtitle="Are you sure you want to delete this custom position? Any active assignments for this office may be vacated."
        actionText="Delete Position"
        actionVariant="destructive"
      />
    </Dialog>
  );
}

/**
 * Individual position row in catalog listing with edit and delete capabilities.
 */
interface PositionCatalogItemProps {
  position: PartyPositionItem;
  onEdit?: (position: PartyPositionItem) => void;
  onDelete?: (position: PartyPositionItem) => void;
  isEditing?: boolean;
}

function PositionCatalogItem({
  position,
  onEdit,
  onDelete,
  isEditing,
}: PositionCatalogItemProps) {
  const isCustom = position.position_type === "custom";

  return (
    <div
      className={cn(
        "p-3.5 flex items-center justify-between hover:bg-hover-3 transition",
        isEditing && "bg-orange/5 ring-1 ring-orange/30",
      )}
    >
      <div className="space-y-1 min-w-0 flex-1 pr-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-semibold text-c-90">
            {position.name}
          </span>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
              isCustom
                ? "bg-orange/10 border-orange/30 text-orange"
                : "bg-hover-5 border-border text-c-60"
            }`}
          >
            {isCustom ? "Custom" : "Constitutional"}
          </span>
          <span className="text-[11px] text-c-40">
            Max: {position.max_occupants}{" "}
            {position.max_occupants === 1 ? "official" : "officials"}
          </span>
        </div>

        {position.description && (
          <p className="text-[12px] text-c-60 line-clamp-2">
            {position.description}
          </p>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12px] text-c-50">Allowed tiers:</span>
          {position.allowed_levels?.map((lvl) => (
            <span
              key={lvl}
              className="text-[11px] px-1.5 py-0.2 rounded bg-hover-5 text-c-60 capitalize font-medium"
            >
              {lvl}
            </span>
          ))}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-3">
        <span className="text-[12px] text-c-40 font-mono">
          Rank #{position.rank_order}
        </span>
        {isCustom && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onEdit?.(position)}
              title="Edit position"
              className="size-7 text-c-60 hover:text-c-90 hover:bg-hover-4 rounded-lg cursor-pointer"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onDelete?.(position)}
              title="Delete position"
              className="size-7 text-c-50 hover:text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
