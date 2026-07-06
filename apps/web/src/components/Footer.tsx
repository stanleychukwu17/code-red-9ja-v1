import { motion } from "framer-motion";
import ThemeToggle from "#/components/ThemeToggle";

/**
 * Footer Component
 *
 * Displays the application footer including copyright information,
 * technology stack, theme toggle, and social links. It adjusts its
 * layout dynamically based on the sidebar state, device type (mobile vs desktop),
 * and whether it is rendered on an authentication page.
 */
export default function Footer() {
  // Hooks to get current routing location and device view type
  const year = new Date().getFullYear(); // current year to be displayed in the footer

  return (
    <motion.footer
      className="relative mt-10 border-t border-(--line) px-4 pb-14 pt-10 text-(--sea-ink-soft)"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <div className="page-wrap flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm font-medium">
          &copy; {year} Free9ja. All rights reserved.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <p className="island-kicker m-0 text-[13px] opacity-80">
            Made with ❤️ for Nigeria
          </p>
          <ThemeToggle />
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-4">
        <a
          href="#"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl p-2 text-(--sea-ink-soft) transition hover:bg-(--link-bg-hover) hover:text-(--sea-ink)"
        >
          <span className="sr-only">Follow Free9ja on X</span>
          <svg viewBox="0 0 16 16" aria-hidden="true" width="32" height="32">
            <path
              fill="currentColor"
              d="M12.6 1h2.2L10 6.48 15.64 15h-4.41L7.78 9.82 3.23 15H1l5.14-5.84L.72 1h4.52l3.12 4.73L12.6 1zm-.77 12.67h1.22L4.57 2.26H3.26l8.57 11.41z"
            />
          </svg>
        </a>
        <a
          href="#"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl p-2 text-(--sea-ink-soft) transition hover:bg-(--link-bg-hover) hover:text-(--sea-ink)"
        >
          <span className="sr-only">Go to Free9ja GitHub</span>
          <svg viewBox="0 0 16 16" aria-hidden="true" width="32" height="32">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
        </a>
      </div>
    </motion.footer>
  );
}
