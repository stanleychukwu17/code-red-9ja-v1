import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { AppAvatar } from "@repo/ui/components/avatar";
import { Loader2, Trash2 } from "lucide-react";
import { VerificationBadge } from "@repo/ui/components/custom/verification-badge";
import { Button } from "@repo/ui/components/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getVerificationTypes, assignVerifications } from "#/lib/server/page_verifications";
import { toast } from "sonner";
import { TinyError } from "@repo/ui/components/custom/TinyError";

export type VerificationType = {
  id: number;
  page_type: string;
  page_id: number;
  verification_type_id: number;
  verification_type: string;
  verification_title: string;
  verification_description?: string;
  is_admin_assignable: boolean;
  for_who?: string;
}

export interface UserBadgeDialogProps {
  open: boolean;
  onClose: () => void;
  page: any;
  forWho: "user" | "party";
  onSuccess?: () => void;
}

export function UserBadgeDialog({ open, onClose, page, forWho, onSuccess }: UserBadgeDialogProps) {
  // Compute page's full name for display based on type
  const name = forWho === "user"
    ? [page?.first_name, page?.last_name].filter(Boolean).join(" ")
    : page?.name || page?.party_name || "Party";

  const [activeVerifications, setActiveVerifications] = useState<VerificationType[]>([]);

  // Track the currently selected verification type in the dropdown
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>();

  // tracks error
  const [error, setError] = useState<string | null>(null);

  // Reset local state when the dialog is opened
  useEffect(() => {
    if (open) {
      if (page?.is_verified) {
        setActiveVerifications(page.verifications);
      }

      setSelectedCategoryId(undefined);
      setError(null);
    }
  }, [open, page]);

  // Fetch all available verification types from the backend
  const { data: verificationCategories, isLoading: isLoadingTypes } = useQuery({
    queryKey: ["verification-types"],
    queryFn: async () => {
      const res = await getVerificationTypes();
      if (res && res.success && res.data?.types) {
        return res.data.types as VerificationType[];
      }
      return [];
    },
    staleTime: Infinity, // Cache indefinitely as these rarely change
    enabled: open, // only fetch when the dialog is open
  });

  // Handler to add the selected verification type to the local list
  const handleAddVerification = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedCategoryId || !verificationCategories) return;

    // Check if the type is already in the user's active list
    const checkIfAddedAlready = activeVerifications.some((v: VerificationType) => {
      if (typeof v.page_type != undefined && v.verification_type_id === selectedCategoryId) {
        return true
      } else if (v.id === selectedCategoryId) {
        return true
      }

      return false;
    })
    if (checkIfAddedAlready) { return; }

    // Find the full verification type object and add it to state
    const typeToAdd = verificationCategories.find((t: VerificationType) => t.id == selectedCategoryId);
    if (typeToAdd) {
      setActiveVerifications([...activeVerifications, typeToAdd]);
      setSelectedCategoryId(undefined); // Reset dropdown selection
    }
  };

  // Handler to remove a verification type from the local list
  const handleRemoveVerification = (e: React.MouseEvent, verification_type_id: number, id: number) => {
    e.preventDefault();
    console.log(verification_type_id, id)
    // setActiveVerifications(activeVerifications.filter(v => v.id !== id));
  };

  // save the verifications to the backend
  const saveMutation = useMutation({
    mutationFn: async () => {
      const typeIds = activeVerifications.map(v => v.id);
      if (typeIds.length === 0) {
        throw new Error("Please select at least one verification type to assign, or use the remove verification function.");
      }
      const payload = {
        for_who: forWho,
        page_id: forWho === "user" ? page?.fake_id : page?.id,
        verification_type_ids: typeIds,
      };

      const res = await assignVerifications({ data: payload });
      if (res && res.success === false) {
        throw new Error(res.message || "Failed to assign verifications");
      }
      return res;
    },

    onSuccess: () => {
      toast.success("Verifications updated successfully");
      if (onSuccess) onSuccess();
      onClose();
    },

    onError: (error: Error) => {
      setError(error.message);
      toast.error(error.message);
    }
  });

  // handle the save button click
  const handleSave = () => {
    setError(null);
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-170 sm:rounded-3xl p-2 px-8">
        <DialogHeader title="Add/Edit Badge" />

        {/* User Info Header */}
        <div className="flex items-center gap-5 mb-8">
          <AppAvatar
            src={page?.avatar || page?.logo}
            alt={name}
            className="size-20"
            fallbackClassName="bg-[#7fbfa1] text-white"
          />
          <div className="flex flex-col gap-1">
            <h3 className="text-[22px] font-medium text-black">
              {name || (forWho === "user" ? "User Name" : "Party Name")}
            </h3>
            <div className="flex gap-1 items-center">
              {activeVerifications.map((v) => (
                <VerificationBadge
                  key={`badge-logo-${v.id}`}
                  // if v.verification_type_id > 0, it means it's an already verified user, else it's a new one
                  id={v.verification_type_id > 0 ? v.verification_type_id : v.id}
                  className="size-6"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Badges List */}
        <div className="w-full">
          <div className="flex w-full text-base font-medium mb-2 text-black">
            <div className="w-30">Badge</div>
            <div className="flex-1">Verification type</div>
            <div className="w-10"></div>
          </div>

          <div className="flex flex-col">
            {activeVerifications.length === 0 ? (
              <div className="py-4 text-gray-500 text-sm">No verifications added yet.</div>
            ) : (
              activeVerifications.map((v) => (
                <div key={`badge-row-${v.id}`} className="flex w-full items-center py-4 border-b border-gray-200">
                  <div className="w-30">
                    <VerificationBadge id={v.page_id > 0 ? v.verification_type_id : v.id} className="size-6" />
                  </div>
                  <div className="flex-1 text-[17px] text-black">{v.verification_title}</div>
                  <div className="w-10 flex justify-end">
                    <button
                      onClick={(e) => handleRemoveVerification(e, v.verification_type_id, v.id)}
                      className="text-destructive cursor-pointer hover:bg-destructive/10 px-2 py-2 rounded-lg transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add Verification Form */}
        <div className="flex items-center gap-4 mt-8">
          <div className="flex-1">
            <select
              value={selectedCategoryId}
              onChange={(e) => {
                const val = e.target.value as unknown as number;
                if (val > 0) {
                  setSelectedCategoryId(val)
                } else {
                  setSelectedCategoryId(undefined)
                }
              }}
              className="w-full appearance-none focus:outline-none bg-[#f1f2f6] text-sm rounded-xl px-4 py-3.5 border border-[#e5e7eb]"
            >
              <option value={0}>select verification type</option>
              {verificationCategories && (
                verificationCategories?.filter((type: VerificationType) => type.is_admin_assignable && type.for_who == forWho)
                  .map((type: VerificationType) => (
                    <option
                      key={type.id}
                      value={type.id}
                      disabled={activeVerifications.some(v => (v.page_id > 0 ? v.verification_type_id : v.id) == type.id)}
                    >
                      {type.verification_title}
                    </option>
                  ))
              )}
            </select>
          </div>
          <button
            onClick={handleAddVerification}
            disabled={!selectedCategoryId}
            className="text-[#0ea5e9] disabled:opacity-50 disabled:cursor-not-allowed font-medium text-[15px] flex items-center gap-1.5 shrink-0 px-2 hover:text-[#0284c7] transition-colors"
          >
            <span className="text-xl leading-none font-normal">+</span> add verification
          </button>
        </div>

        {error && (
          <TinyError error={error} wrapperClassName="px-6 pb-4 shrink-0" />
        )}
        <DialogFooter>
          <Button
            type="button"
            onClick={onClose}
            className="h-11 px-6 bg-transparent hover:bg-black/5 text-[16px] font-bold text-black rounded-xl cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="h-11 px-6 bg-success hover:bg-success-hover text-[16px] font-bold text-white rounded-xl cursor-pointer flex items-center gap-2 ml-2"
          >
            {saveMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
