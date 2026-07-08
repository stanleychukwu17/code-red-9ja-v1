import { useNavigate } from "@tanstack/react-router";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import { Button } from "@repo/ui/components/button";

export function ObjectivesTab() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4">
      {/* Objectives Header */}
      <div className="flex items-center justify-between mt-2">
        <h2 className="text-primary font-semibold text-2xl">Objectives</h2>
        <p className="text-c-70 font-bold text-2xl">0/4</p>
      </div>

      {/* Objectives List */}
      <section className="bg-c-5 rounded-[20px] py-2.5 flex flex-col">
        {[
          { label: "Enter time when election started", value: "+₦1,240" },
          { label: "Give at least 5 updates (0)", value: "+₦12,240" },
          { label: "Enter time when election ended", value: "+₦1,240" },
          { label: "Upload vote result picture", value: "+₦5,000" },
        ].map((item, i) => (
          <div
            key={i}
            className="h-14 flex items-center justify-between gap-3 px-4"
          >
            <div className="flex items-center gap-3">
              <div className="size-5 rounded-full bg-c-30 shrink-0" />
              <span className="text-c-90">{item.label}</span>
            </div>
            <span className="font-bold text-c-80 text-lg shrink-0">
              {item.value}
            </span>
          </div>
        ))}
      </section>

      {/* Earnings Card */}
      <section className="bg-yellow/20 rounded-[16px] pl-3 pr-5 py-4 flex items-center gap-2 mt-2">
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

      {/* Upload Button */}
      <Button
        type="button"
        variant="secondary"
        size="4xl"
        onClick={() => navigate({ to: "/upload-result" })}
      >
        Upload Polling Unit Election Result
      </Button>

      {/* Descriptive Text */}
      <p className="text-c-80 leading-7 mt-2">
        When election is over take a picture of the voting result form
        containing all candidates and their votes and upload it.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 mt-2">
        <Button
          type="button"
          variant="black"
          size="4xl"
          onClick={() => navigate({ to: "/election-end" })}
        >
          Enter time election ended
        </Button>
        <Button
          type="button"
          variant="black"
          size="4xl"
          // onClick={() => navigate({ to: "/request-payout" })}
        >
          Request Payout
        </Button>
      </div>

      {/* Payout Information */}
      <p className="text-c-50 leading-7 mt-2">
        Full payment is tied to you completing all your objectives. Once you've
        completed all, tap Request Payout, and we will send you your money.
      </p>

      <p className="text-c-50 leading-7 mt-2">
        <strong className="text-c-80 font-bold">Please Note:</strong> There will
        be no payout for you except you upload the voting result picture of your
        polling unit and ensure all updates uploaded are uploaded.
      </p>
    </div>
  );
}
