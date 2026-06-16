import React, { createContext, useContext } from "react";

export interface PartyDetails {
  shortName: string;
  name: string;
}

export interface UserDetails {
  fake_id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url?: string;
  account_status: string;
  party?: {
    id?: number;
    short_name?: string;
    name?: string;
    logo?: string;
    created_at?: string;
    updated_at?: string;
  };
}

interface PartyContextType {
  user: UserDetails | null;
  party: PartyDetails | null;
}

const PartyContext = createContext<PartyContextType | undefined>(undefined);

export const PartyProvider: React.FC<{
  user: any;
  children: React.ReactNode;
}> = ({ user, children }) => {
  const party = user?.party?.short_name
    ? { shortName: user.party.short_name, name: user.party.name || "" }
    : null;

  return (
    <PartyContext.Provider value={{ user, party }}>
      {children}
    </PartyContext.Provider>
  );
};

export const useParty = () => {
  const context = useContext(PartyContext);
  if (context === undefined) {
    throw new Error("useParty must be used within a PartyProvider");
  }
  return context;
};

export const useAuth = () => {
  const context = useContext(PartyContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a PartyProvider");
  }
  if (!context.user || !context.party) {
    throw new Error("useAuth can only be used by authenticated users with a valid party");
  }
  return {
    user: context.user as UserDetails & { party: NonNullable<UserDetails["party"]> },
    party: context.party as PartyDetails,
  };
};
