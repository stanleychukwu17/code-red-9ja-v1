import { UserFormDialog as SharedUserFormDialog, type UserFormDialogProps, type UserResult, } from "@repo/ui/components/custom/UserFormDialog";
import { getAllCountries, getCities } from "#/lib/server/countries";
import { getStates } from "#/lib/server/states";
import { getParties, getPresignedUploadURL, confirmFileUpload, } from "#/lib/server/parties";
import { registerCandidate } from "#/lib/server/auth/auth";
import { updateUser, getUserPhoneNumbers, deleteUserPhoneNumber } from "#/lib/server/users";

export type { UserResult };

export function UserFormDialog(
  props: Omit<
    UserFormDialogProps, | "getAllCountries" | "getStates" | "getCities" | "getParties" | "getPresignedUploadURL"
    | "confirmFileUpload" | "registerCandidate" | "updateUser" | "updateUserMoreInfo" | "updateUserPhoneNumbers" | "deleteUserPhoneNumber" | "loadUserPhoneNumber" | "getOccupations"
  >
) {
  return (
    <SharedUserFormDialog
      {...props}
      getAllCountries={getAllCountries}
      getStates={getStates}
      getCities={getCities}
      getParties={getParties}
      getPresignedUploadURL={getPresignedUploadURL}
      confirmFileUpload={confirmFileUpload}
      registerCandidate={registerCandidate}
      updateUser={updateUser}
      loadUserPhoneNumber={getUserPhoneNumbers}
      deleteUserPhoneNumber={deleteUserPhoneNumber}
    // updateUserMoreInfo={...} // TODO: implement and pass this API
    // updateUserPhoneNumbers={...} // TODO: implement and pass this API
    // getOccupations={...} // TODO: implement and pass this API
    />
  );
}
