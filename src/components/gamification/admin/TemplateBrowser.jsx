import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Award, Target, Zap, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function TemplateBrowser() {
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const templates = [
    {
      id: "sales-gamification",
      name: "Sales Performance",
      description: "Boost sales team motivation with targets and rewards",
      icon: Target,
      features: ["Deal-closing badges", "Quarterly competitions", "Revenue milestones"],
      color: "from-green-500 to-emerald-600"
    },
    {
      id: "learning-engagement",
      name: "Learning Engagement",
      description: "Encourage continuous learning and skill development",
      icon: Award,
      features: ["Course completion badges", "Learning streaks", "Knowledge champions"],
      color: "from-blue-500 to-indigo-600"
    },
    {
      id: "leadership-development",
      name: "Leadership Excellence",
      description: "Recognize and develop leadership capabilities",
      icon: Trophy,
      features: ["Coaching milestones", "360 completion", "Team performance"],
      color: "from-purple-500 to-pink-600"
    },
    {
      id: "innovation-culture",
      name: "Innovation & Ideas",
      description: "Foster a culture of innovation and collaboration",
      icon: Zap,
      features: ["Idea submission", "Peer recognition", "Innovation challenges"],
      color: "from-yellow-500 to-orange-600"
    }
  ];

  const handleActivate = (template) => {
    toast.success(`${template.name} template activated! Configure it in the tabs above.`);
    setSelectedTemplate(template);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Gamification Templates</h2>
        <p className="text-gray-600">Quick-start templates to jumpstart your gamification strategy</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle>{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {template.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={() => handleActivate(template)}
                  className="w-full"
                  variant={selectedTemplate?.id === template.id ? "default" : "outline"}
                >
                  {selectedTemplate?.id === template.id ? "Activated" : "Activate Template"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Need a Custom Setup?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            Use our AI Assistant to generate a completely custom gamification structure tailored to your unique 
            organizational goals and culture.
          </p>
          <Button variant="outline">Go to AI Assistant</Button>
        </CardContent>
      </Card>
    </div>
  );
}