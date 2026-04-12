import Svg, { Path, type SvgProps } from 'react-native-svg';

export function SearchIcon(props: SvgProps) {
  return (
    <Svg
      width={16}
      height={17}
      viewBox="0 0 16 17"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}>
      <Path d="M11.262 11.3425L13.3154 13.3959M12.6667 7.72919C12.6667 9.05527 12.1399 10.327 11.2022 11.2647C10.2645 12.2024 8.99277 12.7292 7.66669 12.7292C6.3406 12.7292 5.06884 12.2024 4.13115 11.2647C3.19347 10.327 2.66669 9.05527 2.66669 7.72919C2.66669 6.4031 3.19347 5.13134 4.13115 4.19365C5.06884 3.25597 6.3406 2.72919 7.66669 2.72919C8.99277 2.72919 10.2645 3.25597 11.2022 4.19365C12.1399 5.13134 12.6667 6.4031 12.6667 7.72919Z" />
    </Svg>
  );
}
