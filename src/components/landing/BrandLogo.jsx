import React from "react";

// The Curiosity Led wordmark, in the two colours the site uses.
export const BRAND_LOGO_LIGHT =
  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/a426953be_CuriosityLedLogoBBW.png";
export const BRAND_LOGO_WHITE =
  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/5b84a7869_CuriosityLedLogoWBB.png";

/**
 * One logo, one size, everywhere on the public site.
 * Every landing page, blog, article and legal page renders this component so the
 * wordmark can never drift in size from one page to the next.
 */
export const BRAND_LOGO_CLASS = "h-14 md:h-16 w-auto object-contain";

export default function BrandLogo({
  white = false,
  className = BRAND_LOGO_CLASS,
  alt = "Curiosity Led",
}) {
  return <img src={white ? BRAND_LOGO_WHITE : BRAND_LOGO_LIGHT} alt={alt} className={className} />;
}