import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  className,
  buttonClassName,
  onBackClick,
}: {
  title?: string;
  className?: string;
  buttonClassName?: string;
  onBackClick?: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className={cn(`flex items-center pt-4 pb-2`, className)}>
      <Button
        type="button"
        variant="ghost"
        size="4xl"
        onClick={() =>
          onBackClick ? onBackClick() : navigate({ to: "/home" })
        }
        className={cn("w-16 [&_svg]:size-7 [&_svg]:text-c-70", buttonClassName)}
      >
        <ChevronLeft />
      </Button>

      {title && (
        <h1 className="w-full text-center text-xl font-semibold">{title}</h1>
      )}

      <div className="w-16 h-10" />
    </div>
  );
}
