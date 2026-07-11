import { createFileRoute, Link } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { APP_URL } from "@/lib/config";
import { useAppSelector } from "@/redux/hooks";
import { Button } from "@repo/ui/components/button";
import { motion, type Variants } from "framer-motion";
import {
  Activity,
  ChevronRight,
  Users,
  Vote,
  TrendingUp,
  ShieldCheck,
  Bell
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => getPageHeader({
    title: "Dashboard Home"
  }),
  component: Home
});

function Home() {
  const { user } = useAppSelector((state) => state.auth);

  const firstName = user?.first_name || "Citizen";

  const stats = [
    { label: "Community Rank", value: "Top 15%", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Active Polls", value: "3", icon: Vote, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Party Status", value: "Verified", icon: ShieldCheck, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <main className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950/50 text-neutral-900 dark:text-neutral-100 p-4 md:p-8">
      <motion.div
        className="max-w-6xl mx-auto space-y-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-400 bg-clip-text text-transparent pb-1">
              Welcome back, {firstName}
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1 text-lg">
              Here is what's happening in your community today.
            </p>
          </div>
          <Button variant="outline" className="gap-2 rounded-full border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </Button>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5, scale: 1.02 }}
              className="p-6 rounded-2xl bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl border border-white/20 dark:border-neutral-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{stat.label}</p>
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Two Column Layout for Actions & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              Quick Actions
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link to={APP_URL.feed} className="block group">
                <div className="p-6 h-full rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                  <Users className="w-8 h-8 mb-4 opacity-80 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-semibold mb-2">Join the Conversation</h3>
                  <p className="text-emerald-50 text-sm opacity-90 mb-4">Engage with your local community and discuss matters that count.</p>
                  <div className="flex items-center gap-1 text-sm font-medium">
                    Go to Feed <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>

              <Link to={APP_URL.profile} className="block group">
                <div className="p-6 h-full rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all">
                  <ShieldCheck className="w-8 h-8 mb-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-semibold mb-2">Complete Membership</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">Ensure your political party membership details are up to date.</p>
                  <div className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Update Profile <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            </div>
          </motion.div>

          {/* Recent Activity Feed */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h2 className="text-xl font-bold">Recent Updates</h2>
            <div className="p-1 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="flex flex-col">
                {[
                  { title: "New Poll Available", time: "2 hours ago", type: "poll" },
                  { title: "Your membership was verified", time: "1 day ago", type: "success" },
                  { title: "Community guidelines updated", time: "3 days ago", type: "info" }
                ].map((item, i) => (
                  <div key={i} className={`p-4 flex items-start gap-3 ${i !== 2 ? 'border-b border-neutral-100 dark:border-neutral-800' : ''} hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors first:rounded-t-xl last:rounded-b-xl`}>
                    <div className={`mt-1 rounded-full p-1.5 ${item.type === 'poll' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                      item.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                      {item.type === 'poll' ? <Vote className="w-3.5 h-3.5" /> :
                        item.type === 'success' ? <ShieldCheck className="w-3.5 h-3.5" /> :
                          <Activity className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-neutral-100 dark:border-neutral-800">
                <Button variant="ghost" className="w-full text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
                  View all activity
                </Button>
              </div>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </main>
  );
}
