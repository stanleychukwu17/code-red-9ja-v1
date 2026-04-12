import Svg, { Path, type SvgProps } from "react-native-svg";

type LoadingCircleIconProps = SvgProps & {
  trackColor?: string;
  thumbColor?: string;
};

const LoadingCircleIcon = ({
  trackColor = "rgba(0, 0, 0, 0.3)",
  thumbColor = "#24654B",
  ...props
}: LoadingCircleIconProps) => {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M12 3C16.97 3 21 7.03 21 12"
        stroke={thumbColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 3C16.97 3 21 7.03 21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3Z"
        stroke={trackColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export { LoadingCircleIcon };
