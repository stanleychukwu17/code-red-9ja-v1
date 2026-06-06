import * as React from "react";
import { CreateStateDialog } from "./CreateStateDialog";
import { NewDistrictDialog } from "./NewDistrictDialog";
import { CreateLgaDialog } from "./CreateLgaDialog";
import { NewStateConstituencyDialog } from "./NewStateConstituencyDialog";
import { NewFederalConstituencyDialog } from "./NewFederalConstituencyDialog";
import { NewWardDialog } from "./NewWardDialog";
import { NewPollingUnitDialog } from "./NewPollingUnitDialog";

export function useBodiesDialogs() {
  const [activeDialog, setActiveDialog] = React.useState<
    "state" | "district" | "lga" | "fed-const" | "state-const" | "ward" | "pu" | null
  >(null);

  const closeDialog = React.useCallback(() => setActiveDialog(null), []);

  const dialogProps = React.useMemo(() => ({
    onAddState: () => setActiveDialog("state"),
    onAddDistrict: () => setActiveDialog("district"),
    onAddLga: () => setActiveDialog("lga"),
    onAddFederalConstituency: () => setActiveDialog("fed-const"),
    onAddStateConstituency: () => setActiveDialog("state-const"),
    onAddWard: () => setActiveDialog("ward"),
    onAddPollingUnit: () => setActiveDialog("pu"),
  }), []);

  const renderDialogs = React.useCallback(() => (
    <>
      <CreateStateDialog open={activeDialog === "state"} onClose={closeDialog} />
      <NewDistrictDialog open={activeDialog === "district"} onClose={closeDialog} />
      <CreateLgaDialog open={activeDialog === "lga"} onClose={closeDialog} />
      <NewStateConstituencyDialog open={activeDialog === "state-const"} onClose={closeDialog} />
      <NewFederalConstituencyDialog open={activeDialog === "fed-const"} onClose={closeDialog} />
      <NewWardDialog open={activeDialog === "ward"} onClose={closeDialog} />
      <NewPollingUnitDialog open={activeDialog === "pu"} onClose={closeDialog} />
    </>
  ), [activeDialog, closeDialog]);

  return { dialogProps, renderDialogs };
}
