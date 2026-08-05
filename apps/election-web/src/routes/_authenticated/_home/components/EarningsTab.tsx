import { useNavigate } from "@tanstack/react-router";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import { Button } from "@repo/ui/components/button";
import FancyMoneyInEnvelopeIcon from "@repo/ui/icons/fancy-money-in-envelope-icon";

export function EarningsTab() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4">
      <section className="bg-yellow/20 rounded-[16px] pl-3 pr-5 py-4 flex items-center gap-2">
        <FancyMoneyBagIcon className="shrink-0 size-7" />
        <div className="space-y-1 w-full">
          <div className="flex items-center text-xl">
            <p className="w-full text-c-80">Earnings</p>
            <span className="text-neutral-900 font-extrabold text-[18px]">
              ₦1,240
            </span>
          </div>
          <div className="flex items-center text-c-50">
            <span className="w-full">Potential pay so far</span>
            <span className="shrink-0">₦3,829.00 total</span>
          </div>
        </div>
      </section>

    </div>
  );
}
