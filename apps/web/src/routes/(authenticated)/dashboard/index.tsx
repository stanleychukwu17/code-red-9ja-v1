import { Button } from "@repo/ui/components/button";
import PollingUnitIcon from "@repo/ui/icons/polling-unit-icon";
import ReportIcon from "@repo/ui/icons/report-icon";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, Edit3, Upload } from "lucide-react";
import { AppSidebarShell } from "../../../components/app-sidebar";
import { CANDIDATES, DASHBOARD_STATE_RANKINGS } from "../../../data/dashboard";

export const Route = createFileRoute("/(authenticated)/dashboard/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  return (
    <AppSidebarShell activeItem="home">
      <div className="flex-1 px-4 pb-6 pt-6 md:px-12 md:pb-10 md:pt-7 xl:px-12">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
          <header className="space-y-5">
            <h1 className="text-[34px] font-bold tracking-[-0.04em] text-[#1d1d1d]">
              Dashboard
            </h1>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop"
                  alt="Lotta Free 9ja"
                  className="size-[46px] rounded-full object-cover"
                />
                <p className="text-[18px] font-semibold text-[#181818] md:text-[20px]">
                  Hi Lotta, Free 9ja
                </p>
              </div>

              <Link
                to="/app-users"
                className="flex items-center gap-3 self-start rounded-full bg-white/50 px-4 py-2 transition hover:bg-white/80 md:self-auto"
              >
                <span className="inline-flex size-4 rounded-full bg-[#32b25f] shadow-[inset_6px_-5px_0_0_rgba(22,102,56,0.9)]" />
                <span className="text-[18px] font-semibold text-[#161616]">
                  2.31m online
                </span>
              </Link>
            </div>
          </header>

          <section className="rounded-[24px] bg-[#111111] px-5 py-5 text-white shadow-[0_10px_30px_rgba(17,17,17,0.12)] md:px-6 md:py-6">
            <div className="space-y-5">
              {CANDIDATES.slice(0, 3).map((candidate) => (
                <div
                  key={candidate.name}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[minmax(0,1fr)_140px_150px_52px] md:gap-6"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={candidate.image}
                      alt={candidate.name}
                      className="size-[42px] rounded-full border border-white/10 object-cover"
                    />
                    <span className="text-[18px] font-normal text-white">
                      {candidate.name}
                    </span>
                  </div>
                  <span className="hidden text-right text-[16px] font-semibold text-white/95 md:block">
                    {candidate.states}
                  </span>
                  <span className="text-right text-[16px] font-semibold text-white/95">
                    {candidate.votes}
                  </span>
                  <span className="text-right text-[16px] font-semibold text-white/50">
                    {candidate.rank}
                  </span>
                </div>
              ))}

              <Link
                to="/candidates"
                className="mt-2 flex h-[52px] w-full items-center justify-center rounded-[14px] bg-[#5d5d5d] text-[18px] font-semibold text-white transition hover:bg-[#6a6a6a]"
              >
                Show all
              </Link>
            </div>
          </section>

          <section className="grid gap-7 xl:grid-cols-[minmax(0,1.65fr)_460px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-semibold text-[#333333]">
                  States
                </h2>
              </div>

              <div className="rounded-[24px] bg-white/75 p-3 shadow-[0_1px_0_rgba(28,28,28,0.03)] ring-1 ring-[#f0ebee]">
                <div className="space-y-1">
                  {DASHBOARD_STATE_RANKINGS.map((state) => (
                    <button
                      key={state.name}
                      type="button"
                      onClick={() =>
                        navigate({
                          to: "/states/$stateId",
                          params: { stateId: state.name },
                        })
                      }
                      className={`grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2 rounded-[16px] px-4 py-4 md:gap-4 md:px-5 ${
                        state.highlighted ? "bg-[#def1e6]" : "bg-transparent"
                      } text-left transition hover:bg-[#f5f1f3]`}
                    >
                      <span className="text-[17px] font-normal text-[#202020]">
                        {state.name}
                      </span>
                      <img
                        src={state.image}
                        alt={state.name}
                        className="size-[30px] rounded-full object-cover"
                      />
                      <span className="text-[16px] font-semibold text-[#111111]">
                        {state.votes}
                      </span>
                      <span className="text-[16px] font-semibold text-[#8d8d8d]">
                        {state.rank}
                      </span>
                    </button>
                  ))}
                </div>

                <Link
                  to="/states"
                  className="mt-4 flex h-[56px] w-full items-center justify-center rounded-[16px] bg-[#f3f3f3] text-[18px] font-semibold text-[#111111] transition hover:bg-[#ebebeb]"
                >
                  Show all
                </Link>
              </div>
            </div>

            <aside className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-semibold text-[#333333]">
                  My Polling Unit
                </h2>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-[16px] font-semibold text-[#7a787d] transition hover:text-[#555257]"
                >
                  <Edit3 className="size-4" />
                  Change
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: "/polling-unit/$pollingUnitId",
                    params: { pollingUnitId: "KOFAR FADA DOKA" },
                  })
                }
                className="flex h-[74px] items-center justify-between rounded-[18px] bg-[#d6cdf7] px-6 text-left transition hover:bg-[#cec2f5]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex size-11 items-center justify-center rounded-[14px] bg-[#c9bff1]">
                    <PollingUnitIcon />
                  </div>
                  <span className="text-[17px] font-normal text-[#202020]">
                    PW Junction
                  </span>
                </div>
                <span className="text-[18px] font-semibold text-[#1a1a1a]">
                  302 votes
                </span>
              </button>

              <Button
                variant="purple"
                className="h-[62px] w-full rounded-[18px] bg-[#6f53ef] text-[18px] font-semibold text-white hover:bg-[#6649ea]"
                icon={<Upload className="size-5 text-white/90" />}
              >
                Upload Vote Result
              </Button>

              <button
                type="button"
                className="flex h-[62px] w-full items-center justify-center gap-3 rounded-[18px] border border-[#ff4b4b] bg-white text-[18px] font-semibold text-[#1d2c27] transition hover:bg-[#fff8f8]"
              >
                <ReportIcon className="size-5" />
                Report this Polling Unit
              </button>

              <div className="rounded-[22px] bg-[#ffe29a] px-5 py-5 text-[#202020]">
                <p className="mb-4 flex items-start gap-3 text-[16px] font-medium leading-7">
                  <Bell className="mt-1 size-4 shrink-0 fill-[#a56b12] text-[#a56b12]" />
                  <span>
                    Please wait to the end of election at your polling unit.
                  </span>
                </p>
                <p className="text-[16px] leading-8 text-[#242424]">
                  Once everyone has voted, take a picture of the results and
                  click <span className="font-bold">upload vote result</span> to
                  upload your polling unit's result.
                </p>
                <p className="mt-5 text-[16px] leading-8 text-[#242424]">
                  By doing this, you ensure that your vote indeed count.
                </p>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </AppSidebarShell>
  );
}
