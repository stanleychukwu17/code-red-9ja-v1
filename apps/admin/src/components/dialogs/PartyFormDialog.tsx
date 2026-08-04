import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Plus, Umbrella, Loader2 } from "lucide-react";
import { FancyInput, Input } from "@repo/ui/components/input";
import type { PartyType } from "../tiles/party-tile";
import {
  createParty,
  updateParty,
  getPresignedUploadURL,
  confirmFileUpload,
} from "#/lib/server/parties";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { convertToWebP } from "@repo/ui/lib/image";

export function PartyFormDialog({
  party,
  open,
  onClose,
  mode = "create",
  onSuccess,
}: {
  party?: PartyType;
  open: boolean;
  onClose: () => void;
  mode?: "create" | "update";
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [logoUrl, setLogoUrl] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // TanStack Form configuration
  const form = useForm({
    defaultValues: {
      acronym: "",
      fullName: "",
      displayOrder: 999,
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  React.useEffect(() => {
    if (open) {
      if (mode === "update" && party) {
        form.setFieldValue("acronym", party.short_name || "");
        form.setFieldValue("fullName", party.name || "");
        form.setFieldValue("displayOrder", party.display_order ?? 999);
        setLogoUrl(party.logo || "");
      } else {
        form.setFieldValue("acronym", "");
        form.setFieldValue("fullName", "");
        form.setFieldValue("displayOrder", 999);
        setLogoUrl("");
      }
      setError(null);
    }
  }, [open, mode, party]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setIsUploading(true);
    setError(null);

    try {
      // Convert to WebP first
      const file = await convertToWebP(rawFile);

      // 1. Get presigned R2 upload URL
      const res = await getPresignedUploadURL({
        data: {
          original_name: file.name,
          mime_type: file.type,
          file_size: file.size,
          folder: "parties",
          is_public: true,
        },
      });

      if (!res.success || !res.data) {
        throw new Error(res.message || "Failed to initiate file upload");
      }

      const { upload_url, public_url, file_id } = res.data;

      // 2. PUT file content directly to R2 bucket
      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!putRes.ok) {
        await confirmFileUpload({ data: { id: file_id, success: false } });
        throw new Error("Failed to upload image file to storage");
      }

      // 3. Confirm file upload status
      await confirmFileUpload({ data: { id: file_id, success: true } });

      setLogoUrl(public_url);
    } catch (err: any) {
      setError(err.message || "An error occurred during file upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setLogoUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // TanStack Query Mutation for saving/creating/updating a party
  const saveMutation = useMutation({
    mutationFn: async (values: { acronym: string; fullName: string; displayOrder: number }) => {
      let res;
      if (mode === "update") {
        if (!party?.id) {
          throw new Error("Missing party ID for update");
        }
        res = await updateParty({
          data: {
            id: party.id,
            short_name: values.acronym.trim().toUpperCase(),
            name: values.fullName.trim(),
            logo: logoUrl,
            display_order: values.displayOrder,
          },
        });
      } else {
        res = await createParty({
          data: {
            short_name: values.acronym.trim().toUpperCase(),
            name: values.fullName.trim(),
            logo: logoUrl,
            display_order: values.displayOrder,
          },
        });
      }

      if (!res.success) {
        throw new Error(res.message || "Failed to save party details");
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "An error occurred while saving the party");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-visible">
        <DialogHeader
          title={mode === "update" ? "Edit Party" : "Create Party"}
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogPadding className="space-y-6 pb-6">
            {error && (
              <div className="p-3 text-[14px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl">
                {error}
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: "none" }}
            />

            {/* Party acronym input */}
            <form.Field
              name="acronym"
              validators={{
                onChange: ({ value }) =>
                  !value ? "Party acronym is required" : undefined,
              }}
              children={(field) => (
                <div className="w-full">
                  <FancyInput
                    type="text"
                    placeholder="Party acronym"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    errorMsg={
                      field.state.meta.isTouched && field.state.meta.errors.length
                        ? (field.state.meta.errors[0] as string)
                        : undefined
                    }
                  />
                </div>
              )}
            />

            {/* Party full name input */}
            <form.Field
              name="fullName"
              validators={{
                onChange: ({ value }) =>
                  !value ? "Party full name is required" : undefined,
              }}
              children={(field) => (
                <div>
                  <label className="text-[14px] font-semibold text-c-50">
                    Party full name
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter party full name"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    errorMsg={
                      field.state.meta.isTouched && field.state.meta.errors.length
                        ? (field.state.meta.errors[0] as string)
                        : undefined
                    }
                  />
                </div>
              )}
            />

            {/* Display Order input */}
            <form.Field
              name="displayOrder"
              validators={{
                onChange: ({ value }) =>
                  value < 1 ? "Order must be at least 1" : undefined,
              }}
              children={(field) => (
                <div>
                  <label className="text-[14px] font-semibold text-c-50">
                    Display Order (Rank)
                  </label>
                  <Input
                    type="number"
                    placeholder="E.g. 1 for most popular"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    errorMsg={
                      field.state.meta.isTouched && field.state.meta.errors.length
                        ? (field.state.meta.errors[0] as string)
                        : undefined
                    }
                  />
                </div>
              )}
            />

            {/* Party Logo upload */}
            <div>
              <label className="text-[14px] font-semibold text-c-50">
                Party Logo
              </label>
              <div className="flex items-center gap-6 mt-2">
                <div className="size-28 rounded-full bg-[#e2e8f0] flex items-center justify-center text-c-40 border border-[#dfdfdf] overflow-hidden">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="size-full object-cover"
                    />
                  ) : isUploading ? (
                    <Loader2 className="size-8 animate-spin text-c-50" />
                  ) : (
                    <Umbrella className="size-12 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={handleUploadClick}
                    className="flex h-11 items-center gap-2 rounded-[12px] bg-[#1a1a1a] hover:bg-[#000] disabled:bg-[#ccc] disabled:cursor-not-allowed px-4 text-[15px] font-semibold text-white transition cursor-pointer"
                  >
                    <Plus className="size-5" />
                    <span>{isUploading ? "Uploading..." : "Upload image"}</span>
                  </button>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="flex h-11 items-center rounded-[12px] border border-[#dfdfdf] px-4 text-[15px] font-semibold text-red-600 hover:bg-[#fafafa] transition cursor-pointer"
                    >
                      Remove image
                    </button>
                  )}
                </div>
              </div>
            </div>
          </DialogPadding>

          <DialogFooter>
            <form.Subscribe
              selector={(state) => [state.canSubmit]}
              children={([canSubmit]) => (
                <Button
                  type="submit"
                  disabled={!canSubmit || saveMutation.isPending || isUploading}
                  loading={saveMutation.isPending}
                  variant="secondary"
                  size="xl"
                  className="px-8"
                >
                  {mode === "update" ? "Save changes" : "Create"}
                </Button>
              )}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
