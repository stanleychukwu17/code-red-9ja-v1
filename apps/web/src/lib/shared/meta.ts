import { APP_NAME } from "../config";

/**
 * Returns the page header object for tanstack-start meta prop in the page layout.
 * @param {Object} props - The properties for the page header.
 * @param {string} props.title - The title of the page.
 * @param {string} [props.robotsAllowed="yes"] - The robots directive for search engines.
 * @returns {Object} The page header object.
*/
export type GetPageHeaderProps = {
  title: string;
  robotsAllowed?: "yes" | "no";
};
export function getPageHeader ({title, robotsAllowed = "yes"}: GetPageHeaderProps) {
  // Returns the page header object for tanstack-start meta prop in the page layout.
  return {
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: `${title} - ${APP_NAME}` },
      { name: "robots", content: robotsAllowed === "yes" ? "index, follow" : "noindex, nofollow" }
    ]
  }
}
