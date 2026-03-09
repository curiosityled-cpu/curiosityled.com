import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ChevronRight, Target, X, MessageCircle } from "lucide-react";

export default function GuidedNavigation({ steps, onComplete, onSkip, onNeedHelp }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps.length / totalSteps) * 100;

  useEffect(() => {
    if (currentStep?.target_selector) {
      highlightElement(currentStep.target_selector);
    }
    return () => clearHighlight();
  }, [currentStep]);

  const highlightElement = (selector) => {
    setTimeout(() => {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.style.outline = '3px solid #0202ff';
        element.style.outlineOffset = '4px';
        element.style.boxShadow = '0 0 0 4px rgba(2, 2, 255, 0.1)';
        element.style.transition = 'all 0.3s';
        element.style.zIndex = '9999';
        element.style.position = 'relative';
      }
    }, 300);
  };

  const clearHighlight = () => {
    const elements = document.querySelectorAll('[style*="outline"]');
    elements.forEach(el => {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.boxShadow = '';
      el.style.zIndex = '';
    });
  };

  const handleNext = () => {
    setCompletedSteps([...completedSteps, currentStepIndex]);
    
    if (currentStepIndex + 1 >= totalSteps) {
      clearHighlight();
      onComplete();
    } else {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleSkipAll = () => {
    clearHighlight();
    onSkip();
  };

  const getPosition = () => {
    if (!currentStep?.target_selector) {
      return { top: '20%', left: '50%', transform: 'translate(-50%, 0)' };
    }

    const element = document.querySelector(currentStep.target_selector);
    if (!element) {
      return { top: '20%', left: '50%', transform: 'translate(-50%, 0)' };
    }

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Position below element if there's room, otherwise above
    if (rect.bottom + 200 < viewportHeight) {
      return {
        top: rect.bottom + 16,
        left: rect.left + (rect.width / 2),
        transform: 'translateX(-50%)'
      };
    } else {
      return {
        top: rect.top - 16,
        left: rect.left + (rect.width / 2),
        transform: 'translate(-50%, -100%)'
      };
    }
  };

  return (
    <>
      {/* Semi-transparent backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
        onClick={handleSkipAll}
      />

      {/* Floating guidance card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed z-[110] bg-white rounded-xl shadow-2xl border-2 max-w-md"
        style={{ ...getPosition(), borderColor: '#0202ff' }}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ backgroundColor: '#0202ff' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-white">
                  Step {currentStepIndex + 1} of {totalSteps}
                </h4>
                <p className="text-xs text-white/80">
                  {completedSteps.length} completed
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipAll}
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pt-3">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full"
              style={{ backgroundColor: '#0202ff' }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h5 className="font-semibold text-gray-900 mb-2">
            {currentStep.instruction}
          </h5>
          {currentStep.expected_result && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <p className="text-xs font-medium text-blue-900 mb-1">Expected Result:</p>
              <p className="text-sm text-blue-800">{currentStep.expected_result}</p>
            </div>
          )}
          {currentStep.screenshot_guidance && (
            <p className="text-xs text-gray-500 italic mb-3">
              📸 {currentStep.screenshot_guidance}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onNeedHelp}
            className="gap-2"
          >
            <MessageCircle className="w-3 h-3" />
            Need Help
          </Button>
          
          <div className="flex gap-2">
            {currentStepIndex > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
              >
                Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
              style={{ backgroundColor: '#0202ff' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
              className="gap-2"
            >
              {currentStepIndex + 1 >= totalSteps ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Complete Test
                </>
              ) : (
                <>
                  Done
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}