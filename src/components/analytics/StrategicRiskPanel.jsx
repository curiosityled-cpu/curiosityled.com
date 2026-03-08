import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Brain, ChevronRight, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function StrategicRiskPanel({ riskAreas, onRiskClick, onAIAssistantClick }) {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return '';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-5 h-5" style={{ color: '#0202ff' }} />;
    }
  };

  if (!riskAreas || riskAreas.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-green-600" />
            Strategic Risk Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">No Critical Risks Detected</h3>
            <p className="text-sm text-gray-600">
              Your organization is performing well across key metrics.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Strategic Risk Areas
        </CardTitle>
        <p className="text-sm text-gray-600">
          {riskAreas.length} risk{riskAreas.length !== 1 ? 's' : ''} requiring attention
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {riskAreas.map((risk, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="border rounded-lg hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="mt-0.5">
                    {getSeverityIcon(risk.severity)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 flex-1">{risk.title}</h4>
                      <Badge className={getSeverityColor(risk.severity)} style={risk.severity === 'low' ? { backgroundColor: 'rgba(2, 2, 255, 0.1)', color: '#0202ff', borderColor: 'rgba(2, 2, 255, 0.3)' } : {}}>
                        {risk.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{risk.description}</p>
                    
                    {risk.affected_count > 0 && (
                      <p className="text-xs text-gray-500 mb-3">
                        Affects {risk.affected_count} leader{risk.affected_count !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRiskClick && onRiskClick(risk);
                    }}
                    className="text-xs"
                  >
                    View Leaders
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAIAssistantClick && onAIAssistantClick(risk);
                    }}
                    className="text-xs text-white"
                    style={{ background: 'linear-gradient(to right, #10b981, #0202ff)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #059669, #0101dd)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #10b981, #0202ff)'}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Strategic Assistant
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(2, 2, 255, 0.05)', borderWidth: '1px', borderColor: 'rgba(2, 2, 255, 0.2)' }}>
          <p className="text-xs" style={{ color: '#0202ff' }}>
            <strong>💡 Tip:</strong> Use the Strategic Assistant to generate comprehensive action plans 
            and implementation roadmaps for addressing these risks.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}