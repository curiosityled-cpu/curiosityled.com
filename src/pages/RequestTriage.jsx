import React from "react";
import CoachingRequestTriageBoard from "@/components/requests/CoachingRequestTriageBoard";

export default function RequestTriage() {
  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Request Triage</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Review, approve, and assign coaching & consulting requests.
        </p>
      </div>
      <CoachingRequestTriageBoard />
    </div>
  );
}