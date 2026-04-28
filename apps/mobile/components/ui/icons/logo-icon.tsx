import Svg, { G, Mask, Path, type SvgProps } from "react-native-svg";

const LogoIcon = ({
  stroke = "#fff",
  ...props
}: { stroke?: string } & SvgProps) => {
  return (
    <Svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      {...props}
    >
      <Mask
        id="mask0_634_12011"
        style={{ maskType: "luminance" }}
        maskUnits="userSpaceOnUse"
        x="2"
        y="2"
        width="29"
        height="28"
      >
        <Path
          d="M4 15.3333C1.30667 10.638 6.416 7.90933 9.33334 7.33333C19.0273 -1.22934 26.99 7.142 28 12.6667C29.0093 18.1913 28.772 22.5953 29.3333 24.6667C25.0247 18.8667 22.082 19.8947 21.3333 21.3333C19.9867 24.096 17.7907 24.168 16.6667 23.3333C13.9733 21.124 9.68267 25.468 8 28C11.2313 22.2 11.67 18.4847 11.3333 17.3333C9.98667 11.8093 5.79534 13.7227 4 15.3333Z"
          fill="white"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M15.3333 12C16.0697 12 16.6667 11.4031 16.6667 10.6667C16.6667 9.9303 16.0697 9.33334 15.3333 9.33334C14.597 9.33334 14 9.9303 14 10.6667C14 11.4031 14.597 12 15.3333 12Z"
          fill="black"
        />
      </Mask>
      <G mask="url(#mask0_634_12011)">
        <Path d="M0 0H32V32H0V0Z" fill="#24654B" />
      </G>
    </Svg>
  );
};

export { LogoIcon };
