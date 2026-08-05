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

export interface NonVotingReason {
  id: number;
  reason: string;
}

interface NotVotingDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotVotingDrawer({
  isOpen,
  onOpenChange,
}: NotVotingDrawerProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedReasonId, setSelectedReasonId] = useState<number | null>(null);

  const { data } = useQuery<{ reasons: NonVotingReason[] }>({
    queryKey: ["non-voting-reasons"],
    queryFn: async () => {
      const res = await getNonVotingReasons();
      return res?.data;
    },
    enabled: step === 2,
  });

  const handleNoClick = () => {
    setStep(2);
  };

  const handleContinue = () => {
    if (selectedReasonId !== null) {
      navigate({
        to: "/home/not-voting-reason",
        search: { reasonId: selectedReasonId },
      });
      onOpenChange(false);
    }
  };

  // Reset step when drawer closes
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
