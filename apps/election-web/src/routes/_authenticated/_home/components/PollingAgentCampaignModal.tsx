import * as React from "react";
import { useMediaQuery } from "usehooks-ts";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "@repo/ui/components/drawer";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogCloseButton,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { StickyFooter } from "#/components/Footers";
import { TitleText } from "@repo/ui/components/custom/Texts";

export interface CampaignParty {
  id: number;
  name: string;
  short_name: string;
  logo?: string;
  is_verified?: boolean;
  is_accepting_applications?: boolean;
}

interface PollingAgentCampaignModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  party: CampaignParty | null;
  onApply: () => void;
}

const AGENT_ILLUSTRATION_URL =
  "https://res.cloudinary.com/dhtcwqsx4/image/upload/v1782886473/Free9ja/Boss_Agent_wqnxcf.png";

/**
 * Determines whether to use "a" or "an" before an acronym
 * based on vowel sounds of English letter names (A, E, F, H, I, L, M, N, O, R, S, X).
 */
function getIndefiniteArticle(acronym?: string): string {
  if (!acronym) return "a";
  const firstLetter = acronym.trim().charAt(0).toUpperCase();
  const vowelSoundLetters = [
    "A",
    "E",
    "F",
    "H",
    "I",
    "L",
    "M",
    "N",
    "O",
    "R",
    "S",
    "X",
  ];
  return vowelSoundLetters.includes(firstLetter) ? "an" : "a";
}

export function PollingAgentCampaignModal({
  isOpen,
  onOpenChange,
  party,
  onApply,
}: PollingAgentCampaignModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const partyName = party?.short_name || "Political Party";
  const article = getIndefiniteArticle(party?.short_name);

  const ModalBody = (
    <div className="flex flex-col flex-1 px-5 pt-1 pb-6 w-full max-w-md mx-auto">
      {/* Top bar with Close button */}
      <div className="flex items-center justify-end w-full pt-1 pb-2">
        <DialogCloseButton onClick={() => onOpenChange(false)} />
      </div>

      {/* Main Headline */}
      <div className="text-left mt-1 mb-2">
        <TitleText
          text={
            <>
              Make <span className="text-purple">50k to 500k</span> on Election
              Day as {article} {partyName} Polling Unit Agent
            </>
          }
          size="lg"
          className="text-c-90"
        />
        {/* <h2 className="text-[26px] md:text-[28px] font-extrabold text-neutral-900 tracking-tight leading-[1.2]"></h2> */}
      </div>

      {/* Hero Illustration */}
      <div className="flex-1 flex items-center justify-center py-4 my-auto select-none">
        <img
          src={AGENT_ILLUSTRATION_URL}
          alt="Polling Agent Illustration"
          className="w-full h-full"
        />
      </div>

      {/* Apply CTA Button */}
      <StickyFooter className="md:pb-0 px-0">
        <Button type="button" variant="purple" size="4xl" onClick={onApply}>
          Apply Now
        </Button>
      </StickyFooter>
    </div>
  );

  // Fallback to desktop on initial SSR to avoid hydration mismatch
  const showDesktop = mounted && isDesktop;

  if (showDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[440px] rounded-[32px] p-2 overflow-hidden border-none bg-white shadow-2xl"
        >
          <DialogTitle className="sr-only">
            Apply as {partyName} Polling Unit Agent
          </DialogTitle>
          <DialogDescription className="sr-only">
            Make 50k to 500k on Election Day as {article} {partyName} Polling
            Unit Agent
          </DialogDescription>
          {ModalBody}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onOpenChange}
      shouldScaleBackground={false}
    >
      <DrawerContent className="rounded-t-[32px] border-t-0 bg-white focus:outline-none h-[92vh]">
        <DrawerTitle className="sr-only">
          Apply as {partyName} Polling Unit Agent
        </DrawerTitle>
        <DrawerDescription className="sr-only">
          Make 50k to 500k on Election Day as {article} {partyName} Polling Unit
          Agent
        </DrawerDescription>
        {ModalBody}
      </DrawerContent>
    </Drawer>
  );
}
