import { toast } from "sonner";
import { cn } from "@repo/ui/lib/utils";

export function showFeedbackToast(isCorrect: boolean, failedAttemptCount = 1) {
  toast.custom(
    (id) => (
      <div className={cn("w-full text-white font-bold flex justify-center")}>
        {isCorrect ? (
          <div className="w-fit h-fit px-4 py-3 rounded-xl flex items-center gap-2 bg-green">
            <span>Correct Answer 👍</span>
          </div>
        ) : (
          <div className="w-fit h-fit px-4 py-2 rounded-xl flex items-center gap-2 bg-red">
            <span>Wrong. Failed attempts: {failedAttemptCount} 😔</span>
          </div>
        )}
      </div>
    ),
    { position: "top-center", duration: 5000 },
  );
}
