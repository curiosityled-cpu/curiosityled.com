import React from "react";
import LandingNav from "@/components/landing/LandingNav";

/**
 * The Journal uses the same upper navigation as the rest of the public site,
 * so visitors see one persistent menu everywhere. The spacer keeps the page
 * content clear of the fixed nav while preserving each page's own top spacing.
 */
export default function BlogHeader() {
  return (
    <>
      <LandingNav />
      <div className="h-16" aria-hidden="true" />
    </>
  );
}