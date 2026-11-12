import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { APP_URL } from "#/lib/config";
import { checkIfRefreshTokenInCookie, getUserDetailsCookie } from "#/lib/server/auth/auth";
import { ShieldCheck, Activity, Radio, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const res = await checkIfRefreshTokenInCookie();
    if (res.success) {
      const user = await getUserDetailsCookie();
      if (user?.party?.short_name) {
        throw redirect({
          to: APP_URL.controlCenter.home(user.party.short_name),
        });
      }
      throw redirect({
        to: APP_URL.parties,
      });
    }
  },
  head: () =>
    getPageHeader({
      title: "Situation Room | Free9ja Control Center",
    }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col justify-between bg-neutral-950 text-neutral-100 selection:bg-emerald-500/30">
      <header className="px-6 py-5 border-b border-neutral-800/80 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Radio className="size-5 animate-pulse" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white block">Free9ja</span>
            <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase block">
              Control Center &bull; Situation Room
            </span>
          </div>
        </div>
        <Link
          to={APP_URL.auth.login}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-neutral-950 transition-colors"
        >
          Authorized Access
        </Link>
      </header>

      <section className="px-6 py-20 max-w-5xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
          <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
          Real-Time Collation & Parallel Vote Tabulation Command
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white">
          Election Day War Room & <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
            Party Collation Control
          </span>
        </h1>

        <p className="text-neutral-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
          The centralized nerve center for party leadership, collation agents, and election directors.
          Track PU EC8A submissions, live INEC scraping, parallel tabulation, discrepancy audits, and field incident feeds in real time.
        </p>

        <div className="pt-4 flex flex-wrap justify-center gap-4">
          <Link
            to={APP_URL.auth.login}
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20"
          >
            Enter Situation Room
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-12 text-left">
          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
            <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <BarChart3 className="size-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Collation Waterfall</h3>
            <p className="text-xs text-neutral-400">
              Real-time aggregation tracking from EC8A polling units up to EC8E final declarations.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
            <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Activity className="size-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Discrepancy Matrix</h3>
            <p className="text-xs text-neutral-400">
              Automated auditing between party agent uploads and official INEC portal scrapers.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
            <div className="size-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
              <ShieldCheck className="size-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Incident & SOS Triage</h3>
            <p className="text-xs text-neutral-400">
              Instant alerts on BVAS glitches, delayed deployment, violence, and agent safety distress.
            </p>
          </div>
        </div>
      </section>

      <footer className="px-6 py-6 border-t border-neutral-800/60 text-center text-xs text-neutral-500">
        &copy; {new Date().getFullYear()} Free9ja Electoral Operations. Authorized Party Personnel Only.
      </footer>
    </main>
  );
}
