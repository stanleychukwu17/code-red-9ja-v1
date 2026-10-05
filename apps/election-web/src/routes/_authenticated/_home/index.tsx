import { useState, useMemo, useEffect } from "react";
import { useAppContext } from "#/hooks/useAppContext";
import { useElectionRealtime } from "@repo/ui/hooks/useElectionRealtime";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getParties } from "#/lib/server/parties";
import { GeneralPage } from "./page-components/GeneralPage";
import { LGAElectionSupervisorPage } from "./page-components/LGAElectionSupervisorPage";
import { PollingAgentPage } from "./page-components/PollingAgentPage";
import { StateElectionSupervisorPage } from "./page-components/StateElectionSupervisorPage";
import { WardElectionSupervisorPage } from "./page-components/WardElectionSupervisorPage";
import { PollingAgentCampaignModal } from "./components/PollingAgentCampaignModal";
import { AuthModal } from "#/components/modals/AuthModal";

export interface HomeSearch {
  campaign?: string;
  party?: string;
  partyId?: number;
  authRequired?: boolean;
  redirect?: string;
}

export const Route = createFileRoute("/_authenticated/_home/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch => {
    return {
      campaign: typeof search.campaign === "string" ? search.campaign : undefined,
      party: typeof search.party === "string" ? search.party : undefined,
      partyId: search.partyId ? Number(search.partyId) : undefined,
      authRequired: search.authRequired === true || search.authRequired === "true",
      redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user, selectedElection, selectedSupervisorAssignment, selectedAssignment } =
    useAppContext();

  const [modalDismissed, setModalDismissed] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRedirectUrl, setAuthRedirectUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (search.authRequired) {
      setAuthRedirectUrl(search.redirect);
      setAuthModalOpen(true);
    }
  }, [search.authRequired, search.redirect]);

  // Fetch available parties to validate campaign party
  const { data: parties = [] } = useQuery({
    queryKey: ["parties"],
    queryFn: async () => {
      const res = await getParties();
      return res?.success && res.data?.parties && res.data.parties.length > 0
        ? res.data.parties
        : [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Match party by partyId or short_name (case-insensitive)
  const matchedParty = useMemo(() => {
    if (!search.party && !search.partyId) return null;
    return (
      parties.find((p: any) => {
        if (search.partyId && Number(p.id) === Number(search.partyId)) return true;
        if (
          search.party &&
          p.short_name &&
          p.short_name.trim().toLowerCase() === search.party.trim().toLowerCase()
        ) {
          return true;
        }
        return false;
      }) || null
    );
  }, [parties, search.party, search.partyId]);

  // The modal should only display if:
  // 1) The user arrived via campaign query params or party query param
  // 2) The party exists, is verified (onboarded), and actively accepting applications
  // 3) Modal hasn't been dismissed in this view
  const isPartyEligible = Boolean(
    matchedParty &&
      matchedParty.is_verified &&
      matchedParty.is_accepting_applications,
  );

  const isCampaignTriggered = Boolean(
    search.campaign === "polling-agent" ||
      search.campaign === "agent" ||
      search.party ||
      search.partyId,
  );

  const isModalOpen = !modalDismissed && isCampaignTriggered && isPartyEligible;

  const handleModalClose = () => {
    setModalDismissed(true);
    // Clean up campaign query parameters from URL so modal doesn't re-trigger
    navigate({
      to: "/",
      search: (prev: any) => {
        const { campaign, party, partyId, ...rest } = prev || {};
        return rest;
      },
      replace: true,
    });
  };

  const handleAuthModalClose = () => {
    setAuthModalOpen(false);
    if (search.authRequired) {
      navigate({
        to: "/",
        search: (prev: any) => {
          const { authRequired, redirect, ...rest } = prev || {};
          return rest;
        },
        replace: true,
      });
    }
  };

  const handleApply = () => {
    setModalDismissed(true);
    const targetUrl = matchedParty
      ? `/applications/apply?partyId=${matchedParty.id}&party=${matchedParty.short_name}`
      : `/applications/apply`;

    // If user is not authenticated, prompt AuthModal with target application URL
    if (!user) {
      setAuthRedirectUrl(targetUrl);
      setAuthModalOpen(true);
      return;
    }

    if (matchedParty) {
      navigate({
        to: "/applications/apply",
        search: {
          partyId: matchedParty.id,
          party: matchedParty.short_name,
        },
      });
    } else {
      navigate({
        to: "/applications/apply",
        search: {},
      });
    }
  };

  // Connect real-time WebSocket updates for election supervisor & voter dashboard
  useElectionRealtime({
    electionId: selectedElection?.id,
    stateId:
      selectedSupervisorAssignment?.data?.state_id ??
      selectedAssignment?.state_id,
    lgaId:
      selectedSupervisorAssignment?.data?.lga_id ?? selectedAssignment?.lga_id,
    wardId:
      selectedSupervisorAssignment?.data?.ward_id ??
      selectedAssignment?.ward_id,
    pollingUnitId: selectedAssignment?.polling_unit_id,
    clientConfig: {
      key: import.meta.env.VITE_PUSHER_KEY,
      cluster: import.meta.env.VITE_PUSHER_CLUSTER || "eu",
    },
  });

  let content = <GeneralPage />;

  if (selectedSupervisorAssignment) {
    if (selectedSupervisorAssignment.type === "state") {
      content = <StateElectionSupervisorPage />;
    } else if (selectedSupervisorAssignment.type === "lga") {
      content = <LGAElectionSupervisorPage />;
    } else if (selectedSupervisorAssignment.type === "ward") {
      content = <WardElectionSupervisorPage />;
    }
  } else if (selectedAssignment) {
    content = <PollingAgentPage />;
  }

  return (
    <>
      {content}
      <PollingAgentCampaignModal
        isOpen={isModalOpen}
        onOpenChange={(open) => {
          if (!open) handleModalClose();
        }}
        party={matchedParty}
        onApply={handleApply}
      />
      <AuthModal
        isOpen={authModalOpen}
        onOpenChange={(open) => {
          if (!open) handleAuthModalClose();
        }}
        redirectUrl={authRedirectUrl}
      />
    </>
  );
}

