import { SVGProps } from "react";

const OTPIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g opacity="0.5">
        <path
          d="M13.9999 11.6667C16.5772 11.6667 18.6666 9.57734 18.6666 7.00001C18.6666 4.42268 16.5772 2.33334 13.9999 2.33334C11.4226 2.33334 9.33325 4.42268 9.33325 7.00001C9.33325 9.57734 11.4226 11.6667 13.9999 11.6667Z"
          stroke="black"
          stroke-width="1.5"
        />
        <path
          d="M23.3333 20.4167C23.3333 23.3159 23.3333 25.6667 14 25.6667C4.66663 25.6667 4.66663 23.3159 4.66663 20.4167C4.66663 17.5175 8.84563 15.1667 14 15.1667C19.1543 15.1667 23.3333 17.5175 23.3333 20.4167Z"
          stroke="black"
          stroke-width="1.5"
        />
      </g>
    </svg>
  );
};

export default OTPIcon;
