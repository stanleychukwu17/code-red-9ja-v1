import {
  createFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { Flag } from "lucide-react";
import { useState } from "react";
import { AppPageHeader } from "../../../../components/app-page-header";
import { AppSidebarShell } from "../../../../components/app-sidebar";
import { CANDIDATES, STATE_POLLING_UNITS } from "../../../../data/dashboard";

type StateTab = "Candidates" | "Polling units";

export const Route = createFileRoute("/(authenticated)/states/$stateId/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [tab, setTab] = useState<StateTab>("Candidates");
  const { stateId } = useParams({ from: "/(authenticated)/states/$stateId/" });
  const navigate = useNavigate();
  const leader = CANDIDATES[0];

  return (
    <AppSidebarShell activeItem="home">
      <div className="flex-1 px-4 pb-8 pt-6 md:px-12 md:pt-7">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-7">
          <AppPageHeader
            title="State"
            right={
              <div className="relative hidden md:block">
                <img
                  src={leader.image}
                  alt={leader.name}
                  className="size-[92px] rounded-full object-cover"
                />
                <div className="absolute bottom-1 right-0 flex size-9 items-center justify-center rounded-full bg-[#d5e2da] text-[16px] font-bold text-black">
                  #1
                </div>
              </div>
            }
          />

          <section className="space-y-5">
            <div className="space-y-3">
              <p className="text-[18px] text-[#837d82]">State</p>
              <h2 className="text-[52px] font-bold leading-none tracking-[-0.05em] text-[#2f6f57]">
                {stateId}
              </h2>
            </div>

            <div className="flex items-center gap-6 text-[#1d1b1e]">
              <Metric value="2,112,382" label="Votes" />
              <MetricDivider />
              <Metric value="102,011" label="Polling units" />
              <MetricDivider />
              <Metric value="0%" label="PU flagged" />
            </div>

            <div className="flex h-[48px] w-full max-w-[388px] items-center justify-between rounded-[12px] bg-[#ffe29a] px-4">
              <div className="flex items-center gap-3">
                <Flag className="size-4 fill-[#b06d12] text-[#b06d12]" />
                <span className="text-[16px] text-[#1b1a1b]">
                  This polling unit has been
                </span>
              </div>
              <span className="text-[16px] font-bold text-[#b06d12]">
                Flagged
              </span>
            </div>
          </section>

          <section className="space-y-8">
            <div className="flex border-b border-black/5">
              {(["Candidates", "Polling units"] as const).map((item) => {
                const active = tab === item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTab(item)}
                    className={`flex-1 border-b-[3px] pb-4 pt-7 text-center text-[17px] font-bold transition ${
                      active
                        ? "border-black text-[#171416]"
                        : "border-transparent text-[#b5b0b3]"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            {tab === "Candidates" ? (
              <div className="space-y-5">
                {CANDIDATES.map((candidate) => (
                  <div
                    key={candidate.name}
                    className="grid grid-cols-[minmax(0,1fr)_120px_48px] items-center gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={candidate.image}
                        alt={candidate.name}
                        className="size-11 rounded-full object-cover"
                      />
                      <span className="text-[18px] text-[#1d1b1e]">
                        {candidate.name}
                      </span>
                    </div>
                    <span className="text-right text-[16px] font-semibold text-[#111111]">
                      {candidate.votes}
                    </span>
                    <span className="text-right text-[16px] font-semibold text-[#8d8d8d]">
                      {candidate.rank}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {STATE_POLLING_UNITS.map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() =>
                      navigate({
                        to: "/polling-unit/$pollingUnitId",
                        params: { pollingUnitId: stateId },
                      })
                    }
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto_80px_48px] items-center gap-4 text-left"
                  >
                    <span className="truncate text-[18px] text-[#2a2729]">
                      {unit}
                    </span>
                    <img
                      src={leader.image}
                      alt={leader.name}
                      className="size-8 rounded-full object-cover"
                    />
                    <span className="text-right text-[16px] font-semibold text-[#111111]">
                      4,308
                    </span>
                    <span className="text-right text-[16px] font-semibold text-[#8d8d8d]">
                      #4
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppSidebarShell>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-[24px] font-medium text-[#1c1a1b]">{value}</p>
      <p className="mt-1 text-[14px] text-[#7f7b7e]">{label}</p>
    </div>
  );
}

function MetricDivider() {
  return <div className="h-8 w-px bg-[#d8d2d5]" />;
}
