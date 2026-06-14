import { SVGProps } from "react";

const FancyFolderIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M16.668 4.37516H9.16797L7.5013 2.7085H3.33464C2.41797 2.7085 1.66797 3.4585 1.66797 4.37516V7.7085H18.3346V6.04183C18.3346 5.12516 17.5846 4.37516 16.668 4.37516Z"
        fill="#FFA000"
      />
      <path
        d="M16.668 4.375H3.33464C2.41797 4.375 1.66797 5.125 1.66797 6.04167V14.375C1.66797 15.2917 2.41797 16.0417 3.33464 16.0417H16.668C17.5846 16.0417 18.3346 15.2917 18.3346 14.375V6.04167C18.3346 5.125 17.5846 4.375 16.668 4.375Z"
        fill="#FFCA28"
      />
    </svg>
  );
};

export default FancyFolderIcon;
