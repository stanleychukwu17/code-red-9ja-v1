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
import { Loader2, Palette, Plus, Umbrella } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PartyType } from "../tiles/party-tile";

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
	const [isUploadingLogo, setIsUploadingLogo] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fileInputRef = useRef<HTMLInputElement>(null);

	// TanStack Form configuration
	const form = useForm({
		defaultValues: {
			acronym: "",
			fullName: "",
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
				form.setFieldValue("displayOrder", party.display_order ?? 999);
				form.setFieldValue("colorHex", party.color_hex || "");
				form.setFieldValue("darkColorHex", party.dark_color_hex || "");
				setLogoUrl(party.logo || "");
			} else {
				form.setFieldValue("acronym", "");
				form.setFieldValue("fullName", "");
				form.setFieldValue("displayOrder", 999);
				form.setFieldValue("colorHex", "");
				form.setFieldValue("darkColorHex", "");
				setLogoUrl("");
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
	const handleRemoveImage = (which: "changing_logo" | "removing_logo") => {
		if (which === "removing_logo") {
			setLogoUrl("");
			setSelectedInputLogo(null);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		} else if (which == "changing_logo") {
			setLogoUrl("");
		}
	};

	// TanStack Query Mutation for saving/creating/updating a party
	const saveMutation = useMutation({
		mutationFn: async (values: {
			acronym: string;
			fullName: string;
			displayOrder: number;
			colorHex: string;
			darkColorHex: string;
		}) => {
			let finalLogoUrl = logoUrl;

			// Upload the party logo if a new one was selected
			if (selectedInputLogo) {
				setIsUploadingLogo(true);

				// party is changing logo, clear the local state just in case
				handleRemoveImage("changing_logo");

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
					setSelectedInputLogo(null);
					setLogoUrl(public_url);
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
						display_order: values.displayOrder,
						color_hex: values.colorHex.trim() || undefined,
						dark_color_hex: values.darkColorHex.trim() || undefined,
					},
				});
			} else {
				res = await createParty({
					data: {
						short_name: values.acronym.trim().toUpperCase(),
						name: values.fullName.trim(),
						logo: finalLogoUrl,
						display_order: values.displayOrder,
						color_hex: values.colorHex.trim() || undefined,
						dark_color_hex: values.darkColorHex.trim() || undefined,
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
			<DialogContent className="max-w-145 p-0 rounded-2xl border-none shadow-2xl   overflow-visible">
				<DialogHeader title={mode === "update" ? "Edit Party" : "Create Party"} />

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
								onChange: ({ value }) => (!value ? "Party acronym is required" : undefined),
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

						{/* Display Order input */}
						<form.Field
							name="displayOrder"
							validators={{
								onChange: ({ value }) => (value < 1 ? "Order must be at least 1" : undefined),
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
								<span className="text-[12px] font-medium text-c-40 block mb-1.5">
									Popular Presets:
								</span>
								<div className="flex flex-wrap gap-1.5">
									{PARTY_COLOR_PRESETS.map((preset) => (
										<button
											key={preset.name}
											type="button"
											onClick={() => {
												form.setFieldValue("colorHex", preset.light);
												form.setFieldValue("darkColorHex", preset.dark);
											}}
											className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#e5e7eb] bg-white hover:bg-slate-50 text-[12px] text-c-60 transition cursor-pointer"
											title={`${preset.name}: Light ${preset.light} / Dark ${preset.dark}`}
										>
											<span
												className="size-3 rounded-full border border-black/10"
												style={{ backgroundColor: preset.light }}
											/>
											<span>{preset.name.split(" ")[0]}</span>
										</button>
									))}
								</div>
							</div>
						</div>

						{/* Party Logo upload */}
						<div>
							<label className="text-[14px] font-semibold text-c-50">Party Logo</label>
							<div className="flex items-center gap-6 mt-2">
								<div className="size-28 rounded-full bg-[#e2e8f0] flex items-center justify-center text-c-40 border border-[#dfdfdf] overflow-hidden">
									{logoUrl ? (
										<img src={logoUrl} alt="Logo preview" className="size-full object-cover" />
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
