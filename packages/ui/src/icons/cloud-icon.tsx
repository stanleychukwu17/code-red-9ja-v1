import { SVGProps } from "react";

const CloudIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g opacity="0.4">
        <path
          d="M16.125 8.36668C15.8451 6.94811 15.0813 5.67073 13.9642 4.75271C12.8471 3.8347 11.4459 3.33302 10 3.33334C7.59167 3.33334 5.5 4.70001 4.45833 6.70001C3.23353 6.83237 2.10084 7.41268 1.27791 8.32944C0.454976 9.24621 -0.000143085 10.4347 3.3744e-08 11.6667C3.3744e-08 14.425 2.24167 16.6667 5 16.6667H15.8333C18.1333 16.6667 20 14.8 20 12.5C20 10.3 18.2917 8.51668 16.125 8.36668Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};

export default CloudIcon;
