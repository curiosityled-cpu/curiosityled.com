import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function ArchetypeProfileCard({ leadershipStyleProfile }) {
  if (!leadershipStyleProfile) return null;

  const { 
    primary_style, 
    style_description, 
    style_strengths = [], 
    style_development_areas = [],
    style_dimensions = {}
  } = leadershipStyleProfile;

  const dimensionIcons = {
    collaboration_orientation: Users,
    decision_speed: Zap,
    people_focus: Users,
    innovation_orientation: TrendingUp,
    stakeholder_approach: Users
  };

  const dimensionLabels = {
    collaboration_orientation: "Collaboration",
    decision_speed: "Decision Speed",
    people_focus: "People Focus",
    innovation_orientation: "Innovation",
    stakeholder_approach: "Stakeholder Approach"
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-xl">Your Leadership Archetype</CardTitle>
            <p className="text-sm text-gray-500">Based on your response patterns</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Primary Style */}
        {primary_style && (
          <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
            <h3 className="text-2xl font-bold text-purple-900 mb-2">{primary_style}</h3>
            {style_description && (
              <p className="text-gray-700 leading-relaxed">{style_description}</p>
            )}
          </div>
        )}

        {/* Style Dimensions */}
        {Object.keys(style_dimensions).length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Style Dimensions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(style_dimensions).map(([key, value]) => {
                const Icon = dimensionIcons[key] || Sparkles;
                const label = dimensionLabels[key] || key;
                
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">
                      {value}
                    </Badge>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Strengths */}
        {style_strengths.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Style Strengths</h4>
            <ul className="space-y-2">
              {style_strengths.map((strength, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                  {strength}
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {/* Development Areas */}
        {style_development_areas.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Development Considerations</h4>
            <ul className="space-y-2">
              {style_development_areas.map((area, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  {area}
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}