import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User, Users, Settings, ChevronRight } from "lucide-react";
import { useAuth } from "@/components/useAuth";

export default function ExperiencesNav({ className = "" }) {
  const { hasPermission } = useAuth();

  const navItems = [
    { 
      name: 'My Experiences', 
      path: createPageUrl('MyExperiences'),
      icon: User,
      show: hasPermission('experiences.view_personal'),
      description: 'Your personal learning journey'
    },
    { 
      name: 'Team Experiences', 
      path: createPageUrl('TeamExperiences'),
      icon: Users,
      show: hasPermission('experiences.view_team'),
      description: 'Your team\'s development'
    },
    { 
      name: 'Experience Management', 
      path: createPageUrl('ExperienceManagement'),
      icon: Settings,
      show: hasPermission('experiences.manage_org'),
      description: 'Organizational administration'
    }
  ].filter(item => item.show);

  if (navItems.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            to={item.path}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-blue-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900 group-hover:text-blue-600">{item.name}</p>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
          </Link>
        );
      })}
    </div>
  );
}