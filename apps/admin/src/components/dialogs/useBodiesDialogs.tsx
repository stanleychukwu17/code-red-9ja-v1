import * as React from "react";
import { StateFormDialog } from "./StateFormDialog";
import { SenatorialDistrictFormDialog } from "./SenatorialDistrictFormDialog";
import { LgaFormDialog } from "./LgaFormDialog";
import { StateConstituencyFormDialog } from "./StateConstituencyFormDialog";
import { FederalConstituencyFormDialog } from "./FederalConstituencyFormDialog";
import { WardFormDialog } from "./WardFormDialog";
import { PollingUnitFormDialog } from "./PollingUnitFormDialog";

export function useBodiesDialogs() {
  const [activeDialog, setActiveDialog] = React.useState<
    | "state"
    | "district"
    | "lga"
    | "fed-const"
    | "state-const"
    | "ward"
    | "pu"
    | null
  >(null);

  const closeDialog = React.useCallback(() => setActiveDialog(null), []);

  const dialogProps = React.useMemo(
    () => ({
      onAddState: () => setActiveDialog("state"),
      onAddDistrict: () => setActiveDialog("district"),
      onAddLga: () => setActiveDialog("lga"),
      onAddFederalConstituency: () => setActiveDialog("fed-const"),
      onAddStateConstituency: () => setActiveDialog("state-const"),
      onAddWard: () => setActiveDialog("ward"),
      onAddPollingUnit: () => setActiveDialog("pu"),
    }),
    [],
  );

  const renderDialogs = React.useCallback(
    () => (
      <>
        <StateFormDialog
          open={activeDialog === "state"}
          onClose={closeDialog}
        />
        <SenatorialDistrictFormDialog
          open={activeDialog === "district"}
          onClose={closeDialog}
        />
        <LgaFormDialog open={activeDialog === "lga"} onClose={closeDialog} />
        <StateConstituencyFormDialog
          open={activeDialog === "state-const"}
          onClose={closeDialog}
        />
        <FederalConstituencyFormDialog
          open={activeDialog === "fed-const"}
          onClose={closeDialog}
        />
        <WardFormDialog open={activeDialog === "ward"} onClose={closeDialog} />
        <PollingUnitFormDialog
          open={activeDialog === "pu"}
          onClose={closeDialog}
        />
      </>
    ),
    [activeDialog, closeDialog],
  );

  return { dialogProps, renderDialogs };
}
