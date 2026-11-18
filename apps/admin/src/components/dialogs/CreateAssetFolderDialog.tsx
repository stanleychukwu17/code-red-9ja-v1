import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, FolderPlus } from "lucide-react";
import { createAssetFolder } from "#/lib/server/assets";
import { QUERY_KEYS } from "#/lib/config";
import { toast } from "sonner";

export type CreateAssetFolderDialogProps = {
  open: boolean;
  onClose: () => void;
  parentId?: number;
  currentPath?: string;
  onSuccess?: () => void;
};

export function CreateAssetFolderDialog({
  open,
  onClose,
  parentId,
  currentPath = "Root",
  onSuccess,
}: CreateAssetFolderDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      const cleanName = name.trim();
      if (!cleanName) {
        throw new Error("Folder name is required");
      }
      if (cleanName.includes("/") || cleanName.includes("\\")) {
        throw new Error("Folder name cannot contain slashes");
      }

      const res = await createAssetFolder({
        data: {
          name: cleanName,
          parent_id: parentId,
          description: description.trim() || undefined,
        },
      });

      if (!res || !res.success) {
        throw new Error(res?.message || "Failed to create folder");
      }

      return res;
    },
    onSuccess: (data) => {
      toast.success(`Folder "${data.folder?.name || name}" created successfully`);
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.assets.folders(parentId),
      });
      setName("");
      setDescription("");
      setError(null);
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err?.message || "An error occurred while creating the folder");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createMutation.mutate();
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    setName("");
    setDescription("");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent
        className="max-w-md p-0 rounded-2xl border-none shadow-2xl overflow-hidden flex flex-col"
        onPointerDownOutside={(e) => {
          if (createMutation.isPending) e.preventDefault();
        }}
      >
        <DialogHeader
          title="Create New Folder"
          description={`Creating inside: ${currentPath}`}
        />

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <DialogPadding className="space-y-4 pt-2">
            {error && (
              <div className="p-3 text-sm font-medium text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="folder-name" className="text-xs font-medium text-c-80">
                Folder Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="folder-name"
                placeholder="e.g. 2027-presidential, banners, 3d-models"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                disabled={createMutation.isPending}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="folder-desc" className="text-xs font-medium text-c-80">
                Description <span className="text-muted-foreground text-[11px]">(optional)</span>
              </label>
              <Input
                id="folder-desc"
                placeholder="Brief description of this folder's contents"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={createMutation.isPending}
              />
            </div>
          </DialogPadding>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="tertiary"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
              className="flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="size-4" />
                  <span>Create Folder</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
