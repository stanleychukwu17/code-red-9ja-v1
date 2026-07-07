import { SVGProps } from "react";

const PartyIcon = (props: SVGProps<SVGSVGElement>) => {
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
        d="M8.364 13C10.788 10.576 13.212 10.576 15.636 13C18.122 10.87 19.514 10.87 22 13C22 7.477 17.523 3 12 3C6.477 3 2 7.477 2 13C4.486 10.87 5.878 10.87 8.364 13Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 11.5V18.773C12 22.292 17.5 22.292 17.5 18.773"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default PartyIcon;
