import Svg, { ClipPath, Defs, G, Mask, Path, Rect, type SvgProps } from "react-native-svg";

const CheckIcon = (props: SvgProps) => {
  return (
    <Svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      {...props}
    >
      <G clipPath="url(#clip0_923_8714)">
        <Mask
          id="mask0_923_8714"
          style={{ maskType: "luminance" }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="20"
          height="20"
        >
          <Path
            d="M10.0013 18.3333C11.0959 18.3347 12.1799 18.1197 13.1911 17.7009C14.2023 17.282 15.1208 16.6674 15.8938 15.8925C16.6687 15.1195 17.2833 14.201 17.7022 13.1898C18.1211 12.1786 18.336 11.0945 18.3346 10C18.336 8.90545 18.1211 7.82142 17.7022 6.8102C17.2833 5.79898 16.6687 4.88048 15.8938 4.1075C15.1208 3.33256 14.2023 2.718 13.1911 2.29913C12.1799 1.88025 11.0959 1.66531 10.0013 1.66666C8.90676 1.66531 7.82274 1.88025 6.81151 2.29913C5.80029 2.718 4.8818 3.33256 4.10881 4.1075C3.33388 4.88048 2.71932 5.79898 2.30044 6.8102C1.88156 7.82142 1.66663 8.90545 1.66798 10C1.66663 11.0945 1.88156 12.1786 2.30044 13.1898C2.71932 14.201 3.33388 15.1195 4.10881 15.8925C4.8818 16.6674 5.80029 17.282 6.81151 17.7009C7.82274 18.1197 8.90676 18.3347 10.0013 18.3333Z"
            fill="white"
            stroke="white"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <Path
            d="M6.66797 10L9.16797 12.5L14.168 7.5"
            stroke="black"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Mask>
        <G mask="url(#mask0_923_8714)">
          <Path d="M0 0H20V20H0V0Z" fill="#24654B" />
        </G>
      </G>
      <Defs>
        <ClipPath id="clip0_923_8714">
          <Rect width="20" height="20" fill="white" />
        </ClipPath>
      </Defs>
    </Svg>
  );
};

export { CheckIcon };
