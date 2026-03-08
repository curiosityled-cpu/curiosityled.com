import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { 
  Play, 
  Plus, 
  BookOpen, 
  Target,
  BarChart3,
  MessageSquare,
  Sparkles
} from "lucide-react";
import SubNavMenu from "@/components/common/SubNavMenu";

export default function QuickActionsBar({ dashboardData, onOpenAtreus }) {
  const navigate = useNavigate();
  
  // Determine the most relevant action based on user's current state
  const hasActiveJourney = (dashboardData?.journeys?.in_progress_count || 0) > 0;
  const hasAssessment = dashboardData?.assessment?.latest_assessment_date;
  const hasActiveLearning = (dashboardData?.learning?.in_progress_count || 0) > 0;

  const actions = [
    {
      id: 'continue',
      label: hasActiveJourney ? 'Continue Journey' : hasActiveLearning ? 'Continue Learning' : 'Start Learning',
      icon: Play
    },
    {
      id: 'assessment',
      label: hasAssessment ? 'Retake Assessment' : 'Take Assessment',
      icon: BarChart3
    },
    {
      id: 'goal',
      label: 'New Goal',
      icon: Plus
    },
    {
      id: 'explore',
      label: 'Explore Library',
      icon: BookOpen
    }
  ];

  const handleActionClick = (actionId) => {
    switch (actionId) {
      case 'continue':
        navigate(hasActiveJourney ? createPageUrl('MyJourneys') : createPageUrl('MyLearning'));
        break;
      case 'assessment':
        navigate(createPageUrl('Assessments'));
        break;
      case 'goal':
        navigate(createPageUrl('Performance'));
        break;
      case 'explore':
        navigate(createPageUrl('LearningLibrary'));
        break;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="flex justify-end"
    >
      <SubNavMenu
        items={actions}
        activeId={actions[0].id}
        onItemClick={handleActionClick}
        variant="content"
        label="Quick Actions"
      />
    </motion.div>
  );
}