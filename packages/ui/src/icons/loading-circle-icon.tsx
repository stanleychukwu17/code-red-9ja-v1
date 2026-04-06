import { SVGProps } from "react";
import { cn } from "../lib/utils";

const LoadingCircleIcon = ({
  trackColor,
  thumbColor,
  trackClassName,
  thumbClassName,
  strokeClassName,
  className,
  ...props
}: SVGProps<SVGSVGElement> & {
  trackColor?: string;
  thumbColor?: string;
  trackClassName?: string;
  thumbClassName?: string;
  strokeClassName?: string;
}) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      className={cn("size-7 animate-spin text-c-70", className)}
    >
      <path
        d="M12 3C16.97 3 21 7.03 21 12"
        className={cn(
          "stroke-current",
          "text-c-80",
          strokeClassName,
          thumbClassName,
        )}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        opacity="0.3"
        d="M12 3C16.97 3 21 7.03 21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3Z"
        className={cn(
          "stroke-current",
          "text-c-100",
          strokeClassName,
          trackClassName,
        )}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default LoadingCircleIcon;
