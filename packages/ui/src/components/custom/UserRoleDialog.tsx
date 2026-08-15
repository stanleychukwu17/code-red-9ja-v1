import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "../button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "../dialog";
import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { TinyError } from "./TinyError";
import { SelectParty } from "../selects/party-select";
import { SelectRole } from "../selects/role-select";

export interface UserRoleDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user: any;
  updateUserRole?: (args: { data: any }) => Promise<any>;
  fetchParties?: () => Promise<any>;
}
export function UserRoleDialog({
  open,
  onClose,
  onSuccess,
  user,
  updateUserRole,
  fetchParties,
}: UserRoleDialogProps) {
  // get the query client to update the cache
  const queryClient = useQueryClient();

  // Local state for managing form submission errors and selected party ID (if applicable)
  const [error, setError] = React.useState<string | null>(null);
  const [partyId, setPartyId] = React.useState<number | undefined>(undefined);

  // Initialize the form with a default role of "user"
  const form = useForm({
    defaultValues: {
      roles: ["user"] as string[],
    },
    onSubmit: async ({ value }) => {
      // Trigger the mutation to save the roles and associated party ID
      saveMutation.mutate({ ...value, party_id: partyId });
    },
  });

  // Synchronize form values with initial user data
  React.useEffect(() => {
    if (open && user) {
      const initialRoles = user.roles?.roles_code || [];

      // update the fields
      form.setFieldValue("roles", initialRoles);
      setError(null);
    }

    // updates the user partyId
    if (user?.party_id) {
      setPartyId(user.party_id);
    }
  }, [open, user]);

  // Mutation to handle updating the user's role and associated data on the backend
  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!updateUserRole) {
        // Return a placeholder success response if no API function is provided yet
        return { success: true, data: values };
      }

      // update the selectedRoles, if [], means removing the user from all roles
      const selectedRoles = values.roles || [];

      // Call the API to update the user roles
      const res = await updateUserRole({
        data: {
          user_fid: user.fake_id,
          roles: selectedRoles,
          // Only send party_id if the selected roles require it (party admin roles)
          party_id:
            selectedRoles.includes("party_admin") ||
            selectedRoles.includes("super_party_admin")
              ? values.party_id
              : undefined,
        },
      });

      if (!res?.success) {
        throw new Error(res?.message || "Failed to update user role");
      }
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("User role updated successfully");

      // the updated user details
      const updatedDetails = data?.userDetails;

      // if valid user details, we update the user cache in tanstack-query
      if (updatedDetails) {
        queryClient.setQueriesData(
          { queryKey: ["users-list"] },
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => {
                return {
                  ...page,
                  data: {
                    ...page.data,
                    users:
                      page.data?.users?.map((u: any) =>
                        u.fake_id === updatedDetails.fake_id
                          ? updatedDetails
                          : u,
                      ) || [],
                  },
                };
              }),
            };
          },
        );
      }

      // Trigger success callback
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      // Display error message to the user if the mutation fails
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px] p-0 rounded-2xl border-none shadow-2xl flex flex-col">
        <DialogHeader title={`Edit Roles for ${user?.first_name || "User"}`} />

        {/* Main form container handling submission and flex layout */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col flex-1 overflow-hidden"
        >
          {/* Scrollable content area for the form fields */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <DialogPadding className="space-y-6 pb-6 pt-4">
              <TinyError error={error} />

              <div className="flex flex-col gap-4">
                {/* Form field for managing the dynamic array of roles */}
                <form.Field
                  name="roles"
                  children={(field: any) => (
                    <div className="flex flex-col gap-3">
                      <label className="text-[14px] text-c-50">Roles</label>
                      {/* Render a row for each assigned role */}
                      {field.state.value.map((role: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="flex-1">
                            {/* Dropdown to select the specific role */}
                            <SelectRole
                              selectedId={role}
                              update={(val) => {
                                if (
                                  field.state.value.includes(val) &&
                                  field.state.value[index] !== val
                                ) {
                                  return; // Prevent adding duplicate roles
                                }
                                const newRoles = [...field.state.value];
                                newRoles[index] = val;
                                field.handleChange(newRoles);
                              }}
                            />
                          </div>
                          {/* Conditionally render Party selector for admin roles */}
                          {(role === "party_admin" ||
                            role === "super_party_admin") && (
                            <SelectParty
                              selectedId={partyId ? String(partyId) : undefined}
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
                          {/* Button to remove a role row, disabled if only one role is left */}
                          <button
                            type="button"
                            // disabled={field.state.value.length === 1}
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
                      ))}
                      {/* Button to append a new default role to the array */}
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
            {/* Submit button displaying a loading spinner during mutation */}
            <Button
              type="submit"
              variant="secondary"
              size="2xl"
              disabled={saveMutation.isPending}
              // className="h-11 px-6 bg-[#00cf79] hover:bg-[#00b568] text-[16px] font-bold text-white rounded-xl cursor-pointer flex items-center gap-2"
              className="text-white"
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
