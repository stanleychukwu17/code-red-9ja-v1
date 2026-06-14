import ArrowDownIcon from "../../icons/arrow-down-icon";
import { Bullet, Button } from "../button";
import { cn } from "../../lib/utils";
import { SelectResponsiveWrapper } from "../selects/select-responsive-wrapper";

type LoadingBulletProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
  align?: "start" | "center" | "end";
};

export const LoadingBullet = ({
  open,
  setOpen,
  placeholder = "Loading...",
  className,
  icon,
  align = "start",
}: LoadingBulletProps) => {
  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder={placeholder}
      align={align}
      className={className}
      trigger={
        <Bullet className={className}>
          {icon}
          <p>{placeholder}</p>
        </Bullet>
      }
    >
      <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">
        Loading...
      </div>
    </SelectResponsiveWrapper>
  );
};
