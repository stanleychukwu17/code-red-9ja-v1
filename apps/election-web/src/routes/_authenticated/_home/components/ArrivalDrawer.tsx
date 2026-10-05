import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerHeader,
} from "@repo/ui/components/drawer";
import { TriangleAlert } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@repo/ui/components/button";
import { TitleText } from "@repo/ui/components/custom/Texts";

interface ArrivalDrawerProps {
  /** Controls visibility of the bottom drawer */
  isOpen: boolean;
  /** Callback fired when drawer open state toggles */
  onOpenChange: (open: boolean) => void;
  /** When true, displays warning alert reminding user they must be at the PU */
  showNoInfo: boolean;
  /** Triggered when user indicates they have not arrived yet */
  onNoClick: () => void;
  /** Triggered when user confirms physical arrival */
  onYesClick?: () => void;
  /** Callback to close drawer from dismissal prompt */
  onDismiss: () => void;
  /** Election date string used to compute arrival timeliness relative to 7:00 AM */
  electionDate?: string;
}

/**
 * Arrival Verification Bottom Drawer.
 *
 * Prompts the agent on election morning to confirm their physical arrival at
 * their assigned polling unit.
 *
 * Features:
 * - Computes live punctuality relative to standard 7:00 AM reporting time
 *   (e.g. "15 min early", "25 min late").
 * - If user confirms arrival ("Yes"), advances to geofence photo verification (`/arrival`).
 * - If user indicates they are not there ("No"), displays a presence advisory.
 */
export function ArrivalDrawer({
  isOpen,
  onOpenChange,
  showNoInfo,
  onNoClick,
  onYesClick,
  onDismiss,
  electionDate,
}: ArrivalDrawerProps) {
  const navigate = useNavigate();

  // Current clock time state updated every minute while drawer is open
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, [isOpen]);

  let latenessText = "You're on time";
  let isLate = false;

  // Calculate arrival punctuality compared against 7:00 AM cutoff
  if (electionDate) {
    const targetTime = new Date(electionDate);
    targetTime.setHours(7, 0, 0, 0); // 7:00 AM target time

    const diffMs = now.getTime() - targetTime.getTime();

    if (diffMs > 0) {
      // Arrived after 7:00 AM
      isLate = true;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 60) {
        latenessText = `You're ${diffMins} min late`;
      } else {
        const diffHours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;
        latenessText = `You're ${diffHours} hr ${remainingMins} min late`;
      }
    } else {
      // Arrived before 7:00 AM
      const diffMins = Math.floor(Math.abs(diffMs) / (1000 * 60));
      if (diffMins < 60) {
        latenessText = `You're ${diffMins} min early`;
      } else {
        const diffHours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;
        latenessText = `You're ${diffHours} hr ${remainingMins} min early`;
      }
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="px-5 pb-20 max-h-[85vh] space-y-2.5">
        <DrawerHeader className="px-0 pt-5 pb-2 relative">
          <TitleText
            className="text-left"
            text="Have you arrived at your polling unit?"
          />
        </DrawerHeader>

        {!showNoInfo ? (
          <>
            {/* Punctuality indicator header */}
            <div className="flex items-center justify-between text-[17px]">
              <span className="text-c-50">We need you there 7AM</span>
              {electionDate && (
                <span
                  className={`font-bold ${isLate ? "text-c-80" : "text-green-600"}`}
                >
                  {latenessText}
                </span>
              )}
            </div>

            {/* Arrival response options */}
            <div className="flex flex-col gap-3 mt-6">
              <Button
                type="button"
                variant="purple"
                size="4xl"
                className="bg-[#6D4AFF] hover:bg-[#5C3DE6]"
                onClick={onYesClick}
              >
                Yes
              </Button>
              <Button
                type="button"
                variant="grey"
                size="4xl"
                onClick={onNoClick}
              >
                No
              </Button>
            </div>
          </>
        ) : (
          /* Advisory warning displayed when user clicks 'No' */
          <div className="mt-4 px-1 flex flex-col gap-4">
            <div className="bg-[#FDF2D4] rounded-[16px] p-4 flex items-start gap-3">
              <TriangleAlert
                className="w-6 h-6 text-[#916719] shrink-0 mt-0.5"
                strokeWidth={2.5}
              />
              <span className="text-neutral-900 font-bold text-[15.5px] leading-relaxed">
                Please ensure you are at your polling unit. You must be
                physically present at the location before you can proceed.
              </span>
            </div>
            <button
              onClick={onDismiss}
              className="bg-[#F5F5F5] hover:bg-[#EAEAEA] text-neutral-800 font-bold text-[18px] py-4 rounded-[16px] text-center cursor-pointer transition w-full mt-2"
            >
              Dismiss
            </button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
