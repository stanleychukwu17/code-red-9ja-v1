/**
 * @file Party Positions Catalog Dialog
 * @description Catalog viewer for standard constitutional positions and creator for custom party positions.
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPadding,
  DialogFooter,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Shield, Check, Trash2, ListFilter } from "lucide-react";
import {
  getPartyPositions,
  createPartyCustomPosition,
  type PartyPositionItem,
} from "#/lib/server/parties";

export function PartyPositionsCatalogDialog({
  open,
  onClose,
  partyId,
}: {
  open: boolean;
  onClose: () => void;
  partyId?: number;
}) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = React.useState(false);

  // Form states for new custom position
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [allowedLevels, setAllowedLevels] = React.useState<string[]>([
    "national",
    "zonal",
    "state",
    "lga",
    "ward",
  ]);
  const [maxOccupants, setMaxOccupants] = React.useState(1);
  const [rankOrder, setRankOrder] = React.useState(50);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Fetch all positions (default + custom)
  const { data: positionsRes, isLoading } = useQuery({
    queryKey: ["partyPositions", partyId, "all"],
    queryFn: () => getPartyPositions({ data: { partyId: partyId! } }),
    enabled: !!partyId && open,
  });
  const positions: PartyPositionItem[] = positionsRes?.data?.positions || [];

  const handleLevelToggle = (lvl: string) => {
    setAllowedLevels((prev) =>
      prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl],
    );
  };

  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId) return;
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
      const res = await createPartyCustomPosition({
        data: {
          partyId,
          name: name.trim(),
          code: code.trim() || undefined,
          description: description.trim() || undefined,
          allowedLevels,
          maxOccupants,
          rankOrder,
        },
      });

      if (!res?.success) {
        throw new Error(res?.message || "Failed to create custom position");
      }

      toast.success("Custom position added successfully!");
      queryClient.invalidateQueries({ queryKey: ["partyPositions"] });
      // Reset form
      setName("");
      setCode("");
      setDescription("");
      setIsCreating(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create position");
    } finally {
      setIsSubmitting(false);
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
        <DialogHeader
          title="Party Positions Catalog"
          description="View standard pre-seeded constitutional positions or create custom party-specific offices."
        />

        <div className="flex items-center justify-between px-6 pt-2 pb-1 border-b border-[#f0f0f0]">
          <div className="text-[14px] text-c-60 font-medium">
            {positions.length} Total Positions Available
          </div>
          <Button
            size="sm"
            onClick={() => setIsCreating(!isCreating)}
            className="bg-[#ff9a3c] hover:bg-[#e0832c] text-white text-[13px] h-9 gap-1.5"
          >
            <Plus className="size-4" />
            {isCreating ? "View Positions" : "New Custom Position"}
          </Button>
        </div>

        <DialogPadding className="flex-1 overflow-y-auto space-y-4 py-4">
          {isCreating ? (
            <form onSubmit={handleCreatePosition} className="space-y-4 p-4 bg-[#fafafa] rounded-2xl border border-[#ebebeb]">
              <h4 className="text-[15px] font-semibold text-c-80">
                Define Custom Position
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className="w-full h-10 px-3 text-[14px] rounded-xl border border-[#d1d5db] bg-white focus:ring-1 focus:ring-[#ff9a3c] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-c-70 mb-1">
                    Position Code <span className="text-c-40 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. director_diaspora"
                    className="w-full h-10 px-3 text-[14px] rounded-xl border border-[#d1d5db] bg-white focus:ring-1 focus:ring-[#ff9a3c] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-c-70 mb-1">
                  Description / Responsibilities
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline the responsibilities and mandate of this office..."
                  className="w-full p-2.5 text-[13px] rounded-xl border border-[#d1d5db] bg-white focus:ring-1 focus:ring-[#ff9a3c] focus:outline-none"
                />
              </div>

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
                        className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border transition capitalize flex items-center gap-1.5 ${
                          active
                            ? "bg-[#ff9a3c] text-white border-[#ff9a3c]"
                            : "bg-white text-c-60 border-[#e5e7eb] hover:bg-[#f3f4f6]"
                        }`}
                      >
                        {active && <Check className="size-3.5" />}
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>

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
                    className="w-full h-10 px-3 text-[14px] rounded-xl border border-[#d1d5db] bg-white focus:ring-1 focus:ring-[#ff9a3c] focus:outline-none"
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
                    className="w-full h-10 px-3 text-[14px] rounded-xl border border-[#d1d5db] bg-white focus:ring-1 focus:ring-[#ff9a3c] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-[#ff9a3c] hover:bg-[#e0832c] text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-1.5" /> Saving...
                    </>
                  ) : (
                    "Create Custom Position"
                  )}
                </Button>
              </div>
            </form>
          ) : null}

          {/* Positions Table */}
          {isLoading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-c-50 text-[14px]">
              <Loader2 className="size-5 animate-spin" /> Loading catalog...
            </div>
          ) : (
            <div className="rounded-xl border border-[#e5e7eb] divide-y divide-[#f3f4f6] overflow-hidden">
              {positions.map((pos) => (
                <div
                  key={pos.id}
                  className="p-3.5 flex items-center justify-between hover:bg-[#fafafa] transition"
                >
                  <div className="space-y-1 min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-semibold text-c-90">
                        {pos.name}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                          pos.position_type === "custom"
                            ? "bg-orange-50 border-orange-200 text-orange-700"
                            : "bg-gray-100 border-gray-200 text-gray-700"
                        }`}
                      >
                        {pos.position_type === "custom" ? "Custom" : "Constitutional"}
                      </span>
                      <span className="text-[11px] text-c-40">
                        Max: {pos.max_occupants} {pos.max_occupants === 1 ? "official" : "officials"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[12px] text-c-50">Allowed tiers:</span>
                      {pos.allowed_levels?.map((lvl) => (
                        <span
                          key={lvl}
                          className="text-[11px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 capitalize font-medium"
                        >
                          {lvl}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-[12px] text-c-40 font-mono">
                      Rank #{pos.rank_order}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogPadding>

        <DialogFooter className="p-4 border-t border-[#ebebeb]">
          <Button variant="outline" onClick={onClose}>
            Close Catalog
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
