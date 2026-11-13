import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { APP_URL } from "#/lib/config";
import { checkIfRefreshTokenInCookie, getUserDetailsCookie } from "#/lib/server/auth/auth";
import { ShieldCheck, Activity, Radio, BarChart3, Sun, Moon } from "lucide-react";
import { useTheme } from "@repo/ui/hooks/use-theme";

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
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <main className="min-h-screen flex flex-col justify-between bg-background text-foreground selection:bg-primary/20">
      <header className="px-6 py-5 border-b border-border flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Radio className="size-5 animate-pulse" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-foreground block">Free9ja</span>
            <span className="text-[10px] text-primary font-semibold tracking-wider uppercase block">
              Control Center &bull; Situation Room
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg bg-card border border-border text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            {theme === "dark" ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
          </button>
          <Link
            to={APP_URL.auth.login}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors shadow-xs"
          >
            Authorized Access
          </Link>
        </div>
      </header>

      <section className="px-6 py-20 max-w-5xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
          <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
          Real-Time Collation & Parallel Vote Tabulation Command
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground">
          Election Day War Room & <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-200">
            Party Collation Control
          </span>
        </h1>

        <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
          The centralized nerve center for party leadership, collation agents, and election directors.
          Track PU EC8A submissions, live INEC scraping, parallel tabulation, discrepancy audits, and field incident feeds in real time.
        </p>

        <div className="pt-4 flex flex-wrap justify-center gap-4">
          <Link
            to={APP_URL.auth.login}
            className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-all shadow-md shadow-primary/20"
          >
            Enter Situation Room
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-12 text-left">
          <div className="p-5 rounded-2xl bg-card border border-border space-y-2 shadow-xs">
            <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="size-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Collation Waterfall</h3>
            <p className="text-xs text-muted-foreground">
              Real-time aggregation tracking from EC8A polling units up to EC8E final declarations.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border space-y-2 shadow-xs">
            <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Activity className="size-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Discrepancy Matrix</h3>
            <p className="text-xs text-muted-foreground">
              Automated auditing between party agent uploads and official INEC portal scrapers.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border space-y-2 shadow-xs">
            <div className="size-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <ShieldCheck className="size-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Incident & SOS Triage</h3>
            <p className="text-xs text-muted-foreground">
              Instant alerts on BVAS glitches, delayed deployment, violence, and agent safety distress.
            </p>
          </div>
        </div>
      </section>

      <footer className="px-6 py-6 border-t border-border text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Free9ja Electoral Operations. Authorized Party Personnel Only.
      </footer>
    </main>
  );
}
