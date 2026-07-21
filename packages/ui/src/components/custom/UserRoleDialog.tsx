import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { Button } from "../button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "../dialog";

import { SelectParty } from "../selects/party-select";
import { SelectRole } from "../selects/role-select";

export interface UserRoleDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user: any;
  updateUserRole?: (args: { data: any }) => Promise<any>;
  fetchParties?: () => Promise<any>;
  fetchUserRoles?: (args: {
    data: { user_id: number | string };
  }) => Promise<any>;
}
export function UserRoleDialog({
  open,
  onClose,
  onSuccess,
  user,
  updateUserRole,
  fetchParties,
  fetchUserRoles,
}: UserRoleDialogProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [partyId, setPartyId] = React.useState<number | undefined>(undefined);

  const form = useForm({
    defaultValues: {
      roles: ["user"] as string[],
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate({ ...value, party_id: partyId });
    },
  });

  const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["userRoles", user?.fake_id || user?.id],
    queryFn: async () => {
      if (!fetchUserRoles || (!user?.fake_id && !user?.id)) return null;
      return fetchUserRoles({ data: { user_id: user.fake_id || user.id } });
    },
    enabled: !!open && !!user && !!fetchUserRoles,
  });
  console.log({ rolesData });

  React.useEffect(() => {
    if (open && user) {
      if (rolesData?.success && rolesData.data) {
        form.setFieldValue(
          "roles",
          rolesData.data.roles?.length ? rolesData.data.roles : ["user"],
        );
        setPartyId(rolesData.data.party_id || undefined);
      } else if (!fetchUserRoles && !isLoadingRoles) {
        const initialRoles =
          Array.isArray(user.roles) && user.roles.length > 0
            ? user.roles
            : [user.role || "user"];
        form.setFieldValue("roles", initialRoles);
        setPartyId(user.party_id || undefined);
      }
      setError(null);
    }
  }, [open, user, rolesData, isLoadingRoles, fetchUserRoles]);

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!values.roles || values.roles.length === 0)
        throw new Error("At least one role is required");

      if (!updateUserRole) {
        // Placeholder if no API function provided yet
        return { success: true, data: values };
      }

      const res = await updateUserRole({
        data: {
          user_id: user.id || user.fake_id,
          user_fake_id: user.fake_id || user.id,
          roles: values.roles,
          party_id: values.roles.includes("party_admin") || values.roles.includes("super_party_admin")
            ? values.party_id
            : undefined,
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
          {isLoadingRoles ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <Loader2 className="size-6 text-c-50 animate-spin" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0">
              <DialogPadding className="space-y-6 pb-6 pt-4">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  <form.Field
                    name="roles"
                    validators={{
                      onChange: ({ value }) =>
                        !value || value.length === 0
                          ? "At least one role is required"
                          : undefined,
                    }}
                    children={(field: any) => (
                      <div className="flex flex-col gap-3">
                        <label className="text-[14px] text-c-50">Roles</label>
                        {field.state.value.map(
                          (role: string, index: number) => (
                            <div
                              key={index}
                              className="flex items-center gap-2"
                            >
                              <div className="flex-1">
                                <SelectRole
                                  selectedId={role}
                                  update={(val) => {
                                    const newRoles = [...field.state.value];
                                    newRoles[index] = val;
                                    field.handleChange(newRoles);
                                  }}
                                />
                              </div>
                              {(role === "party_admin" || role === "super_party_admin") && (
                                <SelectParty
                                  selectedId={
                                    partyId ? String(partyId) : undefined
                                  }
                                  update={(party) => setPartyId(party?.id)}
                                  className="max-w-[160px]"
                                  fetchParties={
                                    fetchParties ||
                                    (async () => ({
                                      success: true,
                                      data: { parties: [] },
                                    }))
                                  }
                                />
                              )}
                              <button
                                type="button"
                                disabled={field.state.value.length === 1}
                                onClick={() => {
                                  const newRoles = [...field.state.value];
                                  newRoles.splice(index, 1);
                                  field.handleChange(newRoles);
                                }}
                                className="h-12 px-6 text-red-500 hover:bg-red-50 rounded-xl text-sm transition font-medium cursor-pointer disabled:pointer-events-none disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </div>
                          ),
                        )}
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
          )}
          <DialogFooter>
            <Button
              type="submit"
              variant="secondary"
              size="2xl"
              disabled={saveMutation.isPending}
              // className="h-11 px-6 bg-[#00cf79] hover:bg-[#00b568] text-[16px] font-bold text-white rounded-xl cursor-pointer flex items-center gap-2"
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
