import React from "react";
import ManagerOfManagersView from "@/components/command/ManagerOfManagersView";

const TeamDashboardCard = React.memo(({ teamData, loading }) => {
  // Render the full ManagerOfManagersView component for Team Dashboard
  return <ManagerOfManagersView />;
});

TeamDashboardCard.displayName = 'TeamDashboardCard';

export default TeamDashboardCard;