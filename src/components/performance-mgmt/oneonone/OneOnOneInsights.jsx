import React from "react";
import CheckInInsightsExplorer from "@/components/checkin/CheckInInsightsExplorer";

export default function OneOnOneInsights({ user, teamMembers = [], isEmployee = false }) {
  return (
    <CheckInInsightsExplorer
      scope="team"
      title="Team Check-in Insights"
      subtitle="Insights derived from the actual questions asked in daily check-ins. As questions change, insights update — but historical data is always preserved for filtering and reporting."
    />
  );
}