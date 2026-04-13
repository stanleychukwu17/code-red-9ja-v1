import { SVGProps } from "react";

const BallotIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g opacity="0.6">
        <path
          d="M5.63184 14.3692L10.001 10L14.3702 14.3692M14.3702 5.63083L10.0002 10L5.63184 5.63083"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export default BallotIcon;
