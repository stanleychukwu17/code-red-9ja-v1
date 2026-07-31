import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  className,
  buttonClassName,
  onBackClick,
  hideBackButton,
}: {
  title?: string;
  className?: string;
  buttonClassName?: string;
  onBackClick?: () => void;
  hideBackButton?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className={cn(`flex items-center pt-4 pb-2`, className)}>
      {!hideBackButton && (
        <Button
          type="button"
          variant="ghost"
          size="4xl"
          onClick={onBackClick}
          className={cn(
            "w-16 [&_svg]:size-7 [&_svg]:text-c-70",
            buttonClassName,
          )}
        >
          <ChevronLeft />
        </Button>
      )}

      {title && (
        <h1 className="w-full text-center text-xl font-semibold">{title}</h1>
      )}

      <div className="shrink-0 w-16 h-10" />
    </div>
  );
}
