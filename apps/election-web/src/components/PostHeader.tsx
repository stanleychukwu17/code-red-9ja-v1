import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { X } from "lucide-react";

interface PostHeaderProps {
  onClose: () => void;
  onPost: () => void;
  isSubmitting: boolean;
  isDisabled: boolean;
  isInputMode?: boolean; // For the report page, only show post when in input mode
  isReport?: boolean;
}

export function PostHeader({
  onClose,
  onPost,
  isSubmitting,
  isDisabled,
  isInputMode = true,
  isReport,
}: PostHeaderProps) {
  return (
    <div className="flex items-center justify-between pt-4 pb-2 px-4">
      <Button
        type="button"
        variant="ghost"
        size="4xl"
        onClick={onClose}
        className="w-16 [&_svg]:size-7 [&_svg]:text-c-70 -ml-4"
      >
        <X />
      </Button>
      {isInputMode && (
        <Button
          variant={isReport ? "default" : "secondary"}
          size="sm"
          className={cn(
            "px-6 rounded-full h-8",
            isReport && "bg-red hover:bg-red/90 text-white",
          )}
          onClick={onPost}
          disabled={isDisabled || isSubmitting}
        >
          {isSubmitting
            ? isReport
              ? "Reporting..."
              : "Posting..."
            : isReport
              ? "Report"
              : "Post"}
        </Button>
      )}
    </div>
  );
}
