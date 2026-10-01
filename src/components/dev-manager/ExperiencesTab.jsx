import React, { useState } from "react";
import { motion } from "framer-motion";
import { Map, GraduationCap, Star, Dumbbell } from "lucide-react";
import AdminJourneysTab from "@/components/experience-mgmt/AdminJourneysTab";
import AdminLearningManagementTab from "@/components/experience-mgmt/AdminLearningManagementTab";
import AdminExperiencesTab from "@/components/experience-mgmt/AdminExperiencesTab";
import PracticeHubTab from "@/components/practice/PracticeHubTab";

const SUB_SECTIONS = [
  { id: 'journeys', label: 'Journeys', icon: Map },
  { id: 'learning', label: 'Learning', icon: GraduationCap },
  { id: 'experiences', label: 'External', icon: Star },
  { id: 'practice', label: 'Practice', icon: Dumbbell },
];

export default function ExperiencesTab({ user, coacheeEmails }) {
  const [subSection, setSubSection] = useState('journeys');

  return (
    <div className="space-y-4">
      {/* Sub-section toggle */}
      <div className="flex gap-1 bg-gray-50 border border-gray-100 rounded-xl p-1 w-fit overflow-x-auto">
        {SUB_SECTIONS.map(sub => {
          const Icon = sub.icon;
          return (
            <button
              key={sub.id}
              onClick={() => setSubSection(sub.id)}
              className={`flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-lg transition-all whitespace-nowrap ${
                subSection === sub.id
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {sub.label}
            </button>
          );
        })}
      </div>

      <motion.div
        key={subSection}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {subSection === 'journeys' && <AdminJourneysTab user={user} coacheeEmails={coacheeEmails} />}
        {subSection === 'learning' && <AdminLearningManagementTab user={user} />}
        {subSection === 'experiences' && <AdminExperiencesTab user={user} coacheeEmails={coacheeEmails} />}
        {subSection === 'practice' && <PracticeHubTab user={user} />}
      </motion.div>
    </div>
  );
}