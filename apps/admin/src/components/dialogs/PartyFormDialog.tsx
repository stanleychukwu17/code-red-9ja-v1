import {
	confirmFileUpload,
	createParty,
	getPresignedUploadURL,
	updateParty,
} from "#/lib/server/parties";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogPadding,
} from "@repo/ui/components/dialog";
import { FancyInput, Input } from "@repo/ui/components/input";
import { convertToWebP } from "@repo/ui/lib/image";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Image as ImageIcon, Loader2, MoveVertical, Palette, Plus, Trash2, Umbrella, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SelectDate } from "@repo/ui/components/selects/date-select";
import type { PartyType } from "../tiles/party-tile";

// Common color presets for parties
const PARTY_COLOR_PRESETS = [
	{ name: "APC (Cyan)", light: "#0284C7", dark: "#38BDF8" },
	{ name: "PDP (Green)", light: "#16A34A", dark: "#4ADE80" },
	{ name: "LP (Red)", light: "#DC2626", dark: "#FB7185" },
	{ name: "NNPP (Blue)", light: "#2563EB", dark: "#60A5FA" },
	{ name: "APGA (Yellow)", light: "#CA8A04", dark: "#FACC15" },
	{ name: "SDP (Indigo)", light: "#4F46E5", dark: "#818CF8" },
	{ name: "ADC (Amber)", light: "#D97706", dark: "#FBBF24" },
	{ name: "YPP (Teal)", light: "#0D9488", dark: "#2DD4BF" },
];

// Type definition for the dialog's props
export type PartyFormDialogProps = {
	party?: PartyType;
	open: boolean;
	onClose: () => void;
	mode?: "create" | "update";
	onSuccess?: () => void;
};

// Main dialog component for creating and updating a party
export function PartyFormDialog({
	party,
	open,
	onClose,
	mode = "create",
	onSuccess,
}: PartyFormDialogProps) {
	const queryClient = useQueryClient();
	const [logoUrl, setLogoUrl] = useState("");
	const [logoFileId, setLogoFileId] = useState<number | undefined>(party?.logo_file_id);
	const [selectedInputLogo, setSelectedInputLogo] = useState<File | null>(null);
	const [isUploadingLogo, setIsUploadingLogo] = useState(false);

	const [coverUrl, setCoverUrl] = useState("");
	const [coverFileId, setCoverFileId] = useState<number | undefined>(party?.cover_image_file_id);
	const [selectedInputCover, setSelectedInputCover] = useState<File | null>(null);
	const [isUploadingCover, setIsUploadingCover] = useState(false);
	const [coverPositionY, setCoverPositionY] = useState(50);
	const [isRepositioning, setIsRepositioning] = useState(false);
	const [isDraggingCover, setIsDraggingCover] = useState(false);
	const dragStartY = useRef(0);
	const dragStartPos = useRef(50);

	const [error, setError] = useState<string | null>(null);

	// File input references
	const logoFileInputRef = useRef<HTMLInputElement>(null);
	const coverFileInputRef = useRef<HTMLInputElement>(null);

	// TanStack Form configuration
	const form = useForm({
		defaultValues: {
			acronym: "",
			fullName: "",
			dateFounded: "",
			displayOrder: 999,
			colorHex: "",
			darkColorHex: "",
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
				const rawDate = party.date_founded || (party as any).founded_date || "";
				form.setFieldValue("dateFounded", rawDate ? rawDate.split("T")[0] : "");
				form.setFieldValue("displayOrder", party.display_order ?? 999);
				form.setFieldValue("colorHex", party.color_hex || "");
				form.setFieldValue("darkColorHex", party.dark_color_hex || "");
				setLogoUrl(party.logo || "");
				setLogoFileId(party.logo_file_id);
				const rawCover = party.cover_image || "";
				setCoverUrl(rawCover);
				setCoverFileId(party.cover_image_file_id);
				setCoverPositionY(party.cover_position_y ?? 50);
			} else {
				form.setFieldValue("acronym", "");
				form.setFieldValue("fullName", "");
				form.setFieldValue("dateFounded", "");
				form.setFieldValue("displayOrder", 999);
				form.setFieldValue("colorHex", "");
				form.setFieldValue("darkColorHex", "");
				setLogoUrl("");
				setLogoFileId(undefined);
				setCoverUrl("");
				setCoverFileId(undefined);
				setCoverPositionY(50);
			}

			setIsRepositioning(false);
			setSelectedInputLogo(null);
			setSelectedInputCover(null);
			setError(null);
		}
	}, [open, mode, party]);

	// Opens the file input dialog to allow user select party logo
	const handleUploadLogoClick = () => {
		logoFileInputRef.current?.click();
	};

	// Opens the file input dialog to allow user select background cover
	const handleUploadCoverClick = () => {
		coverFileInputRef.current?.click();
	};

	// Pointer drag handlers for repositioning cover image vertically
	const handleCoverPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!isRepositioning) return;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		setIsDraggingCover(true);
		dragStartY.current = e.clientY;
		dragStartPos.current = coverPositionY;
	};

	const handleCoverPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!isDraggingCover || !isRepositioning) return;
		const deltaY = e.clientY - dragStartY.current;
		// Dragging down shifts view up towards 0% (top), dragging up reveals bottom towards 100%
		const newPos = Math.max(0, Math.min(100, Math.round(dragStartPos.current - deltaY * 0.5)));
		setCoverPositionY(newPos);
	};

	const handleCoverPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
		if (isDraggingCover) {
			try {
				(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
			} catch { }
			setIsDraggingCover(false);
		}
	};

	// Handle the logo file selection and conversion to WebP
	const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const rawFile = e.target.files?.[0];
		if (!rawFile) return;

		try {
			const file = await convertToWebP(rawFile);
			setSelectedInputLogo(file);
			setLogoUrl(URL.createObjectURL(file));
			setError(null);
		} catch (err: any) {
			setError(err.message || "Failed to process logo image");
		}
	};

	// Handle the cover file selection and conversion to WebP
	const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const rawFile = e.target.files?.[0];
		if (!rawFile) return;

		try {
			const file = await convertToWebP(rawFile);
			setSelectedInputCover(file);
			setCoverUrl(URL.createObjectURL(file));
			setCoverPositionY(50);
			setError(null);
		} catch (err: any) {
			setError(err.message || "Failed to process background image");
		}
	};

	// Handle the removal of the party logo
	const handleRemoveImage = (which: "changing_logo" | "removing_logo") => {
		if (which === "removing_logo") {
			setLogoUrl("");
			setLogoFileId(undefined);
			setSelectedInputLogo(null);
			if (logoFileInputRef.current) {
				logoFileInputRef.current.value = "";
			}
		} else if (which === "changing_logo") {
			setLogoUrl("");
		}
	};

	// Handle the removal of the background cover
	const handleRemoveCover = () => {
		setCoverUrl("");
		setCoverFileId(undefined);
		setSelectedInputCover(null);
		setIsRepositioning(false);
		setCoverPositionY(50);
		if (coverFileInputRef.current) {
			coverFileInputRef.current.value = "";
		}
	};

	// TanStack Query Mutation for saving/creating/updating a party
	const saveMutation = useMutation({
		mutationFn: async (values: {
			acronym: string;
			fullName: string;
			dateFounded: string;
			displayOrder: number;
			colorHex: string;
			darkColorHex: string;
		}) => {
			let finalLogoUrl = logoUrl;
			let finalLogoFileId = logoFileId;
			let finalCoverUrl = coverUrl;
			let finalCoverFileId = coverFileId;

			// 1. Upload the party logo if a new one was selected
			if (selectedInputLogo) {
				setIsUploadingLogo(true);
				handleRemoveImage("changing_logo");

				try {
					const res = await getPresignedUploadURL({
						data: {
							original_name: selectedInputLogo.name,
							mime_type: selectedInputLogo.type,
							file_size: selectedInputLogo.size,
							folder: "parties",
							is_public: true,
							owner_id: party?.id,
						},
					});

					if (!res.success || !res.data) {
						throw new Error(res.message || "Failed to initiate logo upload");
					}

					const { upload_url, public_url, file_id } = res.data;

					const putRes = await fetch(upload_url, {
						method: "PUT",
						headers: {
							"Content-Type": selectedInputLogo.type,
						},
						body: selectedInputLogo,
					});

					if (!putRes.ok) {
						await confirmFileUpload({ data: { id: file_id, success: false } });
						throw new Error("Failed to upload logo image file to storage");
					}

					await confirmFileUpload({ data: { id: file_id, success: true } });

					finalLogoUrl = public_url;
					finalLogoFileId = file_id;
					setSelectedInputLogo(null);
					setLogoUrl(public_url);
					setLogoFileId(file_id);
				} finally {
					setIsUploadingLogo(false);
				}
			}

			// 2. Upload background cover image if a new one was selected
			if (selectedInputCover) {
				setIsUploadingCover(true);

				try {
					const res = await getPresignedUploadURL({
						data: {
							original_name: selectedInputCover.name,
							mime_type: selectedInputCover.type,
							file_size: selectedInputCover.size,
							folder: "parties",
							is_public: true,
							owner_id: party?.id,
						},
					});

					if (!res.success || !res.data) {
						throw new Error(res.message || "Failed to initiate cover image upload");
					}

					const { upload_url, public_url, file_id } = res.data;

					const putRes = await fetch(upload_url, {
						method: "PUT",
						headers: { "Content-Type": selectedInputCover.type },
						body: selectedInputCover,
					});

					if (!putRes.ok) {
						await confirmFileUpload({ data: { id: file_id, success: false } });
						throw new Error("Failed to upload cover image file to storage");
					}

					await confirmFileUpload({ data: { id: file_id, success: true } });

					finalCoverUrl = public_url;
					finalCoverFileId = file_id;
					setSelectedInputCover(null);
					setCoverUrl(public_url);
					setCoverFileId(file_id);
				} finally {
					setIsUploadingCover(false);
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
						logo_file_id: finalLogoFileId,
						display_order: values.displayOrder,
						color_hex: values.colorHex.trim() || undefined,
						dark_color_hex: values.darkColorHex.trim() || undefined,
						date_founded: values.dateFounded.trim() || undefined,
						cover_image: finalCoverUrl || undefined,
						cover_image_file_id: finalCoverFileId,
						cover_position_y: coverPositionY,
					},
				});
			} else {
				res = await createParty({
					data: {
						short_name: values.acronym.trim().toUpperCase(),
						name: values.fullName.trim(),
						logo: finalLogoUrl,
						logo_file_id: finalLogoFileId,
						display_order: values.displayOrder,
						color_hex: values.colorHex.trim() || undefined,
						dark_color_hex: values.darkColorHex.trim() || undefined,
						date_founded: values.dateFounded.trim() || undefined,
						cover_image: finalCoverUrl || undefined,
						cover_image_file_id: finalCoverFileId,
						cover_position_y: coverPositionY,
					},
				});
			}

			if (!res.success) {
				throw new Error(res.message || "Failed to save party details");
			}
			return res;
		},
		onSuccess: (res) => {
			const savedParty = res?.data?.party;
			if (savedParty) {
				queryClient.setQueryData(["parties"], (oldData: any) => {
					if (!oldData) return oldData;

					if (oldData?.data?.parties && Array.isArray(oldData.data.parties)) {
						const parties = oldData.data.parties;
						const updatedParties: PartyType[] =
							mode === "update"
								? parties.map((p: PartyType) =>
										p.id === savedParty.id ? { ...p, ...savedParty } : p
								  )
								: [...parties, savedParty];

						return {
							...oldData,
							data: {
								...oldData.data,
								parties: updatedParties,
							},
						};
					}

					return oldData;
				});
			} else {
				// Fallback if no party object returned
				queryClient.invalidateQueries({ queryKey: ["parties"] });
			}

			onSuccess?.();
			onClose();
		},
		onError: (err: any) => {
			setError(err.message || "An error occurred while saving the party");
		},
	});

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose();
			}}
		>
			<DialogContent
				className="max-w-145 p-0 rounded-2xl border-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
				onPointerDownOutside={(e) => e.preventDefault()}
				onInteractOutside={(e) => e.preventDefault()}
				onEscapeKeyDown={(e) => e.preventDefault()}
			>
				<DialogHeader title={mode === "update" ? "Edit Party" : "Create Party"} />

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="flex flex-col flex-1 overflow-hidden min-h-0"
				>
					<div className="flex-1 overflow-y-auto min-h-0">
						<DialogPadding className="space-y-6 pb-6">
						{error && (
							<div className="p-3 text-[14px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl">
								{error}
							</div>
						)}

						<input
							type="file"
							ref={logoFileInputRef}
							onChange={handleLogoChange}
							accept="image/*"
							style={{ display: "none" }}
						/>
						<input
							type="file"
							ref={coverFileInputRef}
							onChange={handleCoverChange}
							accept="image/*"
							style={{ display: "none" }}
						/>

						{/* Background Banner & Avatar (Party Logo) */}
						<div>
							{/* Background / Cover Image Banner */}
							{coverUrl ? (
								<div
									onPointerDown={handleCoverPointerDown}
									onPointerMove={handleCoverPointerMove}
									onPointerUp={handleCoverPointerUp}
									className={`relative h-55 w-full rounded-2xl border border-[#e5e7eb] dark:border-neutral-800 bg-[#f8fafc] dark:bg-neutral-800 overflow-hidden select-none touch-none ${isRepositioning
										? "cursor-grab active:cursor-grabbing ring-2 ring-blue-500"
										: "cursor-default"
										}`}
								>
									<img
										src={coverUrl}
										alt="Party background cover"
										draggable={false}
										style={{ objectPosition: `center ${coverPositionY}%` }}
										className="size-full object-cover select-none pointer-events-none"
									/>

									{/* Drag helper guide when repositioning */}
									{isRepositioning && (
										<div className="absolute inset-0 bg-black/25 pointer-events-none flex items-center justify-center">
											<div className="px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-semibold shadow flex items-center gap-1.5 animate-pulse">
												<MoveVertical className="size-3.5" />
												Drag image up or down to reposition
											</div>
										</div>
									)}

									{/* Action Buttons: 1 for Upload/Change, 1 for Re-adjusting Position */}
									<div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
										{/* Button 1: Upload / Change image */}
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												handleUploadCoverClick();
											}}
											disabled={isUploadingCover}
											className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black/90 backdrop-blur-md text-white text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-50"
											title="Upload or change background image"
										>
											<Upload className="size-3.5" />
											<span>Change image</span>
										</button>

										{/* Button 2: Re-adjust position */}
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												setIsRepositioning((prev) => !prev);
											}}
											className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-md text-xs font-semibold transition cursor-pointer shadow-sm ${isRepositioning
												? "bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-white/50 shadow-md"
												: "bg-black/70 hover:bg-black/90 text-white"
												}`}
											title="Re-adjust background image position"
										>
											{isRepositioning ? (
												<Check className="size-3.5" />
											) : (
												<MoveVertical className="size-3.5" />
											)}
											<span>{isRepositioning ? "Done positioning" : "Re-adjust position"}</span>
										</button>

										{/* Remove background image */}
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												handleRemoveCover();
											}}
											className="size-7.5 rounded-lg bg-black/70 hover:bg-red-600 backdrop-blur-md text-white flex items-center justify-center transition cursor-pointer shadow-sm"
											title="Remove background image"
										>
											<Trash2 className="size-3.5" />
										</button>
									</div>

									{/* Repositioning Control Bar: Presets + Slider + Done */}
									{isRepositioning && (
										<div
											onClick={(e) => e.stopPropagation()}
											onPointerDown={(e) => e.stopPropagation()}
											className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/85 backdrop-blur-md text-white shadow-xl border border-white/15"
										>
											<span className="text-[11px] font-medium text-white/70">Presets:</span>
											<div className="flex items-center gap-1 text-[11px]">
												<button
													type="button"
													onClick={() => setCoverPositionY(0)}
													className={`px-2 py-0.5 rounded text-xs transition ${coverPositionY === 0
														? "bg-white text-black font-semibold"
														: "bg-white/15 hover:bg-white/25 text-white"
														}`}
												>
													Top
												</button>
												<button
													type="button"
													onClick={() => setCoverPositionY(50)}
													className={`px-2 py-0.5 rounded text-xs transition ${coverPositionY === 50
														? "bg-white text-black font-semibold"
														: "bg-white/15 hover:bg-white/25 text-white"
														}`}
												>
													Center
												</button>
												<button
													type="button"
													onClick={() => setCoverPositionY(100)}
													className={`px-2 py-0.5 rounded text-xs transition ${coverPositionY === 100
														? "bg-white text-black font-semibold"
														: "bg-white/15 hover:bg-white/25 text-white"
														}`}
												>
													Bottom
												</button>
											</div>

											<div className="h-3.5 w-px bg-white/20 mx-0.5" />

											<input
												type="range"
												min={0}
												max={100}
												value={coverPositionY}
												onChange={(e) => setCoverPositionY(Number(e.target.value))}
												className="w-20 h-1.5 accent-blue-500 cursor-pointer bg-white/30 rounded-lg"
											/>
											<span className="text-[11px] font-mono w-7 text-right text-white/90">
												{coverPositionY}%
											</span>

											<button
												type="button"
												onClick={() => setIsRepositioning(false)}
												className="ml-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer"
											>
												<Check className="size-3" />
												<span>Done</span>
											</button>
										</div>
									)}
								</div>
							) : (
								<div
									onClick={handleUploadCoverClick}
									className="relative h-55 w-full rounded-2xl border-2 border-dashed border-[#dfdfdf] hover:border-[#94a3b8] transition-all bg-[#f8fafc] dark:bg-neutral-800 overflow-hidden flex flex-col items-center justify-center cursor-pointer group"
								>
									{isUploadingCover ? (
										<div className="flex flex-col items-center gap-2 text-c-40">
											<Loader2 className="size-6 animate-spin text-c-50" />
											<span className="text-xs font-medium">Uploading background banner...</span>
										</div>
									) : (
										<div className="flex flex-col items-center gap-2 text-c-40 group-hover:text-c-70 transition-colors">
											<div className="size-10 rounded-full bg-white dark:bg-neutral-700 shadow-sm flex items-center justify-center">
												<ImageIcon className="size-5 stroke-[1.75]" />
											</div>
											<div className="text-center">
												<p className="text-xs font-semibold text-c-60 group-hover:text-c-80">
													Click to upload background image
												</p>
												<p className="text-[11px] text-c-40">
													Recommended: 1200 x 400px (JPG, PNG, WebP)
												</p>
											</div>
										</div>
									)}
								</div>
							)}

							{/* Overlapping Avatar Section placed above the short name */}
							<div className="-mt-12 pl-4 flex items-end justify-between relative z-10">
								<div className="flex items-end gap-3.5">
									<div
										onClick={handleUploadLogoClick}
										className="size-24 rounded-full bg-white dark:bg-neutral-900 border-4 border-white dark:border-neutral-900 shadow-md flex items-center justify-center text-c-40 overflow-hidden shrink-0 cursor-pointer hover:opacity-95 transition group relative"
										title="Click to upload party logo"
									>
										{logoUrl ? (
											<img src={logoUrl} alt="Logo preview" className="size-full object-cover" />
										) : isUploadingLogo ? (
											<Loader2 className="size-7 animate-spin text-c-50" />
										) : (
											<Umbrella className="size-10 shrink-0" />
										)}
										<div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
											<Camera className="size-5 text-white" />
										</div>
									</div>

									<div className="mb-2 flex items-center gap-2">
										<button
											type="button"
											disabled={isUploadingLogo}
											onClick={handleUploadLogoClick}
											className="flex h-9 items-center gap-1.5 rounded-lg bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed px-3 text-[13px] font-medium transition cursor-pointer shadow-xs"
										>
											<Plus className="size-3.5" />
											<span>{logoUrl ? "Change logo" : "Upload logo"}</span>
										</button>
										{logoUrl && (
											<button
												type="button"
												onClick={() => handleRemoveImage("removing_logo")}
												className="inline-flex h-9 items-center rounded-lg border border-[#dfdfdf] dark:border-neutral-700/80 bg-transparent hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200 dark:hover:border-red-900/50 px-3 text-[13px] font-medium text-red-600 dark:text-red-400 transition cursor-pointer"
											>
												Remove logo
											</button>
										)}
									</div>
								</div>
							</div>
						</div>

						{/* Party acronym / short name input */}
						<form.Field
							name="acronym"
							validators={{
								onChange: ({ value }) => (!value ? "Party acronym is required" : undefined),
							}}
							children={(field) => (
								<div className="w-full pt-1">
									<label className="text-[13px] font-semibold text-c-50 mb-1 block">Party Short Name</label>
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
								onChange: ({ value }) => (!value ? "Party full name is required" : undefined),
							}}
							children={(field) => (
								<div>
									<label className="text-[14px] font-semibold text-c-50">Party full name</label>
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

						{/* Date Founded & Display Order */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<form.Field
								name="dateFounded"
								children={(field) => (
									<div>
										<label className="text-[14px] font-semibold text-c-50 mb-1 block">Date Founded</label>
										<SelectDate
											initialData={field.state.value}
											selectedId={field.state.value}
											update={(val) => field.handleChange(val)}
											buttonText="Date founded"
											startMonth={new Date(1900, 0)}
											endMonth={new Date()}
										/>
									</div>
								)}
							/>

							<form.Field
								name="displayOrder"
								validators={{
									onChange: ({ value }) => (value < 1 ? "Order must be at least 1" : undefined),
								}}
								children={(field) => (
									<div>
										<label className="text-[14px] font-semibold text-c-50 mb-1 block">
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
						</div>

						{/* Party Brand Colors */}
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<label className="text-[14px] font-semibold text-c-50 flex items-center gap-1.5">
									<Palette className="size-4" />
									<span>Party Brand Colors</span>
								</label>
								<span className="text-[12px] text-c-40">Hex color codes</span>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{/* Light Mode / Primary Color */}
								<form.Field
									name="colorHex"
									children={(field) => (
										<div>
											<label className="text-[13px] font-medium text-c-60 mb-1.5 block">
												Primary Color (Light)
											</label>
											<div className="relative flex items-center">
												<label
													className="absolute left-2.5 size-7 rounded-lg border border-black/10 shadow-inner cursor-pointer shrink-0 transition-transform active:scale-95 flex items-center justify-center overflow-hidden"
													style={{
														backgroundColor: field.state.value || "#f1f5f9",
													}}
												>
													<input
														type="color"
														value={
															/^#[0-9A-Fa-f]{6}$/.test(field.state.value)
																? field.state.value
																: "#0284C7"
														}
														onChange={(e) => field.handleChange(e.target.value)}
														className="opacity-0 absolute inset-0 size-full cursor-pointer"
													/>
												</label>
												<Input
													type="text"
													placeholder="#0284C7"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => {
														let val = e.target.value;
														if (val && !val.startsWith("#")) val = `#${val}`;
														field.handleChange(val);
													}}
													className="pl-12 font-mono uppercase text-[14px]"
												/>
											</div>
										</div>
									)}
								/>

								{/* Dark Mode Color */}
								<form.Field
									name="darkColorHex"
									children={(field) => (
										<div>
											<label className="text-[13px] font-medium text-c-60 mb-1.5 block">
												Dark Mode Color
											</label>
											<div className="relative flex items-center">
												<label
													className="absolute left-2.5 size-7 rounded-lg border border-black/10 shadow-inner cursor-pointer shrink-0 transition-transform active:scale-95 flex items-center justify-center overflow-hidden"
													style={{
														backgroundColor: field.state.value || "#1e293b",
													}}
												>
													<input
														type="color"
														value={
															/^#[0-9A-Fa-f]{6}$/.test(field.state.value)
																? field.state.value
																: "#38BDF8"
														}
														onChange={(e) => field.handleChange(e.target.value)}
														className="opacity-0 absolute inset-0 size-full cursor-pointer"
													/>
												</label>
												<Input
													type="text"
													placeholder="#38BDF8"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => {
														let val = e.target.value;
														if (val && !val.startsWith("#")) val = `#${val}`;
														field.handleChange(val);
													}}
													className="pl-12 font-mono uppercase text-[14px]"
												/>
											</div>
										</div>
									)}
								/>
							</div>

							{/* Quick Presets */}
							<div>
								<span className="text-[12px] font-medium text-c-40 dark:text-c-50 block mb-1.5">
									Popular Presets:
								</span>
								<form.Subscribe
									selector={(state) => [state.values.colorHex, state.values.darkColorHex]}
									children={([colorHex, darkColorHex]) => (
										<div className="flex flex-wrap gap-1.5">
											{PARTY_COLOR_PRESETS.map((preset) => {
												const isSelected =
													Boolean(colorHex) &&
													colorHex?.toLowerCase() === preset.light.toLowerCase() &&
													darkColorHex?.toLowerCase() === preset.dark.toLowerCase();

												return (
													<button
														key={preset.name}
														type="button"
														onClick={() => {
															form.setFieldValue("colorHex", preset.light);
															form.setFieldValue("darkColorHex", preset.dark);
														}}
														className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[12px] transition cursor-pointer select-none ${isSelected
																? "border-c-80 dark:border-white bg-c-5 dark:bg-neutral-700 text-c-90 dark:text-white font-medium ring-1 ring-c-80 dark:ring-white"
																: "border-[#e5e7eb] dark:border-neutral-700/80 bg-white dark:bg-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-700/70 text-c-60 dark:text-c-70 hover:text-c-90 dark:hover:text-white"
															}`}
														title={`${preset.name}: Light ${preset.light} / Dark ${preset.dark}`}
													>
														<span
															className="size-3 rounded-full border border-black/10 dark:border-white/20 shrink-0 bg-[var(--preset-light)] dark:bg-[var(--preset-dark)] transition-colors"
															style={
																{
																	"--preset-light": preset.light,
																	"--preset-dark": preset.dark,
																} as React.CSSProperties
															}
														/>
														<span>{preset.name.split(" ")[0]}</span>
													</button>
												);
											})}
										</div>
									)}
								/>
							</div>
						</div>
					</DialogPadding>
					</div>

					<DialogFooter>
						<form.Subscribe
							selector={(state) => [state.canSubmit]}
							children={([canSubmit]) => (
								<Button
									type="submit"
									disabled={!canSubmit || saveMutation.isPending || isUploadingLogo || isUploadingCover}
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
