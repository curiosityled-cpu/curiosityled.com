import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Map, 
  Target, 
  FileText, 
  BarChart3, 
  GitBranch, 
  Plus,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/useAuth";

export default function BuildersHub() {
  const { hasPermission } = useAuth();

  const builders = [
    {
      id: 'journey',
      title: 'Learning Journey Builder',
      description: 'Create structured learning paths and curricula for development',
      icon: Map,
      color: 'blue',
      link: 'JourneyBuilder',
      permission: 'experiences.create_journey'
    },
    {
      id: 'onboarding',
      title: 'Onboarding Plan Builder',
      description: 'Build personalized onboarding experiences for new hires',
      icon: Target,
      color: 'purple',
      link: 'OnboardingPlanBuilder',
      permission: 'experiences.create_onboarding'
    },
    {
      id: 'forms',
      title: 'Custom Forms',
      description: 'Design custom forms, surveys, and data collection tools',
      icon: FileText,
      color: 'orange',
      link: 'FormBuilderDashboard',
      permission: 'experiences.create_forms'
    },
    {
      id: 'assessments',
      title: 'Assessment Builder',
      description: 'Create custom assessments and knowledge checks',
      icon: BarChart3,
      color: 'green',
      link: 'CustomAssessmentBuilder',
      permission: 'experiences.create_assessments'
    },
    {
      id: 'careerpath',
      title: 'Career Path Creator',
      description: 'Define roles, competencies, and progression paths',
      icon: GitBranch,
      color: 'indigo',
      link: 'CareerPathCreator',
      permission: 'experiences.manage_org'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', hover: 'hover:bg-blue-700', button: 'bg-blue-600' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', hover: 'hover:bg-purple-700', button: 'bg-purple-600' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600', hover: 'hover:bg-orange-700', button: 'bg-orange-600' },
      green: { bg: 'bg-green-100', text: 'text-green-600', hover: 'hover:bg-green-700', button: 'bg-green-600' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', hover: 'hover:bg-indigo-700', button: 'bg-indigo-600' }
    };
    return colors[color] || colors.blue;
  };

  const availableBuilders = builders.filter(builder => hasPermission(builder.permission));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Experience Builders</h2>
        <p className="text-gray-600">Create and customize learning experiences for your organization</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableBuilders.map((builder, index) => {
          const Icon = builder.icon;
          const colors = getColorClasses(builder.color);

          return (
            <motion.div
              key={builder.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={createPageUrl(builder.link)}>
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full">
                    <div className={`w-16 h-16 rounded-full ${colors.bg} flex items-center justify-center mb-4`}>
                      <Icon className={`w-8 h-8 ${colors.text}`} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {builder.title}
                    </h3>
                    <p className="text-gray-600 mb-4 flex-1">
                      {builder.description}
                    </p>
                    <Button className={`${colors.button} ${colors.hover}`}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {availableBuilders.length === 0 && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Builders Available</h3>
            <p className="text-gray-600">
              You don't have permission to access experience builders.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}