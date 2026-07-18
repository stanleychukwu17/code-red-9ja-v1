import {
  UserRoleDialog as SharedUserRoleDialog,
  type UserRoleDialogProps,
} from "@repo/ui/components/custom/UserRoleDialog";
// import { updateUserRole } from "#/lib/server/users";

export function UserRoleDialog(
  props: Omit<UserRoleDialogProps, "updateUserRole">
) {
  return (
    <SharedUserRoleDialog
      {...props}
    // updateUserRole={updateUserRole} // TODO: Implement and pass this once the backend endpoint is ready
    />
  );
}
