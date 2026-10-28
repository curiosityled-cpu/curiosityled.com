import React from "react";
import ReviewWorkspace from "@/components/reviews/ReviewWorkspace";

/**
 * Reviews tab inside Performance. Renders the unified cycle workspace so there is
 * one place for self/manager/peer tasks, cycle progress, calibration, and history.
 */
export default function ReviewsTabContent({ user }) {
  return <ReviewWorkspace embedded />;
}