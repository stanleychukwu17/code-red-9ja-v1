/**
 * UserFormDialog Component
 *
 * A comprehensive dialog component used for creating and updating user profiles.
 * It handles form state, profile image uploads, and cascading location selection (Country -> State -> City).
 * This component is designed to be reusable across different parts of the application.
 */
import * as React from "react";
import { Button } from "../button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "../dialog";
import { Input } from "../input";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Plus, ChevronDown, Trash2 } from "lucide-react";
import { SelectGender } from "../selects/gender-select";
import { SelectDate } from "../selects/date-select";
import { SelectCountry } from "../selects/country-select";
import { SelectState } from "../selects/state-select";
import { SelectCity } from "../selects/city-select";
import { SelectParty } from "../selects/party-select";
import { convertToWebP } from "../../lib/image";
import NoProfileImageIcon from "../../icons/no-profile-image-icon";
import { cn } from "../../lib/utils";

export interface UserResult {
  id: number;
  fake_id: number;
  first_name: string;
  last_name: string;
  party_short_name: string;
  party_logo: string;
  party_id?: number;
  avatar_url?: string;
}

/**
 * Props for the UserFormDialog component.
 * It accepts various server functions (APIs) as props to fetch dropdown data
 * and handle submissions, making the component highly reusable and backend-agnostic.
 */
export interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (user: UserResult) => void;
  mode?: "create" | "update";
  user?: any;
  // Optional party restriction:
  partyId?: number;
  partyShortName?: string;
  // Injected server functions/APIs:
  getAllCountries: () => Promise<any>;
  getStates: (args: { data: { countryId: number } }) => Promise<any>;
  getCities: (args: {
    data: { stateId: number; limit?: number; cursor?: string | number };
  }) => Promise<any>;
  getParties: () => Promise<any>;
  getPresignedUploadURL: (args: {
    data: {
      original_name: string;
      mime_type: string;
      file_size: number;
      folder?: string;
      is_public?: boolean;
    };
  }) => Promise<any>;
  confirmFileUpload: (args: {
    data: { id: string | number; success: boolean };
  }) => Promise<any>;
  registerCandidate: (args: { data: any }) => Promise<any>;
  updateUser: (args: { data: any }) => Promise<any>;
  updateUserMoreInfo?: (args: { data: any }) => Promise<any>;
  updateUserPhoneNumbers?: (args: { data: any }) => Promise<any>;
  deleteUserPhoneNumber?: (args: { data: any }) => Promise<any>;
  loadUserPhoneNumber?: (args: { data: any }) => Promise<any>;
  getOccupations?: () => Promise<any>;
}

export function UserFormDialog({
  open,
  onClose,
  onSuccess,
  mode = "create",
  user,
  partyId,
  partyShortName,
  getAllCountries,
  getStates,
  getCities,
  getParties,
  getPresignedUploadURL,
  confirmFileUpload,
  registerCandidate,
  updateUser,
  updateUserMoreInfo,
  updateUserPhoneNumbers,
  deleteUserPhoneNumber,
  loadUserPhoneNumber,
  getOccupations,
}: UserFormDialogProps) {
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // console.log(user)

  const [activeTab, setActiveTab] = React.useState<"basic" | "more" | "phones">(
    "basic",
  );
  const [createdUser, setCreatedUser] = React.useState<UserResult | null>(null);

  const activeUser = mode === "update" ? user : createdUser;

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Mutation to handle the form submission.
  // Validates all required fields and calls either updateUser or registerCandidate based on the mode.
  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!values.firstName) throw new Error("First name is required");
      if (!values.lastName) throw new Error("Last name is required");
      if (!values.gender) throw new Error("Gender is required");
      if (!values.dateOfBirth) throw new Error("Date of birth is required");
      if (!values.residenceCountryId)
        throw new Error("Residence country is required");
      if (!values.residenceStateId)
        throw new Error("Residence state is required");
      if (!values.originCountryId)
        throw new Error("Country of origin is required");
      if (!values.originStateId) throw new Error("State of origin is required");

      const formattedDob = values.dateOfBirth.split("T")[0]; // formatted date of birth

      let res: any;
      if (mode === "update") {
        res = await updateUser({
          data: {
            id: user.fake_id,
            email: values.email.trim(),
            first_name: values.firstName.trim(),
            last_name: values.lastName.trim(),
            middle_name: values.middleName.trim(),
            gender: values.gender.toLowerCase(),
            avatar: avatarUrl,
            current_country: Number(values.residenceCountryId),
            current_state: Number(values.residenceStateId),
            current_city: values.residenceCityId
              ? Number(values.residenceCityId)
              : undefined,
            state_of_origin: Number(values.originStateId),
            party_id: values.partyId ? Number(values.partyId) : undefined,
          },
        });
      } else {
        res = await registerCandidate({
          data: {
            email: values.email.trim(),
            password: values.password,
            first_name: values.firstName.trim(),
            last_name: values.lastName.trim(),
            middle_name: values.middleName.trim(),
            gender: values.gender.toLowerCase(),
            date_of_birth: formattedDob,
            current_country: Number(values.residenceCountryId),
            current_state: Number(values.residenceStateId),
            current_city: values.residenceCityId
              ? Number(values.residenceCityId)
              : undefined,
            state_of_origin: Number(values.originStateId),
            party_id: values.partyId ? Number(values.partyId) : undefined,
            avatar: avatarUrl,
          },
        });
      }

      console.log("RESPONSE:", res);

      if (!res.success) {
        throw new Error(res.message || `Failed to ${mode} user`);
      }

      return {
        id: mode === "update" ? user?.id : res.data.id,
        fake_id:
          mode === "update" ? user?.fake_id || user?.fakeId : res.data.fake_id,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        partyId: values.partyId,
      };
    },
    onSuccess: async (data) => {
      let partyLogo = "";
      let partyShortNameVal = "";
      try {
        const partiesRes = await getParties();
        if (partiesRes.success && partiesRes.data?.parties) {
          const partyObj = partiesRes.data.parties.find(
            (p: any) => Number(p.id) === Number(data.partyId),
          );
          if (partyObj) {
            partyLogo = partyObj.logo;
            partyShortNameVal = partyObj.short_name;
          }
        }
      } catch (err) {
        console.error("Failed to load party details for callback", err);
      }

      const result: UserResult = {
        id: data.id,
        fake_id: data.fake_id,
        first_name: `${data.firstName} ${data.lastName}`,
        last_name: data.lastName,
        party_logo: partyLogo,
        party_short_name: partyShortNameVal,
        party_id: data.partyId,
        avatar_url: avatarUrl || undefined,
      };

      onSuccess?.(result);

      if (mode === "create") {
        setCreatedUser(result);
        setActiveTab("more");
      } else {
        onClose();
      }
    },
    onError: (err: any) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  // Initialize the form state using @tanstack/react-form
  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      middleName: "",
      gender: "",
      dateOfBirth: "",
      residenceCountryId: undefined as number | undefined,
      residenceStateId: undefined as number | undefined,
      residenceCityId: undefined as number | undefined,
      originCountryId: 161 as number | undefined,
      originStateId: undefined as number | undefined,
      partyId: undefined as number | undefined,
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  // Effect to automatically resolve the party ID if only a party short name was provided
  React.useEffect(() => {
    const resolvePartyId = async () => {
      if (open && partyId === undefined && partyShortName) {
        try {
          const partiesRes = await getParties();
          if (partiesRes.success && partiesRes.data?.parties) {
            const partyObj = partiesRes.data.parties.find(
              (p: any) =>
                p.short_name?.toLowerCase() === partyShortName.toLowerCase(),
            );
            if (partyObj) {
              form.setFieldValue("partyId", partyObj.id);
            }
          }
        } catch (err) {
          console.error("Failed to resolve party ID from short name", err);
        }
      }
    };
    resolvePartyId();
  }, [open, partyId, partyShortName, getParties]);

  // Effect to initialize the form fields whenever the dialog opens.
  // It populates data for 'update' mode and resets fields for 'create' mode.
  React.useEffect(() => {
    if (open) {
      const isPartyLocked =
        partyId !== undefined || partyShortName !== undefined;

      if (mode === "update" && user) {
        form.setFieldValue("firstName", user.first_name || "");
        form.setFieldValue("lastName", user.last_name || "");
        form.setFieldValue("middleName", user.middle_name || "");
        form.setFieldValue("gender", user.gender || "");
        form.setFieldValue("dateOfBirth", user.date_of_birth || "");
        form.setFieldValue("residenceCountryId", user.current_country);
        form.setFieldValue("residenceStateId", user.current_state);
        form.setFieldValue("residenceCityId", user.current_city || undefined);
        form.setFieldValue("originCountryId", 161);
        form.setFieldValue("originStateId", user.state_of_origin || undefined);
        form.setFieldValue(
          "partyId",
          isPartyLocked
            ? (partyId ?? user.party_id)
            : user.party_id || undefined,
        );
        form.setFieldValue("email", user.email || "");
        form.setFieldValue("password", "");
        setAvatarUrl(user.avatar || "");
      } else {
        form.setFieldValue("firstName", "");
        form.setFieldValue("lastName", "");
        form.setFieldValue("middleName", "");
        form.setFieldValue("gender", "");
        form.setFieldValue("dateOfBirth", "");
        form.setFieldValue("residenceCountryId", undefined);
        form.setFieldValue("residenceStateId", undefined);
        form.setFieldValue("residenceCityId", undefined);
        form.setFieldValue("originCountryId", 161);
        form.setFieldValue("originStateId", undefined);
        form.setFieldValue("partyId", partyId);
        form.setFieldValue("email", "");
        form.setFieldValue("password", "");
        setAvatarUrl("");
      }
      setError(null);
    }
  }, [open, mode, user, partyId, partyShortName]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Handles the profile image upload process:
  // 1. Converts the selected image to WebP
  // 2. Fetches a presigned upload URL
  // 3. Uploads the file to the storage provider
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const file = await convertToWebP(rawFile);

      const res = await getPresignedUploadURL({
        data: {
          original_name: file.name,
          mime_type: file.type,
          file_size: file.size,
          folder: "avatars",
          is_public: true,
        },
      });

      if (!res.success || !res.data) {
        throw new Error(res.message || "Failed to initiate file upload");
      }

      const { upload_url, public_url, file_id } = res.data;

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

      await confirmFileUpload({ data: { id: file_id, success: true } });
      setAvatarUrl(public_url);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during file upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setAvatarUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // If the dialog is opened in the context of a specific party (e.g. from the party members page),
  // this will be true and the Party selection field will be hidden to prevent reassigning the user.
  const isPartyLocked = partyId !== undefined || partyShortName !== undefined;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white max-h-[90vh] flex flex-col">
        <DialogHeader title={mode === "update" ? "Edit user" : "Add user"} />

        {(mode === "update" || createdUser) && (
          <div className="flex border-b border-[#e0e0e0] px-6 gap-6 shrink-0 mt-2">
            <button
              type="button"
              className={cn(
                "pb-2 text-[14px] font-medium border-b-2 transition",
                activeTab === "basic"
                  ? "border-black text-black"
                  : "border-transparent text-c-50 hover:text-black",
              )}
              onClick={() => setActiveTab("basic")}
            >
              Basic Info
            </button>
            <button
              type="button"
              className={cn(
                "pb-2 text-[14px] font-medium border-b-2 transition",
                activeTab === "more"
                  ? "border-black text-black"
                  : "border-transparent text-c-50 hover:text-black",
              )}
              onClick={() => setActiveTab("more")}
            >
              More Info
            </button>
            <button
              type="button"
              className={cn(
                "pb-2 text-[14px] font-medium border-b-2 transition",
                activeTab === "phones"
                  ? "border-black text-black"
                  : "border-transparent text-c-50 hover:text-black",
              )}
              onClick={() => setActiveTab("phones")}
            >
              Phone Numbers
            </button>
          </div>
        )}

        <div
          style={{ display: activeTab === "basic" ? "flex" : "none" }}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto min-h-0">
              <DialogPadding className="space-y-6 pb-6 pt-4">
                {/* Profile image section */}
                <div className="flex flex-col gap-2">
                  <label className="text-[14px] text-c-50">Profile image</label>
                  <div className="flex items-center gap-4">
                    <div className="relative size-24 rounded-full bg-[#f0f0f0] border border-[#e0e0e0] flex items-center justify-center overflow-hidden shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar Preview"
                          className="size-full object-cover"
                        />
                      ) : (
                        <NoProfileImageIcon className="size-24" />
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="size-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={handleUploadClick}
                        className="flex h-10 items-center gap-1.5 rounded-[10px] bg-[#1a1a1a] hover:bg-[#000] px-4 text-[14px] text-white transition cursor-pointer"
                      >
                        <Plus className="size-4" />
                        <span>Upload image</span>
                      </button>
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="h-10 px-4 text-[14px] text-red hover:bg-red-50 rounded-[10px] border border-[#dfdfdf] transition cursor-pointer"
                        >
                          Remove image
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Name fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[14px] text-c-50">First name</label>
                    <form.Field
                      name="firstName"
                      children={(field: any) => (
                        <Input
                          type="text"
                          placeholder="First name"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          errorMsg={field.state.meta.errors?.join(", ")}
                        />
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[14px] text-c-50">Last name</label>
                    <form.Field
                      name="lastName"
                      children={(field: any) => (
                        <Input
                          type="text"
                          placeholder="Last name"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          errorMsg={field.state.meta.errors?.join(", ")}
                        />
                      )}
                    />
                  </div>
                </div>

                {/* Other names */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] text-c-50">
                    Other names (Optional)
                  </label>
                  <form.Field
                    name="middleName"
                    children={(field: any) => (
                      <Input
                        type="text"
                        placeholder="Other names"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    )}
                  />
                </div>

                {/* Gender and DOB */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[14px] text-c-50">Gender</label>
                    <form.Field
                      name="gender"
                      children={(field: any) => (
                        <SelectGender
                          initialData={field.state.value}
                          update={(val) => field.handleChange(val)}
                          errorMsg={field.state.meta.errors?.join(", ")}
                        />
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[14px] text-c-50">
                      Date of birth
                    </label>
                    <form.Field
                      name="dateOfBirth"
                      children={(field: any) => (
                        <SelectDate
                          initialData={field.state.value}
                          selectedId={field.state.value}
                          update={(val) => field.handleChange(val)}
                          errorMsg={field.state.meta.errors?.join(", ")}
                        />
                      )}
                    />
                  </div>
                </div>

                {/* State of Origin */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] text-c-50">
                    State of Origin
                  </label>
                  <form.Field
                    name="originStateId"
                    children={(field: any) => (
                      <SelectState
                        selectedId={
                          field.state.value !== undefined
                            ? String(field.state.value)
                            : undefined
                        }
                        update={(item) => field.handleChange(item.id)}
                        countryOriginalId={161}
                        fetchStates={getStates}
                        disabled={false}
                        errorMsg={field.state.meta.errors?.join(", ")}
                      />
                    )}
                  />
                </div>

                {/* Residence Location */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[14px] text-c-50">
                      Residence Country
                    </label>
                    <form.Field
                      name="residenceCountryId"
                      children={(field: any) => (
                        <SelectCountry
                          selectedId={
                            field.state.value !== undefined
                              ? String(field.state.value)
                              : undefined
                          }
                          update={(item) => {
                            field.handleChange(item.id);
                            form.setFieldValue("residenceStateId", undefined);
                            form.setFieldValue("residenceCityId", undefined);
                          }}
                          fetchCountries={getAllCountries}
                          errorMsg={field.state.meta.errors?.join(", ")}
                        />
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[14px] text-c-50">
                      Residence State
                    </label>
                    <form.Field
                      name="residenceStateId"
                      children={(field: any) => (
                        <form.Field
                          name="residenceCountryId"
                          children={(countryField: any) => (
                            <SelectState
                              selectedId={
                                field.state.value !== undefined
                                  ? String(field.state.value)
                                  : undefined
                              }
                              update={(item) => {
                                field.handleChange(item.id);
                                form.setFieldValue(
                                  "residenceCityId",
                                  undefined,
                                );
                              }}
                              countryOriginalId={countryField.state.value}
                              fetchStates={getStates}
                              disabled={!countryField.state.value}
                              errorMsg={field.state.meta.errors?.join(", ")}
                            />
                          )}
                        />
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[14px] text-c-50">
                      Residence City
                    </label>
                    <form.Field
                      name="residenceCityId"
                      children={(field: any) => (
                        <form.Field
                          name="residenceStateId"
                          children={(stateField: any) => (
                            <SelectCity
                              selectedId={
                                field.state.value !== undefined
                                  ? String(field.state.value)
                                  : undefined
                              }
                              update={(item) => field.handleChange(item.id)}
                              stateId={stateField.state.value}
                              fetchCities={getCities}
                              disabled={!stateField.state.value}
                              errorMsg={field.state.meta.errors?.join(", ")}
                            />
                          )}
                        />
                      )}
                    />
                  </div>
                </div>

                {/* Party (Only show if party is not locked/passed as prop) */}
                {!isPartyLocked && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[14px] text-c-50">Party</label>
                    <form.Field
                      name="partyId"
                      children={(field: any) => (
                        <SelectParty
                          selectedId={
                            field.state.value !== undefined
                              ? String(field.state.value)
                              : undefined
                          }
                          update={(item) => field.handleChange(item.id)}
                          fetchParties={getParties}
                          errorMsg={field.state.meta.errors?.join(", ")}
                        />
                      )}
                    />
                  </div>
                )}

                {/* Email and Password */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[14px] text-c-50">Email</label>
                    <form.Field
                      name="email"
                      children={(field: any) => (
                        <Input
                          type="email"
                          placeholder="Enter email"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          errorMsg={field.state.meta.errors?.join(", ")}
                        />
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[14px] text-c-50">Password</label>
                    <form.Field
                      name="password"
                      children={(field: any) => (
                        <Input
                          type="password"
                          placeholder="Enter password"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          errorMsg={field.state.meta.errors?.join(", ")}
                        />
                      )}
                    />
                  </div>
                </div>
              </DialogPadding>
            </div>
            {error && (
              <div className="px-6 pb-4 shrink-0">
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                  {error}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="h-11 px-6 bg-[#00cf79] hover:bg-[#00b568] text-[16px] font-bold text-white rounded-xl cursor-pointer flex items-center gap-2"
              >
                {saveMutation.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {mode === "update"
                  ? "Save Basic Info"
                  : "Create User & Continue"}
              </Button>
            </DialogFooter>
          </form>
        </div>

        {activeTab === "more" && (
          <MoreInfoTab
            user={activeUser}
            updateUserMoreInfo={updateUserMoreInfo}
            getOccupations={getOccupations}
            onClose={onClose}
            onSuccess={() => {
              if (mode === "create") setActiveTab("phones");
              else onClose();
            }}
          />
        )}
        {activeTab === "phones" && (
          <PhoneNumbersTab
            user={activeUser}
            updateUserPhoneNumbers={updateUserPhoneNumbers}
            deleteUserPhoneNumber={deleteUserPhoneNumber}
            loadUserPhoneNumber={loadUserPhoneNumber}
            getAllCountries={getAllCountries}
            onClose={onClose}
            onSuccess={() => {
              onClose();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// =======================
// SUB-COMPONENTS
// =======================

// The MoreInfoTab
function MoreInfoTab({
  user,
  updateUserMoreInfo,
  getOccupations,
  onClose,
  onSuccess,
}: any) {
  const [error, setError] = React.useState<string | null>(null);
  const [occupations, setOccupations] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (getOccupations) {
      getOccupations()
        .then((res: any) => {
          if (res?.success && res?.data) {
            // Assuming data is an array of {id, name} or {data: {occupations}}
            const list = res.data.occupations || res.data || [];
            setOccupations(list);
          }
        })
        .catch(console.error);
    }
  }, [getOccupations]);

  const form = useForm({
    defaultValues: {
      occupation_id: user?.profile?.occupation_id
        ? String(user.profile.occupation_id)
        : "",
      educational_status: user?.profile?.educational_status || "",
      highest_degree: user?.profile?.highest_degree || "",
      graduation_year: user?.profile?.graduation_year || "",
      school_name: user?.profile?.school_name || "",
      religion: user?.profile?.religion || "",
      marital_status: user?.profile?.marital_status || "",
      education_level: user?.profile?.education_level || "",
      address: user?.profile?.address || "",
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!updateUserMoreInfo) {
        return { success: true }; // Placeholder
      }
      const res = await updateUserMoreInfo({
        data: {
          user_id: user.fake_id || user.id,
          ...values,
        },
      });
      if (!res?.success)
        throw new Error(res?.message || "Failed to save profile");
      return res.data;
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (err: any) => {
      setError(err.message || "An error occurred.");
    },
  });

  const renderSelect = (
    name: string,
    label: string,
    options: { label: string; value: string }[],
  ) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[14px] text-c-50">{label}</label>
      <form.Field
        name={name as any}
        children={(field: any) => (
          <select
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            className="flex h-11 w-full rounded-[10px] border border-[#dfdfdf] bg-[#fdfdfd] px-4 text-[14px] text-black outline-none transition focus:border-black appearance-none"
          >
            <option value="">Select {label}</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      />
    </div>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col flex-1 overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto min-h-0">
        <DialogPadding className="space-y-6 pb-6 pt-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-[14px] text-c-50">Occupation</label>
              <form.Field
                name="occupation_id"
                children={(field: any) => (
                  <select
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="flex h-11 w-full rounded-[10px] border border-[#dfdfdf] bg-[#fdfdfd] px-4 text-[14px] text-black outline-none transition focus:border-black appearance-none"
                  >
                    <option value="">Select Occupation</option>
                    {occupations.map((o: any) => (
                      <option key={o.id} value={o.id}>
                        {o.name || o.title}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
            {renderSelect("educational_status", "Educational Status", [
              { label: "Graduate", value: "graduate" },
              { label: "Student", value: "student" },
              { label: "None", value: "none" },
            ])}
            {renderSelect("education_level", "Education Level", [
              { label: "None", value: "none" },
              { label: "Primary", value: "primary" },
              { label: "Secondary", value: "secondary" },
              { label: "Bachelors", value: "bachelors" },
              { label: "Masters", value: "masters" },
              { label: "PhD", value: "phd" },
            ])}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] text-c-50">Highest Degree</label>
              <form.Field
                name="highest_degree"
                children={(field: any) => (
                  <Input
                    type="text"
                    placeholder="Highest Degree"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] text-c-50">Graduation Year</label>
              <form.Field
                name="graduation_year"
                children={(field: any) => (
                  <Input
                    type="text"
                    placeholder="YYYY"
                    maxLength={4}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-[14px] text-c-50">School Name</label>
              <form.Field
                name="school_name"
                children={(field: any) => (
                  <Input
                    type="text"
                    placeholder="School Name"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              />
            </div>
            {renderSelect("religion", "Religion", [
              { label: "Christianity", value: "christianity" },
              { label: "Islam", value: "islam" },
              { label: "Traditional", value: "traditional" },
              { label: "Other", value: "other" },
            ])}
            {renderSelect("marital_status", "Marital Status", [
              { label: "Single", value: "single" },
              { label: "Married", value: "married" },
              { label: "Divorced", value: "divorced" },
              { label: "Widowed", value: "widowed" },
            ])}
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-[14px] text-c-50">Address</label>
              <form.Field
                name="address"
                children={(field: any) => (
                  <Input
                    type="text"
                    placeholder="Full Address"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                )}
              />
            </div>
          </div>
        </DialogPadding>
      </div>
      <DialogFooter>
        <Button
          type="button"
          onClick={onClose}
          className="h-11 px-6 bg-transparent hover:bg-black/5 text-[16px] font-bold text-black rounded-xl cursor-pointer"
        >
          Finish Later
        </Button>
        <Button
          type="submit"
          disabled={saveMutation.isPending}
          className="h-11 px-6 bg-[#00cf79] hover:bg-[#00b568] text-[16px] font-bold text-white rounded-xl cursor-pointer flex items-center gap-2 ml-2"
        >
          {saveMutation.isPending && (
            <Loader2 className="size-4 animate-spin" />
          )}
          Save & Continue
        </Button>
      </DialogFooter>
    </form>
  );
}

type phoneType = {
  id: string | number;
  phone: string;
  phonecode: string;
  raw_input: string;
  on_whatsapp: "yes" | "no";
  is_default: boolean;
};
// The PhoneNumbersTab
function PhoneNumbersTab({
  user,
  updateUserPhoneNumbers,
  deleteUserPhoneNumber,
  loadUserPhoneNumber,
  getAllCountries,
  onClose,
  onSuccess,
}: any) {
  const [error, setError] = React.useState<string | null>(null);
  const [residentCountryPhoneCode, setResidentCountryPhoneCode] =
    React.useState<string | null>(null);
  const userCountry = user.current_country;

  // Fetch phone numbers asynchronously when the tab mounts.
  // The query uses fake_id (or id as fallback) as the unique query key identifier.
  const {
    data: userPhoneNumbers,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["user-phonenumbers", user?.fake_id],

    // query function that fetches the number
    queryFn: async () => {
      if (!loadUserPhoneNumber) return null;
      const res = await loadUserPhoneNumber({
        data: { user_id: user?.fake_id },
      });
      if (!res?.success)
        throw new Error(res?.message || "Failed to load phone numbers");
      return res.data?.phone_numbers || [];
    },

    // Only run the query if the load function is provided and we have a valid user ID
    enabled: !!loadUserPhoneNumber && !!user?.fake_id,

    // disable refresh
    staleTime: Infinity,
  });

  // Fetch all countries to be able to extract the user current country international phone code
  const { data: loadedCountries, isLoading: isCountriesLoading } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      if (!getAllCountries) return null;
      const res = await getAllCountries();
      return res;
    },
    enabled: !!getAllCountries,
    staleTime: Infinity,
  });

  // Watch for loaded countries and the user's current country,
  // then look up and store the corresponding international call code for the user country.
  React.useEffect(() => {
    const countries = loadedCountries?.data?.countries || [];

    if (countries.length > 0) {
      // search for the user current country info
      const match = countries.find((c: any) => c.id == userCountry);
      if (match && match.phonecode) {
        setResidentCountryPhoneCode(match.phonecode);
      }
    }
  }, [loadedCountries, userCountry]);

  // Determine the default initial state for the phone numbers array
  const initialPhones: phoneType[] = React.useMemo(() => {
    // 1. Prioritize freshly fetched data from TanStack Query
    if (userPhoneNumbers && userPhoneNumbers.length > 0)
      return userPhoneNumbers;

    // 2. Default to a single empty row template
    return [
      {
        id: 0,
        phone: "",
        phonecode: "",
        raw_input: "",
        on_whatsapp: "no",
        is_default: false,
      },
    ];
  }, [userPhoneNumbers]);

  // form management for phone numbers
  const form = useForm({
    defaultValues: {
      phones: initialPhones,
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value.phones);
    },
  });

  // Remove phone number
  const handleRemovePhoneNumber = async (
    index: number,
    phoneObj: any,
    field: any,
  ) => {
    console.log("delete number");
    return;
    // If the phone object has a valid ID (> 0), it is already saved on the server.
    // We must call the backend API to physically delete it from the database.
    if (phoneObj.id && Number(phoneObj.id) > 0) {
      if (deleteUserPhoneNumber) {
        try {
          const res = await deleteUserPhoneNumber({
            data: { id: phoneObj.id },
          });
          if (res && res.success === false) {
            console.error("Failed to delete phone number:", res.message);
          }
        } catch (error) {
          console.error("Error deleting phone number:", error);
        }
      } else {
        console.warn("deleteUserPhoneNumber function is not provided");
      }
    }

    // Always remove the row from the local form state so the UI updates instantly
    const newPhones = [...field.state.value];
    newPhones.splice(index, 1);
    field.handleChange(newPhones);
  };

  // mutation for saving phone numbers back to the server
  const saveMutation = useMutation({
    mutationFn: async (values: phoneType[]) => {
      // Clean up the payload by omitting any empty rows the user didn't fill out
      const validPhones = values.filter(
        (p: phoneType) => p.raw_input?.trim() !== "",
      );
      if (validPhones.length === 0) return { success: true };

      if (!updateUserPhoneNumbers) {
        return { success: true };
      }

      const res = await updateUserPhoneNumbers({
        data: {
          user_fid: user.fake_id,
          phones: validPhones,
        },
      });
      if (!res?.success)
        throw new Error(res?.message || "Failed to save phone numbers");
      return res.data;
    },
    onSuccess: () => {
      refetch();
      onSuccess?.();
    },
    onError: (err: any) => {
      setError(err.message || "An error occurred.");
    },
  });

  // Effect to synchronize the form state if the API query resolves after initial mount.
  // This safely updates the form without losing reactivity.
  React.useEffect(() => {
    if (userPhoneNumbers && userPhoneNumbers.length > 0) {
      form.setFieldValue("phones", userPhoneNumbers);
    }
  }, [userPhoneNumbers, form]);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[#00cf79]" />
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col flex-1 overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto min-h-0">
        <DialogPadding className="space-y-6 pb-6 pt-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <form.Field
              name="phones"
              children={(field: any) => (
                <div className="flex flex-col gap-3">
                  {field.state.value.map((phoneObj: any, index: number) => (
                    // each of the phone number wrapper
                    <div
                      key={index}
                      data-id={phoneObj.id}
                      className="flex flex-col gap-1.5 w-full"
                    >
                      {/* Header - show only for the first phone number */}
                      {index === 0 && (
                        <div className="flex items-center gap-3 w-full px-1">
                          <label className="text-[14px] text-c-50 flex-1">
                            Phone Number
                          </label>
                          <label className="text-[14px] text-c-50 w-[140px]">
                            WhatsApp?
                          </label>
                          <label className="text-[14px] text-c-50 w-[60px] text-center">
                            Default?
                          </label>
                          <div className="w-11"></div>{" "}
                          {/* Spacer for delete button */}
                        </div>
                      )}

                      {/* inputs */}
                      <div className="flex items-center gap-3 w-full">
                        {/* Prefix + Input container */}
                        <div className="flex items-center h-11 flex-1 rounded-[10px] border border-[#dfdfdf] bg-[#fdfdfd] focus-within:border-black transition overflow-hidden">
                          <span
                            className="px-3 text-[14px] text-gray-500 bg-gray-50 border-r border-[#dfdfdf] h-full flex items-center shrink-0"
                            style={{
                              cursor:
                                !!phoneObj.id && Number(phoneObj.id) > 0
                                  ? "not-allowed"
                                  : "default",
                            }}
                          >
                            {phoneObj.phonecode
                              ? `+${phoneObj.phonecode}`
                              : `+${residentCountryPhoneCode}`}
                          </span>
                          <input
                            type="text"
                            placeholder="xxx xxx xxxx"
                            value={phoneObj.raw_input}
                            disabled={!!phoneObj.id && Number(phoneObj.id) > 0}
                            onChange={(e) => {
                              const newPhones = [...field.state.value];
                              newPhones[index].raw_input = e.target.value;
                              field.handleChange(newPhones);
                            }}
                            className="flex-1 h-full px-3 text-[14px] text-black outline-none bg-transparent min-w-0 disabled:cursor-"
                            style={{
                              cursor:
                                !!phoneObj.id && Number(phoneObj.id) > 0
                                  ? "not-allowed"
                                  : "default",
                            }}
                          />
                        </div>

                        {/* WhatsApp Select */}
                        <div className="flex items-center h-11 w-[140px] rounded-[10px] border border-[#dfdfdf] bg-[#fdfdfd] shrink-0">
                          <select
                            value={phoneObj.on_whatsapp}
                            onChange={(e) => {
                              const newPhones = [...field.state.value];
                              newPhones[index].on_whatsapp = e.target.value;
                              field.handleChange(newPhones);
                            }}
                            className="w-full h-full px-3 text-[14px] text-black outline-none bg-transparent cursor-pointer font-medium appearance-none"
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </select>
                        </div>

                        {/* Default Radio */}
                        <div className="flex items-center justify-center h-11 w-[60px] shrink-0">
                          <input
                            type="radio"
                            name="defaultPhone"
                            checked={phoneObj.is_default || false}
                            onChange={(e) => {
                              const newPhones = [...field.state.value];
                              // Enforce that only one phone number can be the default at a time
                              newPhones.forEach((p) => (p.is_default = false));
                              newPhones[index].is_default = true;
                              field.handleChange(newPhones);
                            }}
                            className="w-5 h-5 cursor-pointer accent-[#00cf79]"
                            title="Set as default phone number"
                          />
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() =>
                            handleRemovePhoneNumber(index, phoneObj, field)
                          }
                          className="h-11 w-11 text-red-500 hover:bg-red-50 rounded-[10px] transition flex items-center justify-center shrink-0 border border-transparent hover:border-red-100"
                          title="Remove"
                        >
                          <Trash2 className="size-5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      field.handleChange([
                        ...field.state.value,
                        {
                          id: 0,
                          phone: "",
                          on_whatsapp: "no",
                          is_default: false,
                        },
                      ]);
                    }}
                    className="text-[#00cf79] font-medium text-[14px] text-left hover:underline w-fit mt-2"
                  >
                    + Add Phone Number
                  </button>
                </div>
              )}
            />
          </div>
        </DialogPadding>
      </div>
      <DialogFooter>
        <Button
          type="button"
          onClick={onClose}
          className="h-11 px-6 bg-transparent hover:bg-black/5 text-[16px] font-bold text-black rounded-xl cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saveMutation.isPending}
          className="h-11 px-6 bg-[#00cf79] hover:bg-[#00b568] text-[16px] font-bold text-white rounded-xl cursor-pointer flex items-center gap-2 ml-2"
        >
          {saveMutation.isPending && (
            <Loader2 className="size-4 animate-spin" />
          )}
          Save Finish
        </Button>
      </DialogFooter>
    </form>
  );
}
