import { SVGProps } from "react";

const PlusIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4.87809 12.1219L12 12.1219L12 19.2438M19.1219 12.1219L11.9993 12.1212L12 5"
        stroke="currentColor"
        strokeWidth="2.03755"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default PlusIcon;
