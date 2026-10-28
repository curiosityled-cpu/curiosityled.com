import React from "react";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import ReviewWorkspace from "@/components/reviews/ReviewWorkspace";

export default function Reviews() {
  return (
    <MVPPageLayout
      title="Reviews"
      subtitle="Your review, your team, and the whole cycle in one place"
    >
      <ReviewWorkspace embedded />
    </MVPPageLayout>
  );
}