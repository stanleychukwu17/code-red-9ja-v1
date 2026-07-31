import { SVGProps } from "react";

const ArrowHandleIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2.5 10H17.0833" stroke="currentColor" />
      <path
        d="M11.668 15.8332L17.5013 9.99984L11.668 4.1665"
        stroke="currentColor"
      />
    </svg>
  );
};

export default ArrowHandleIcon;
