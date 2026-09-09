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

/**
 * Ward Supervisor Tasks Tab.
 *
 * Displays direct call-to-action tasks for Ward Supervisors to mobilize their polling unit agents:
 * - Election Day: Call agents not yet arrived, agents inactive > 1hr, or pending EC8A uploads.
 * - Pre-Election: Call agents to ensure practice test completion.
 */
export function WardSupervisorTasksTab({
  isElectionDay,
}: SupervisorTasksTabProps) {
  const navigate = useNavigate();

  // Tasks requiring phone intervention on election day
  const electionDayTasks: TaskItem[] = [
    {
      label: "Call Polling Agents that have not arrived at their polling unit.",
      count: 3853,
      to: `/contacts?task=${encodeURIComponent("Call Polling Agents that have not arrived at their polling unit.")}`,
    },
    {
      label: "Call Polling Agents who have given no update in over 1 hour",
      count: 521,
      to: `/contacts?task=${encodeURIComponent("Call Polling Agents who have given no update in over 1 hour")}`,
    },
    {
      label: "Agents who are yet to upload their polling unit result",
      count: 521,
      to: `/contacts?task=${encodeURIComponent("Agents who are yet to upload their polling unit result")}`,
    },
  ];

  // Pre-election readiness preparation tasks
  const preElectionTasks: TaskItem[] = [
    {
      label:
        "Call Polling Agents and ensure they complete their election day practice test",
      count: 3853,
      to: `/contacts?task=${encodeURIComponent("Call Polling Agents and ensure they complete their election day practice test")}`,
    },
  ];

  const tasks = isElectionDay ? electionDayTasks : preElectionTasks;

  return (
    <div className="flex flex-col gap-4">
      {/* Earnings incentive callout banner */}
      {isElectionDay && (
        <section className="bg-yellow/20 rounded-[16px] px-4 py-3.5 flex items-start gap-3">
          <AlertIcon className="size-5 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-c-80 text-[14px] font-semibold leading-snug">
            Call every single one of them till they do their duty and watch your
            earnings go up.
          </p>
        </section>
      )}

      {/* Task checklist rows */}
      <div className="flex flex-col">
        {tasks.map((task) => (
          <TaskCard
            key={task.label}
            label={task.label}
            count={task.count}
            onClick={
              task.to ? () => navigate({ to: task.to as any }) : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

/**
 * LGA Supervisor Tasks Tab.
 *
 * Actionable tasks for LGA Supervisors to follow up with Ward Supervisors:
 * - Mobilize unstarted wards, escalate silent polling units, and expedite result uploads.
 */
export function LgaSupervisorTasksTab({
  isElectionDay,
}: SupervisorTasksTabProps) {
  const navigate = useNavigate();

  const electionDayTasks: TaskItem[] = [
    {
      label:
        "Call ward supervisors that haven't started their election duties today",
      count: "9/18",
      to: `/contacts?task=${encodeURIComponent("Call ward supervisors that haven't started their election duties today")}`,
    },
    {
      label:
        "Call ward supervisors whose polling agents have given no update in 1 hour +",
      count: "5/8",
      to: `/contacts?task=${encodeURIComponent("Call ward supervisors whose polling agents have given no update in 1 hour +")}`,
    },
    {
      label:
        "Call ward supervisors who are yet to get their polling agents to upload their polling unit result",
      count: "5/8",
      to: `/contacts?task=${encodeURIComponent("Call ward supervisors who are yet to get their polling agents to upload their polling unit result")}`,
    },
  ];

  const preElectionTasks: TaskItem[] = [
    {
      label:
        "Call ward supervisors and ensure their polling unit agents complete their election day practice test",
      count: 20,
      to: `/contacts?task=${encodeURIComponent("Call ward supervisors and ensure their polling unit agents complete their election day practice test")}`,
    },
  ];

  const tasks = isElectionDay ? electionDayTasks : preElectionTasks;

  return (
    <div className="flex flex-col gap-4">
      {/* Earnings incentive banner */}
      {isElectionDay && (
        <section className="bg-yellow/20 rounded-[16px] px-4 py-3.5 flex items-start gap-3">
          <AlertIcon className="size-5 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-c-80 text-[14px] font-semibold leading-snug">
            Call every single one of them till they do their duty and watch your
            earnings go up.
          </p>
        </section>
      )}

      {/* Actionable task list */}
      <div className="flex flex-col">
        {tasks.map((task) => (
          <TaskCard
            key={task.label}
            label={task.label}
            count={task.count}
            onClick={
              task.to ? () => navigate({ to: task.to as any }) : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

/**
 * State Supervisor Tasks Tab.
 *
 * Actionable coordination tasks for State Supervisors to track LGA Supervisors across the state.
 */
export function StateSupervisorTasksTab({
  isElectionDay,
}: SupervisorTasksTabProps) {
  const navigate = useNavigate();

  const electionDayTasks: TaskItem[] = [
    {
      label:
        "Call LGA supervisors that haven't started their election duties today",
      count: "9/18",
      to: `/contacts?task=${encodeURIComponent("Call LGA supervisors that haven't started their election duties today")}`,
    },
    {
      label:
        "Call LGA supervisors whose polling agents have given no update in 1 hour +",
      count: "5/8",
      to: `/contacts?task=${encodeURIComponent("Call LGA supervisors whose polling agents have given no update in 1 hour +")}`,
    },
    {
      label:
        "Call LGA supervisors who are yet to get their polling agents to upload their polling unit result",
      count: "5/8",
      to: `/contacts?task=${encodeURIComponent("Call LGA supervisors who are yet to get their polling agents to upload their polling unit result")}`,
    },
  ];

  const preElectionTasks: TaskItem[] = [
    {
      label:
        "Call LGA supervisors and ensure their polling unit agents complete their election day practice test",
      count: 20,
      to: `/contacts?task=${encodeURIComponent("Call LGA supervisors and ensure their polling unit agents complete their election day practice test")}`,
    },
  ];

  const tasks = isElectionDay ? electionDayTasks : preElectionTasks;

  return (
    <div className="flex flex-col gap-4">
      {/* Incentive banner */}
      {isElectionDay && (
        <section className="bg-yellow/20 rounded-[16px] px-4 py-3.5 flex items-start gap-3">
          <AlertIcon className="size-5 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-c-80 text-[14px] font-semibold leading-snug">
            Call every single one of them till they do their duty and watch your
            earnings go up.
          </p>
        </section>
      )}

      {/* Task list */}
      <div className="flex flex-col">
        {tasks.map((task) => (
          <TaskCard
            key={task.label}
            label={task.label}
            count={task.count}
            onClick={
              task.to ? () => navigate({ to: task.to as any }) : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
