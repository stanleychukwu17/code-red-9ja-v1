import * as React from "react";
import { PollingAgentApplicationDialog } from "./polling-agent-application-dialog";

export type ApplicationData = {
  id?: number;
  name: string;
  avatar: string;
  location: string;
  election: string;
  voterId?: string;
  phone?: string;
  callingPhone?: string;
  whatsappPhone?: string;
  dataPhone?: string;
  schoolName?: string;
  degree?: string;
  graduationYear?: string;
  educationalStatus?: string;
  address?: string;
  wardName?: string;
  wardId?: number;
  pollingUnitId?: number;
  electionGroupId?: number;
  partyId?: number;
  stateId?: number;
  lgaId?: number;
  partyLogo?: string;
  partyShortName?: string;
  voters_card_image?: any;
  onApprove?: (data: { role: string; pollingUnitId?: number; stateId?: number; lgaId?: number; wardId?: number }) => Promise<void>;
  onReject?: (reason: string) => Promise<void>;
};

type PollingAgentContextType = {
  openApplication: (app: ApplicationData) => void;
};

const PollingAgentContext = React.createContext<PollingAgentContextType | null>(
  null,
);

export function usePollingAgentDialog() {
  const ctx = React.useContext(PollingAgentContext);
  if (!ctx) {
    throw new Error(
      "usePollingAgentDialog must be used within PollingAgentDialogProvider",
    );
  }
  return ctx;
}

export function PollingAgentDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeApp, setActiveApp] = React.useState<ApplicationData | null>(
    null,
  );

  return (
    <PollingAgentContext.Provider value={{ openApplication: setActiveApp }}>
      {children}
      {activeApp && (
        <PollingAgentApplicationDialog
          open={!!activeApp}
          onClose={() => setActiveApp(null)}
          application={activeApp}
        />
      )}
    </PollingAgentContext.Provider>
  );
}
