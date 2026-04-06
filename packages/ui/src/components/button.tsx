import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../lib/utils";
import { useCopyToClipboard } from "usehooks-ts";
import CopyIcon from "../icons/copy-icon";
import LoadingCircleIcon from "../icons/loading-circle-icon";

const buttonVariants = cva(
  "inline-flex text-lg font-bold items-center justify-center gap-1.5 whitespace-nowrap rounded-[16px] ring-offset-background transition duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:text-black/50 dark:[&_svg]:text-white cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-accent",
        secondary: "bg-secondary text-c-80 hover:bg-secondary/80",
        green: "bg-light-green text-white hover:bg-light-green/95",
        tertiary:
          "bg-[#F6F8FA] dark:bg-[#1c1d1f] dark:hover:bg-[#292c33] text-c-90 font-medium border-0.8 border-border hover:bg-[#F1F3F5]",
        outline:
          "border md:border-0.8 border-border bg-background hover:bg-accent",
        destructiveOutline:
          "border border-border bg-background hover:bg-accent [&_svg]:text-red dark:[&_svg]:text-red text-red",
        purple: "bg-purple text-white hover:bg-purple-accent",
        orange: "bg-orange text-white hover:bg-orange-accent",
        pink: "bg-pink text-white hover:bg-pink-accent",
        red: "bg-red text-white hover:bg-red-accent",
        "light green": "bg-light-green text-white hover:bg-light-green-accent",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-red-500",
        ghost: "text-c-80 hover:bg-accent hover:text-c-80",
        ghostDestructive:
          "text-c-80 bg-background md:bg-transparent hover:bg-red/10 hover:text-c-80 [&_svg]:text-red dark:[&_svg]:text-red px-4 w-fit border-0.8 border-border md:border-0",
        link: "text-black/60 hover:text-black/80 [&_svg]:text-black/60 [&_svg]:hover:text-black/80",
        bullet:
          "text-c-80 bg-background font-normal shadow-bullet hover:shadow-bullet-hover rounded-lg md:rounded-[6px] gap-2 md:gap-1 text-lg md:text-sm [&_svg]:text-c-50 [&_svg]:size-4 md:[&_svg]:size-[14px]",
        grey: "bg-c-1.5 hover:bg-c-3",
        deepGrey: "bg-hover-3 hover:bg-hover-5",
        deepGreyIcon:
          "bg-hover-3 hover:bg-hover-5 [&_svg]:size-5 [&_svg]:text-c-60 hover:[&_svg]:text-c-80",
      },
      size: {
        default: "h-[56px] px-2.5",
        bullet: "h-8 px-3 md:h-6 md:px-2",
        xs: "h-6 px-2",
        sm: "h-7 px-2.5",
        lg: "h-8 px-2.5",
        xl: "h-9 px-2.5 ",
        large: "h-10 rounded-[16px] w-full [&_svg]:size-5",
        "extra-large":
          "h-[52px] rounded-[16px] w-full font-medium [&_svg]:size-5",
        "icon-sm":
          "size-7 hover:text-c-80 flex items-center justify-center hover:[&_svg]:text-c-80",
        "icon-md":
          "size-8 hover:text-c-80 flex items-center justify-center hover:[&_svg]:text-c-80",
        "icon-lg":
          "size-9 hover:text-c-80 flex items-center justify-center hover:[&_svg]:text-c-80",
        "icon-xl":
          "size-10 hover:text-c-80 flex items-center justify-center hover:[&_svg]:text-c-80",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      icon,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <LoadingCircleIcon className="size-4 animate-spin" />
            {children}
          </div>
        ) : icon ? (
          <>
            {icon}
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export const Bullet = React.forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode;
    showError?: boolean;
    disabled?: boolean;
  } & React.HTMLAttributes<HTMLDivElement>
>(({ children, showError, disabled, className, ...props }, ref) => {
  return (
    <Button
      variant={"bullet"}
      size={"bullet"}
      className={cn(
        "border-0.8 border-c-5",
        showError && "border-red",
        className,
      )}
      disabled={disabled}
      asChild
      {...(props as any)}
    >
      <div ref={ref}>{children}</div>
    </Button>
  );
});
Bullet.displayName = "Bullet";

export const CopyButton = ({
  textToCopy,
  className,
}: {
  textToCopy: string;
  className?: string;
}) => {
  const [buttonText, setButtonText] = React.useState<"Copy" | "Copied!">(
    "Copy",
  );
  const [_, copyToClipboard] = useCopyToClipboard();

  const handleCopy = () => {
    copyToClipboard(textToCopy);
    setButtonText("Copied!");
    // toast.custom((id) => <AppToast title="Link copied" mode="success" id={id} />)
    setTimeout(() => setButtonText("Copy"), 2000);
  };

  return (
    <Button
      variant="outline"
      className={cn("rounded-[16px] w-full text-c-80 font-medium", className)}
      onMouseDown={buttonText === "Copy" ? handleCopy : undefined}
    >
      {/* {buttonText === "Copy" ? <><Copy /> <p>Copy</p></> : <Check className="size-4 text-c-80" strokeWidth="2.5" />} */}
      {buttonText === "Copy" && <CopyIcon />}
      <p>{buttonText}</p>
    </Button>
  );
};

export { Button, buttonVariants };
