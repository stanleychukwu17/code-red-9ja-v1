import { Button } from "@repo/ui/components/button";
import { TitleText } from "@repo/ui/components/custom/Texts";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import { useNavigate } from "@tanstack/react-router";
import { GreyCardTopRow, GreyCardWrapper } from "./Shared";
import { Target } from "lucide-react";

export function PracticeTestCard() {
  const navigate = useNavigate();

  return (
    <GreyCardWrapper>
      <GreyCardTopRow
        title={`Take Practice Test`}
        icon={<Target className="size-4 text-c-60" />}
      />
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[26px] leading-8 tracking-tight text-c-80 font-bold">
          Take Election Day Practice Test 10 Times To Make The Most Amount Of
          Money
        </h3>

        <p className="text-c-50 text-[15px] font-medium leading-6">
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
    </GreyCardWrapper>
  );
}
