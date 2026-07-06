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
import { useMutation } from "@tanstack/react-query";
import { Loader2, Plus, ChevronDown } from "lucide-react";
import { SelectGender } from "../selects/gender-select";
import { SelectDate } from "../selects/date-select";
import { SelectCountry } from "../selects/country-select";
import { SelectState } from "../selects/state-select";
import { SelectCity } from "../selects/city-select";
import { SelectParty } from "../selects/party-select";
import { SelectResponsiveWrapper } from "../selects/select-responsive-wrapper";
import { GeneralCommand } from "../command/general-command";
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

const ROLE_OPTIONS = [
  { label: "Admin", value: "admin" },
  { label: "Party Member", value: "partymember" },
  { label: "User", value: "user" },
];

const ROLE_LEVEL_OPTIONS: Record<string, { label: string; value: string }[]> = {
  admin: [
    { label: "Super Admin", value: "superadmin" },
    { label: "Admin", value: "admin" },
  ],
  partymember: [
    { label: "Admin", value: "admin" },
    { label: "Member", value: "member" },
    { label: "Placeholder", value: "placeholder" },
  ],
  user: [
    { label: "Polling Agent", value: "pollingagent" },
    { label: "User", value: "user" },
  ],
};

function SelectRole({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: "admin" | "partymember" | "user") => void;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = ROLE_OPTIONS.find((o) => o.value === value);

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select role"
      align="start"
      className="w-full"
      trigger={
        <Button
          variant="select"
          size="select"
          className="justify-between gap-2 w-full"
          type="button"
        >
          <p className="whitespace-normal text-left line-clamp-1 font-normal">
            {selected ? selected.label : "Select role"}
          </p>
          <ChevronDown className="ml-auto size-4 text-c-80" />
        </Button>
      }
    >
      <GeneralCommand
        data={ROLE_OPTIONS}
        getId={(item) => item.value}
        getName={(item) => item.label}
        handleSelect={(item) => {
          onChange(item.value as any);
          setOpen(false);
        }}
        selectedId={value}
      />
    </SelectResponsiveWrapper>
  );
}

function SelectRoleLevel({
  role,
  value,
  onChange,
}: {
  role: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const options = ROLE_LEVEL_OPTIONS[role] || [];
  const selected = options.find((o) => o.value === value);

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select role level"
      align="start"
      className="w-full"
      trigger={
        <Button
          variant="select"
          size="select"
          className="justify-between gap-2 w-full font-normal"
          type="button"
          disabled={!role}
        >
          <p className="whitespace-normal text-left line-clamp-1">
            {selected ? selected.label : "Select role level"}
          </p>
          <ChevronDown className="ml-auto size-4 text-c-80" />
        </Button>
      }
    >
      <GeneralCommand
        data={options}
        getId={(item) => item.value}
        getName={(item) => item.label}
        handleSelect={(item) => {
          onChange(item.value);
          setOpen(false);
        }}
        selectedId={value}
      />
    </SelectResponsiveWrapper>
  );
}

export interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (user: UserResult) => void;
  mode?: "create" | "update";
  user?: any;
  // Optional party restriction:
  partyId?: number;
  partyShortName?: string;
  // Optional default role & level
  defaultRole?: "admin" | "partymember" | "user";
  defaultRoleLevel?: string;
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
}

export function UserFormDialog({
  open,
  onClose,
  onSuccess,
  mode = "create",
  user,
  partyId,
  partyShortName,
  defaultRole,
  defaultRoleLevel,
  getAllCountries,
  getStates,
  getCities,
  getParties,
  getPresignedUploadURL,
  confirmFileUpload,
  registerCandidate,
  updateUser,
}: UserFormDialogProps) {
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      role: "user" as "user" | "partymember" | "admin",
      roleLevel: "user" as string,
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  const role = useStore(form.store, (state) => state.values.role);

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

  React.useEffect(() => {
    if (open) {
      const isPartyLocked =
        partyId !== undefined || partyShortName !== undefined;
      const initialRole =
        defaultRole || (isPartyLocked ? "partymember" : "user");
      const initialRoleLevel =
        defaultRoleLevel || (isPartyLocked ? "member" : "user");

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
        form.setFieldValue(
          "role",
          defaultRole || (isPartyLocked ? "partymember" : user.role || "user"),
        );
        form.setFieldValue("roleLevel", user.role_level || initialRoleLevel);
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
        form.setFieldValue("role", initialRole);
        form.setFieldValue("roleLevel", initialRoleLevel);
        setAvatarUrl("");
      }
      setError(null);
    }
  }, [
    open,
    mode,
    user,
    partyId,
    partyShortName,
    defaultRole,
    defaultRoleLevel,
  ]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

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
      if (values.role === "partymember" && !values.partyId)
        throw new Error("Party is required");
      if (mode !== "update" && !values.password)
        throw new Error("Password is required");
      if (!values.role) throw new Error("Role is required");
      if (!values.roleLevel) throw new Error("Role level is required");

      const formattedDob = values.dateOfBirth.split("T")[0];

      let res: any;
      if (mode === "update") {
        res = await updateUser({
          data: {
            id: user.id,
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
            role: values.role,
            role_level: values.roleLevel,
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
            role: values.role,
            role_level: values.roleLevel,
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

      onSuccess?.({
        id: data.id,
        fake_id: data.fake_id,
        first_name: `${data.firstName} ${data.lastName}`,
        last_name: data.lastName,
        party_logo: partyLogo,
        party_short_name: partyShortNameVal,
        party_id: data.partyId,
        avatar_url: avatarUrl || undefined,
      });
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  const isPartyLocked = partyId !== undefined || partyShortName !== undefined;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white max-h-[90vh] flex flex-col">
        <DialogHeader title={mode === "update" ? "Edit user" : "Add user"} />

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
                    validators={{
                      onChange: ({ value }) =>
                        !value ? "First name is required" : undefined,
                    }}
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
                    validators={{
                      onChange: ({ value }) =>
                        !value ? "Last name is required" : undefined,
                    }}
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
                    validators={{
                      onChange: ({ value }) =>
                        !value ? "Gender is required" : undefined,
                    }}
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
                  <label className="text-[14px] text-c-50">Date of birth</label>
                  <form.Field
                    name="dateOfBirth"
                    validators={{
                      onChange: ({ value }) =>
                        !value ? "Date of birth is required" : undefined,
                    }}
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
                <label className="text-[14px] text-c-50">State of Origin</label>
                <form.Field
                  name="originStateId"
                  validators={{
                    onChange: ({ value }) =>
                      !value ? "State of origin is required" : undefined,
                  }}
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
                    validators={{
                      onChange: ({ value }) =>
                        !value ? "Country is required" : undefined,
                    }}
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
                    validators={{
                      onChange: ({ value }) =>
                        !value ? "State is required" : undefined,
                    }}
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
                              form.setFieldValue("residenceCityId", undefined);
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

              {/* Role and Role Level */}
              <div className="grid grid-cols-2 gap-4">
                {!isPartyLocked && !defaultRole ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[14px] text-c-50">Role</label>
                    <form.Field
                      name="role"
                      validators={{
                        onChange: ({ value }) =>
                          !value ? "Role is required" : undefined,
                      }}
                      children={(field: any) => (
                        <SelectRole
                          value={field.state.value}
                          onChange={(val) => {
                            field.handleChange(val);
                            let defaultLevel = "user";
                            if (val === "admin") defaultLevel = "admin";
                            if (val === "partymember") defaultLevel = "member";
                            form.setFieldValue("roleLevel", defaultLevel);
                          }}
                        />
                      )}
                    />
                  </div>
                ) : null}
                <div
                  className={cn(
                    "flex flex-col gap-1.5",
                    isPartyLocked || !!defaultRole ? "col-span-2" : "",
                  )}
                >
                  <label className="text-[14px] text-c-50">Role Level</label>
                  <form.Field
                    name="roleLevel"
                    validators={{
                      onChange: ({ value }) =>
                        !value ? "Role level is required" : undefined,
                    }}
                    children={(field: any) => (
                      <SelectRoleLevel
                        role={role}
                        value={field.state.value}
                        onChange={(val) => field.handleChange(val)}
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
                    validators={{
                      onChange: ({ value }) =>
                        role === "partymember" && !value
                          ? "Party is required"
                          : undefined,
                    }}
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
                    validators={{
                      onChange: ({ value }) =>
                        !value ? "Email is required" : undefined,
                    }}
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
                    validators={{
                      onChange: ({ value }) =>
                        !value ? "Password is required" : undefined,
                    }}
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
          <DialogFooter>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="h-11 px-6 bg-[#00cf79] hover:bg-[#00b568] text-[16px] font-bold text-white rounded-xl cursor-pointer flex items-center gap-2"
            >
              {saveMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {mode === "update" ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
