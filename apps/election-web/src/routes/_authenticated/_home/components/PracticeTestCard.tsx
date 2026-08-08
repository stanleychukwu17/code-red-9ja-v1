import { Button } from "@repo/ui/components/button";
import { TitleText } from "@repo/ui/components/custom/Texts";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import { useNavigate } from "@tanstack/react-router";

export function PracticeTestCard() {
  const navigate = useNavigate();

  return (
    <div className="bg-c-5 rounded-[20px] p-4 flex flex-col gap-3 border border-c-10/50">
      <div className="flex items-center justify-between text-c-50 text-[13px] font-medium">
        <div className="flex items-center gap-1.5">
          <FancyMoneyBagIcon className="size-5" />
          <span>Better Payout</span>
        </div>
        <span className="text-black font-extrabold text-[15px]">
          Come Election Day
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <TitleText text="Take Election Day Practice Test 1" size="md" />
        <p className="text-c-80 text-[15px] font-medium leading-snug">
          This helps you know the things you must do come election day.
        </p>
      </div>

      <Button
        onClick={() => navigate({ to: "/practice" })}
        className="w-full rounded-[16px] h-[52px] text-[17px] font-bold mt-1"
        variant="black"
      >
        Take test
      </Button>
    </div>
  );
}
