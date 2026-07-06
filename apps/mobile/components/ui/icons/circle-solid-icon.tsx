import Svg, { Circle, type SvgProps } from "react-native-svg";

const CircleSolidIcon = (props: SvgProps) => {
  return (
    <Svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      {...props}
    >
      <Circle cx="10" cy="10" r="10" fill="currentColor" />
    </Svg>
  );
};

export { CircleSolidIcon };
