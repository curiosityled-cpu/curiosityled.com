import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Brain, TrendingUp, CheckCircle, Star, AlertTriangle, Zap } from "lucide-react";
import { motion } from "framer-motion";

const cards = [
  { id: 'totalUsers', label: 'Total Users', icon: Users, color: 'blue' },
  { id: 'avgSIScore', label: 'Avg SI Score', icon: Brain, color: 'purple', suffix: '%' },
  { id: 'benchStrength', label: 'Bench Strength', icon: TrendingUp, color: 'green', suffix: '%' },
  { id: 'readyNow', label: 'Ready Now', icon: CheckCircle, color: 'emerald' },
  { id: 'highPotential', label: 'High Potential', icon: Star, color: 'amber' },
  { id: 'atRiskOrganizations', label: 'At Risk Orgs', icon: AlertTriangle, color: 'red' },
  { id: 'pipelineStrength', label: 'Pipeline Strength', icon: Zap, color: 'indigo', suffix: '%' }
];

const colorMap = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'text-blue-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'text-purple-500' },
  green: { bg: 'bg-green-50', text: 'text-green-600', icon: 'text-green-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'text-emerald-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'text-amber-500' },
  red: { bg: 'bg-red-50', text: 'text-red-600', icon: 'text-red-500' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: 'text-indigo-500' }
};

export default function LeadershipIndexSummaryCards({ metrics, onCardClick }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const colors = colorMap[card.color];
        const value = metrics?.[card.id] ?? 0;

        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onCardClick?.(card.id)}
            >
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
                <div className={`text-2xl font-bold ${colors.text}`}>
                  {value.toLocaleString()}{card.suffix || ''}
                </div>
                <div className="text-xs text-gray-500 mt-1">{card.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}