import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, ArrowRight, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";

const severityConfig = {
  healthy: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', badge: 'bg-green-100 text-green-800' },
  warning: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-800' },
  critical: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', badge: 'bg-red-100 text-red-800' }
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus
};

export default function PlatformHealthPanel({ healthItems, onActionClick }) {
  if (!healthItems || healthItems.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Platform Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">No health metrics available</p>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = healthItems.filter(h => h.severity === 'critical').length;
  const warningCount = healthItems.filter(h => h.severity === 'warning').length;

  return (
    <Card className="border-0 shadow-lg h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Platform Health
          </CardTitle>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge className="bg-red-100 text-red-800">{criticalCount} Critical</Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-amber-100 text-amber-800">{warningCount} Warning</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {healthItems.map((item, index) => {
          const config = severityConfig[item.severity] || severityConfig.warning;
          const Icon = config.icon;
          const TrendIcon = trendIcons[item.trend] || Minus;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg ${config.bg} border border-gray-100`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${config.color}`} />
                  <span className="font-medium text-gray-900">{item.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendIcon className={`w-4 h-4 ${
                    item.trend === 'up' ? 'text-green-600' : 
                    item.trend === 'down' ? 'text-red-600' : 'text-gray-400'
                  }`} />
                  <Badge className={config.badge}>
                    {item.severity}
                  </Badge>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{item.description}</p>

              {item.metric !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900">
                    {typeof item.metric === 'number' ? item.metric.toLocaleString() : item.metric}
                    {item.metricSuffix || ''}
                  </span>
                  
                  {item.action && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => onActionClick?.(item)}
                    >
                      {item.action}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}