import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
} from "@repo/ui/components/drawer";
import { TriangleAlert } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { TitleText } from "@repo/ui/components/custom/Texts";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getNonVotingReasons } from "#/lib/server/elections";
import { StickyFooter } from "#/components/Footers";

/**
 * Reason category option for why a citizen did not or cannot vote.
 */
export interface NonVotingReason {
  id: number;
  reason: string;
}

interface NotVotingDrawerProps {
  /** Controls visibility of the bottom drawer */
  isOpen: boolean;
  /** Callback fired when drawer visibility changes */
  onOpenChange: (open: boolean) => void;
}

/**
 * Non-Voting Reason Questionnaire Drawer.
 *
 * Appears when a citizen indicates they did not vote:
 * - Step 1: Inquires whether they still intend to vote later today
 *   ("Yes" routes to `/vote`, "No" advances to Step 2).
 * - Step 2: Fetches and displays standardized non-voting reasons (e.g. security,
 *   PVC issues, distance, logistics), navigating to `/_authenticated/_home/not-voting-reason`
 *   to collect user commentary.
 */
export function NotVotingDrawer({
  isOpen,
  onOpenChange,
}: NotVotingDrawerProps) {
  const navigate = useNavigate();

  // Multi-step modal navigation (1: Intent check, 2: Reason selection)
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedReasonId, setSelectedReasonId] = useState<number | null>(null);

  // Fetch predefined reasons from backend when user reaches step 2
  const { data } = useQuery<{ reasons: NonVotingReason[] }>({
    queryKey: ["non-voting-reasons"],
    queryFn: async () => {
      const res = await getNonVotingReasons();
      return res?.data;
    },
    enabled: step === 2,
  });

  // User confirmed they do not intend to vote today
  const handleNoClick = () => {
    setStep(2);
  };

  // Navigates to the explanation submission route with the selected reason ID
  const handleContinue = () => {
    if (selectedReasonId !== null) {
      navigate({
        to: "/not-voting-reason",
        search: { reasonId: selectedReasonId },
      });
      onOpenChange(false);
    }
  };

  // Reset step to 1 when drawer closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTimeout(() => setStep(1), 300);
    }
    onOpenChange(open);
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className="pb-10 max-h-[85vh] space-y-2.5">
        <DrawerHeader className="pt-5 pb-2 relative">
          <TitleText
            className="text-left"
            text={
              step === 1
                ? "Do you plan on voting sometime today?"
                : "Why won't you be voting?"
            }
          />
        </DrawerHeader>

        {/* STEP 1: Intent check (Will you vote later?) */}
        {step === 1 ? (
          <div className="flex flex-col gap-4 mt-2 px-4">
            <Button
              type="button"
              variant="secondary"
              size="4xl"
              className="w-full"
              onClick={() =>
                navigate({
                  to: "/vote",
                })
              }
            >
              Yes
            </Button>
            <Button
              type="button"
              variant="deepGrey"
              size="4xl"
              className="w-full"
              onClick={handleNoClick}
            >
              No
            </Button>

            {/* Reminder note */}
            <div className="bg-[#FDF2D4] rounded-[16px] p-4 flex items-start gap-3 mt-4">
              <TriangleAlert
                className="w-5 h-5 text-[#916719] shrink-0 mt-0.5"
                strokeWidth={2.5}
              />
              <span className="text-[#3A2D16] font-medium text-[15.5px] leading-relaxed">
                If yes, we will ask you who you voted for again in the next 1
                hour.
              </span>
            </div>
          </div>
        ) : (
          /* STEP 2: Standardized reason selection list */
          <div className="flex flex-col flex-1 overflow-y-auto min-h-0">
            <div className="flex flex-col gap-4 mt-2 px-4">
              {data?.reasons?.map((r) => {
                const isSelected = selectedReasonId === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedReasonId(r.id)}
                    className={`text-left px-5 py-5 rounded-[12px] text-[17px] transition ${
                      isSelected
                        ? "bg-secondary/20 text-c-90"
                        : "bg-c-5 hover:bg-c-10 text-c-80"
                    }`}
                  >
                    {r.reason}
                  </button>
                );
              })}
            </div>

            {/* Sticky continue action button */}
            <StickyFooter className="pb-0">
              <Button
                type="button"
                variant="black"
                size="4xl"
                disabled={selectedReasonId === null}
                className="w-full"
                onClick={handleContinue}
              >
                Continue
              </Button>
            </StickyFooter>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
