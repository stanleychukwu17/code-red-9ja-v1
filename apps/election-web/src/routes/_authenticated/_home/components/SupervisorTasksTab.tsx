import AlertIcon from "@repo/ui/icons/alert-icon";
import { useNavigate } from "@tanstack/react-router";

/** Actionable supervisor intervention task linking to filtered phone contact directory */
interface TaskItem {
  label: string;
  count: number | string;
  to?: string;
}

/**
 * Reusable supervisor task card row displaying task description, count badge, and navigation arrow.
 */
function TaskCard({
  label,
  count,
  onClick,
}: {
  label: string;
  count: number | string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3.5 px-1 active:bg-c-5 transition-colors"
    >
      <div className="size-5 rounded-full bg-c-10 shrink-0" />
      <p className="text-c-80 text-[15px] font-medium text-left flex-1 leading-snug">
        {label}
      </p>
      <span className="text-black font-extrabold text-[15px] shrink-0">
        {typeof count === "number" ? count.toLocaleString() : count}
      </span>
      <svg
        className="size-4 text-c-50 shrink-0"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6 12L10 8L6 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

interface SupervisorTasksTabProps {
  /** True when current day matches the active election date */
  isElectionDay: boolean;
}

