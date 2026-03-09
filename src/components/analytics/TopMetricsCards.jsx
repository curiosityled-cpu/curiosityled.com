import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, Award, AlertTriangle, Target, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function TopMetricsCards({ metrics, onMetricClick }) {
  const cards = [
    {
      id: 'total_leaders',
      label: 'Total Leaders',
      value: metrics.total_leaders || 0,
      icon: Users,
      color: '',
      bg: '',
      customColor: '#0202ff',
      customBg: 'rgba(2, 2, 255, 0.05)',
      clickable: true
    },
    {
      id: 'avg_si_score',
      label: 'Avg SI Score',
      value: `${metrics.avg_si_score || 0}%`,
      icon: TrendingUp,
      color: '',
      bg: '',
      customColor: '#A25DDC',
      customBg: '#faf5ff',
      clickable: false
    },
    {
      id: 'bench_strength',
      label: 'Bench Strength',
      value: `${metrics.bench_strength || 0}%`,
      icon: Award,
      color: 'text-green-600',
      bg: 'bg-green-50',
      clickable: false
    },
    {
      id: 'ready_now',
      label: 'Ready Now',
      value: metrics.ready_now || 0,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      clickable: true
    },
    {
      id: 'high_potential',
      label: 'High Potential',
      value: metrics.high_potential || 0,
      icon: Target,
      color: '',
      bg: '',
      customColor: '#0202ff',
      customBg: 'rgba(2, 2, 255, 0.05)',
      clickable: true
    },
    {
      id: 'at_risk',
      label: 'At Risk Teams',
      value: metrics.at_risk || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      clickable: true
    },
    {
      id: 'pipeline_strength',
      label: 'Pipeline Strength',
      value: `${metrics.pipeline_strength || 0}%`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      clickable: false
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {cards.map((card, idx) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
        >
          <Card 
            className={`border-0 shadow-md ${card.clickable ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all' : ''}`}
            onClick={() => card.clickable && onMetricClick && onMetricClick(card.id)}
          >
            <CardContent className="p-4">
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-2`} style={card.customBg ? { backgroundColor: card.customBg } : {}}>
                <card.icon className={`w-5 h-5 ${card.color}`} style={card.customColor ? { color: card.customColor } : {}} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-600 mt-1">{card.label}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}