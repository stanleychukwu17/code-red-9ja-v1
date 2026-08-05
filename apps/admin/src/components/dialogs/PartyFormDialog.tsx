import { useState, useEffect, useRef } from "react"
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
import { deleteFile } from "#/lib/server/users";
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
  const [logoUrl, setLogoUrl] = useState("");
  const [selectedInputLogo, setSelectedInputLogo] = useState<File | null>(null);
  const [logoFileId, setLogoFileId] = useState<number | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // resets the form when the dialog is opened or when the party data is changed
  useEffect(() => {
    if (open) {
      if (mode === "update" && party) {
        form.setFieldValue("acronym", party.short_name || "");
        form.setFieldValue("fullName", party.name || "");
        form.setFieldValue("displayOrder", party.display_order ?? 999);
        setLogoUrl(party.logo || "");
        setLogoFileId(party.logo_file_id ?? null);
      } else {
        form.setFieldValue("acronym", "");
        form.setFieldValue("fullName", "");
        form.setFieldValue("displayOrder", 999);
        setLogoUrl("");
        setLogoFileId(null);
      }

      setSelectedInputLogo(null);
      setError(null);
    }
  }, [open, mode, party]);

  // Opens the file input dialog to allow user select party logo
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Handle the file selection and conversion to WebP
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    try {
      const file = await convertToWebP(rawFile);
      setSelectedInputLogo(file);
      setLogoUrl(URL.createObjectURL(file));
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to process image");
    }
  };

  // Handle the removal of the party logo
  const handleRemoveImage = async (which: "changing_logo" | "removing_logo") => {
    if (logoFileId && logoFileId > 0) {
      try {
        const res = await deleteFile({ data: { id: logoFileId, party_id: party?.id, type: "party_logo" } });
        if (!res.success) {
          throw new Error(res.message || "Failed to delete file");
        }

        if (which === "removing_logo") {
          setLogoUrl("");
          setLogoFileId(null);
          setSelectedInputLogo(null);

          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        } else if (which == "changing_logo") {
          setLogoUrl("");
          setLogoFileId(null);
        }

        return res;
      } catch (err: any) {
        setError(err.message || "Failed to delete file");
      }
    }
  };

  // TanStack Query Mutation for saving/creating/updating a party
  const saveMutation = useMutation({
    mutationFn: async (values: { acronym: string; fullName: string; displayOrder: number }) => {
      let finalLogoUrl = logoUrl;
      let finalFileId = logoFileId;

      // Upload the party logo if a new one was selected
      if (selectedInputLogo) {
        setIsUploadingLogo(true);

        // party is changing logo, so we need to delete the existing one
        if (party?.logo_file_id as number > 0) {
          await handleRemoveImage("changing_logo");
        }

        if (!selectedInputLogo) {
          throw new Error("No file selected");
        }

        try {
          // 1. Get presigned R2 upload URL
          const res = await getPresignedUploadURL({
            data: {
              original_name: selectedInputLogo?.name as string,
              mime_type: selectedInputLogo?.type as string,
              file_size: selectedInputLogo?.size as number,
              folder: "parties",
              is_public: true,
              owner_id: party?.id,
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
              "Content-Type": selectedInputLogo.type,
            },
            body: selectedInputLogo,
          });

          if (!putRes.ok) {
            await confirmFileUpload({ data: { id: file_id, success: false } });
            throw new Error("Failed to upload image file to storage");
          }

          // 3. Confirm file upload status
          await confirmFileUpload({ data: { id: file_id, success: true } });

          finalLogoUrl = public_url;
          finalFileId = file_id;
          setSelectedInputLogo(null)
          setLogoUrl(public_url)
          setLogoFileId(file_id)
        } finally {
          setIsUploadingLogo(false);
        }
      }

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
            logo: finalLogoUrl,
            logo_file_id: finalFileId ?? undefined,
            display_order: values.displayOrder,
          },
        });
      } else {
        res = await createParty({
          data: {
            short_name: values.acronym.trim().toUpperCase(),
            name: values.fullName.trim(),
            logo: finalLogoUrl,
            logo_file_id: finalFileId ?? undefined,
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
      <DialogContent className="max-w-145 p-0 rounded-2xl border-none shadow-2xl bg-white overflow-visible">
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
                  ) : isUploadingLogo ? (
                    <Loader2 className="size-8 animate-spin text-c-50" />
                  ) : (
                    <Umbrella className="size-12 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isUploadingLogo}
                    onClick={handleUploadClick}
                    className="flex h-11 items-center gap-2 rounded-12 bg-[#1a1a1a] hover:bg-black disabled:bg-[#ccc] disabled:cursor-not-allowed px-4 text-[15px] font-semibold text-white transition cursor-pointer"
                  >
                    <Plus className="size-5" />
                    <span>{isUploadingLogo ? "Uploading..." : "Upload image"}</span>
                  </button>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage("removing_logo")}
                      className="hidden h-11 items-center rounded-12 border border-[#dfdfdf] px-4 text-[15px] font-semibold text-red-600 hover:bg-[#fafafa] transition cursor-pointer"
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
                  disabled={!canSubmit || saveMutation.isPending || isUploadingLogo}
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
