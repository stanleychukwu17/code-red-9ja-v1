import Svg, { Path, type SvgProps } from "react-native-svg";

const FeedIcon = (props: SvgProps) => {
  return (
    <Svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <Path
        d="M3 10C3 6.229 3 4.343 4.172 3.172C5.344 2.001 7.229 2 11 2H13C16.771 2 18.657 2 19.828 3.172C20.999 4.344 21 6.229 21 10V14C21 17.771 21 19.657 19.828 20.828C18.656 21.999 16.771 22 13 22H11C7.229 22 5.343 22 4.172 20.828C3.001 19.656 3 17.771 3 14V10Z"
        stroke="black"
        strokeWidth="1.5"
      />
      <Path
        d="M6 12C6 10.586 6 9.879 6.44 9.44C6.878 9 7.585 9 9 9H15C16.414 9 17.121 9 17.56 9.44C18 9.879 18 10.586 18 12V16C18 17.414 18 18.121 17.56 18.56C17.121 19 16.414 19 15 19H9C7.586 19 6.879 19 6.44 18.56C6 18.122 6 17.415 6 16V12Z"
        stroke="black"
        strokeWidth="1.5"
      />
      <Path
        d="M7 6H12"
        stroke="black"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
};

export { FeedIcon };
