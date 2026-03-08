import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, Circle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function WorkflowProgressIndicator({ 
  workflowType, 
  currentStep, 
  totalSteps, 
  collectedParameters = {},
  requiredParameters = []
}) {
  if (!workflowType) return null;

  const progressPercentage = Math.round(((currentStep + 1) / totalSteps) * 100);
  
  const formatWorkflowName = (type) => {
    return type
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const completedParams = Object.keys(collectedParameters).length;
  const totalParams = completedParams + requiredParameters.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          <span className="text-sm font-semibold text-blue-900">
            {formatWorkflowName(workflowType)} in Progress
          </span>
        </div>
        <span className="text-xs text-blue-700 font-medium">
          Step {currentStep + 1} of {totalSteps}
        </span>
      </div>

      <Progress value={progressPercentage} className="h-2 mb-3" />

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full ${
                  idx < currentStep + 1 ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
        
        {totalParams > 0 && (
          <div className="text-xs text-blue-700">
            <span className="font-medium">{completedParams}/{totalParams}</span> details collected
          </div>
        )}
      </div>

      {requiredParameters.length > 0 && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-xs text-blue-800 mb-2">Still needed:</p>
          <div className="flex flex-wrap gap-1">
            {requiredParameters.map((param, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-1 bg-white border border-blue-300 rounded text-blue-900"
              >
                {param.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}