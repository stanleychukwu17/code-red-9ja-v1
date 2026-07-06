import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { getParty } from "#/lib/server/parties";

export interface PartyDetails {
  id?: number;
  shortName: string;
  name: string;
  logo?: string;
  slots?: number;
  allowanceBalanceKobo?: number;
  stateAllowances?: Record<string, number>;
}

export interface BackendParty {
  id: number;
  short_name: string;
  name: string;
  logo?: string;
  slots?: number;
  allowance_balance_kobo?: number;
  state_allowances?: Record<string, number>;
  created_at?: string;
  updated_at?: string;
}

export interface GetPartyResponse {
  success: boolean;
  message: string;
  data?: {
    party: BackendParty;
  };
}

export interface UserDetails {
  fake_id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url?: string;
  account_status: string;
  party_id?: number;
  party?: {
    id?: number;
    short_name?: string;
    name?: string;
    logo?: string;
    slots?: number;
    allowance_balance_kobo?: number;
    state_allowances?: Record<string, number>;
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
  user: UserDetails | null;
  children: React.ReactNode;
}> = ({ user, children }) => {
  const partyId = user?.party?.id ?? user?.party_id;
  console.log("AUTH USER", user);

  const { data: fetchedParty } = useQuery<BackendParty | null, Error>({
    queryKey: ["party", partyId],
    queryFn: async () => {
      if (!partyId) return null;
      const res = (await getParty({ data: partyId })) as GetPartyResponse;
      if (res && res.success && res.data?.party) {
        return res.data.party;
      }
      throw new Error(res?.message || "Failed to fetch party details");
    },
    enabled: !!partyId,
  });

  const party = fetchedParty
    ? {
        id: fetchedParty.id,
        shortName: fetchedParty.short_name,
        name: fetchedParty.name || "",
        logo: fetchedParty.logo,
        slots: fetchedParty.slots || 0,
        allowanceBalanceKobo: fetchedParty.allowance_balance_kobo || 0,
        stateAllowances: fetchedParty.state_allowances || {},
      }
    : user?.party?.short_name
      ? {
          id: user.party.id ?? user.party_id,
          shortName: user.party.short_name,
          name: user.party.name || "",
          logo: user.party.logo,
          slots: user.party.slots || 0,
          allowanceBalanceKobo: user.party.allowance_balance_kobo || 0,
          stateAllowances: user.party.state_allowances || {},
        }
      : user?.party_id
        ? {
            id: user.party_id,
            shortName: "",
            name: "",
            slots: 0,
            allowanceBalanceKobo: 0,
            stateAllowances: {},
          }
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
    throw new Error("useParty must be used within a PartyProvider");
  }
  return {
    user: context.user,
    party: context.party || {
      id: undefined,
      shortName: "",
      name: "",
      logo: undefined,
    },
  };
};
