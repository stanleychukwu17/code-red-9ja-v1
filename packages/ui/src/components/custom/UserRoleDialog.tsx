import * as React from "react";
import { Button } from "../button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogPadding } from "../dialog";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, Loader2 } from "lucide-react";
import { SelectResponsiveWrapper } from "../selects/select-responsive-wrapper";
import { GeneralCommand } from "../command/general-command";
import { TinyError } from "./TinyError";

const ROLE_OPTIONS = [
  { label: "Admin", value: "admin" },
  { label: "Party Admin", value: "partyadmin" },
  { label: "User", value: "user" },
];



export interface SelectRoleProps {
  value: string;
  onChange: (val: "admin" | "partyadmin" | "user") => void;
}
/**
 * Renders a dropdown to select a user's primary role.
 * Depending on the role chosen, the available role levels (SelectRoleLevel) will change.
 */
export function SelectRole({ value, onChange }: SelectRoleProps) {
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



export interface UserRoleDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user: any;
  updateUserRole?: (args: { data: any }) => Promise<any>;
}
export function UserRoleDialog({ open, onClose, onSuccess, user, updateUserRole }: UserRoleDialogProps) {
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      roles: ["user"] as string[],
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  React.useEffect(() => {
    if (open && user) {
      const initialRoles = Array.isArray(user.roles) 
        ? user.roles 
        : [user.role || "user"];
      form.setFieldValue("roles", initialRoles);
      setError(null);
    }
  }, [open, user]);

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!values.roles || values.roles.length === 0) throw new Error("At least one role is required");

      if (!updateUserRole) {
        // Placeholder if no API function provided yet
        return { success: true, data: values };
      }

      const res = await updateUserRole({
        data: {
          id: user.fake_id || user.id,
          roles: values.roles,
        },
      });

      if (!res?.success) {
        throw new Error(res?.message || "Failed to update user role");
      }
      return res.data;
    },
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px] p-0 rounded-2xl border-none shadow-2xl bg-white flex flex-col">
        <DialogHeader title={`Edit Roles for ${user?.first_name || "User"}`} />

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
              <TinyError error={error} />

              <div className="flex flex-col gap-4">
                  <form.Field
                    name="roles"
                    validators={{
                      onChange: ({ value }) =>
                        !value || value.length === 0 ? "At least one role is required" : undefined,
                    }}
                    children={(field: any) => (
                      <div className="flex flex-col gap-3">
                        <label className="text-[14px] text-c-50">Roles</label>
                        {field.state.value.map((role: string, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="flex-1">
                              <SelectRole
                                value={role}
                                onChange={(val) => {
                                  const newRoles = [...field.state.value];
                                  newRoles[index] = val;
                                  field.handleChange(newRoles);
                                }}
                              />
                            </div>
                            {field.state.value.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newRoles = [...field.state.value];
                                  newRoles.splice(index, 1);
                                  field.handleChange(newRoles);
                                }}
                                className="h-10 px-3 text-red-500 hover:bg-red-50 rounded-lg text-sm transition font-medium"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            field.handleChange([...field.state.value, "user"]);
                          }}
                          className="text-[#00cf79] font-medium text-[14px] text-left hover:underline w-fit mt-1"
                        >
                          + Add more roles
                        </button>
                      </div>
                    )}
                  />
                </div>
            </DialogPadding>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="h-11 px-6 bg-success hover:bg-success-hover text-[16px] font-bold text-white rounded-xl cursor-pointer flex items-center gap-2"
            >
              {saveMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Save Roles
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
