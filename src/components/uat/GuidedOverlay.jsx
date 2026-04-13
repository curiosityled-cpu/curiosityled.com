import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CheckCircle, HelpCircle, X, Target, MousePointer, Keyboard, Eye, Navigation } from "lucide-react";
import { createPageUrl } from "@/utils";

const getActionIcon = (actionType) => {
  switch (actionType) {
    case 'navigate': return <Navigation className="w-4 h-4" />;
    case 'click': return <MousePointer className="w-4 h-4" />;
    case 'input': return <Keyboard className="w-4 h-4" />;
    case 'verify': return <Eye className="w-4 h-4" />;
    case 'observe': return <Target className="w-4 h-4" />;
    default: return <Target className="w-4 h-4" />;
  }
};

export default function GuidedOverlay({ steps = [], onComplete, onSkip, onNeedHelp }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const highlightedElementRef = useRef(null);
  const navigatedStepsRef = useRef(new Set());
  const navigationTimeoutRef = useRef(null);

  // Handle steps array changes
  useEffect(() => {
    if (steps.length > 0 && currentStepIndex >= steps.length) {
      setCurrentStepIndex(steps.length - 1);
    }
  }, [steps.length, currentStepIndex]);

  // Validate steps
  const stepsInvalid = !steps || steps.length === 0;

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Handlers defined early so they can be used in effects
  const handleNext = () => {
    if (isLastStep) {
      if (typeof onComplete === 'function') {
        onComplete();
      } else {
        console.warn('onComplete is not a function');
      }
    } else {
      setCurrentStepIndex(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => Math.max(0, prev - 1));
    }
  };

  const handleSkip = () => {
    if (typeof onSkip === 'function') {
      onSkip();
    } else {
      console.warn('onSkip is not a function');
    }
  };

  const handleHelp = () => {
    if (typeof onNeedHelp === 'function') {
      onNeedHelp();
    } else {
      console.warn('onNeedHelp is not a function');
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' && currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(prev => Math.min(prev + 1, steps.length - 1));
      } else if (e.key === 'ArrowLeft' && currentStepIndex > 0) {
        setCurrentStepIndex(prev => Math.max(0, prev - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStepIndex, steps.length, handleSkip]);

  useEffect(() => {
    if (!currentStep) return;

    let isMounted = true;

    // Clear previous highlight safely
    if (highlightedElementRef.current) {
      try {
        const element = highlightedElementRef.current;
        element.style.outline = '';
        element.style.outlineOffset = '';
        element.style.boxShadow = '';
        element.style.zIndex = '';
        element.style.position = '';
      } catch (err) {
        console.warn('Failed to clear previous highlight:', err);
      }
      highlightedElementRef.current = null;
    }

    // Handle navigation action - only navigate once per step
    if (currentStep.action_type === 'navigate' && 
        currentStep.navigation_url && 
        !navigatedStepsRef.current.has(currentStepIndex)) {
      navigatedStepsRef.current.add(currentStepIndex);
      navigationTimeoutRef.current = setTimeout(() => {
        if (!isMounted) return;
        try {
          if (currentStep.navigation_url.trim()) {
            window.location.href = createPageUrl(currentStep.navigation_url);
          }
        } catch (error) {
          console.error('Navigation error in guided flow:', error);
        }
      }, 500);
    }
    
    // Highlight target element with retry logic
    if (currentStep.target_selector) {
      const timeoutIds = [];
      
      const attemptHighlight = (attempts = 0) => {
        try {
          const targetElement = document.querySelector(currentStep.target_selector);
          
          if (targetElement) {
            const id = setTimeout(() => {
              if (!isMounted) return;
              try {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetElement.style.outline = '3px solid #0202ff';
                targetElement.style.outlineOffset = '4px';
                targetElement.style.boxShadow = '0 0 0 4px rgba(2, 2, 255, 0.1)';
                targetElement.style.transition = 'all 0.3s';
                targetElement.style.zIndex = '55';
                targetElement.style.position = 'relative';
                highlightedElementRef.current = targetElement;
              } catch (err) {
                console.warn('Failed to highlight element:', err);
              }
            }, 100);
            timeoutIds.push(id);
          } else if (attempts < 10) {
            const id = setTimeout(() => {
              if (isMounted) {
                attemptHighlight(attempts + 1);
              }
            }, 100);
            timeoutIds.push(id);
          } else if (attempts >= 10) {
            console.warn(`Target element not found after 10 attempts: ${currentStep.target_selector}`);
          }
        } catch (err) {
          console.warn('Invalid selector or DOM error:', err);
        }
      };

      attemptHighlight();

      return () => {
        isMounted = false;
        if (navigationTimeoutRef.current) {
          clearTimeout(navigationTimeoutRef.current);
          navigationTimeoutRef.current = null;
        }
        timeoutIds.forEach(id => clearTimeout(id));
        if (highlightedElementRef.current) {
          try {
            highlightedElementRef.current.style.outline = '';
            highlightedElementRef.current.style.outlineOffset = '';
            highlightedElementRef.current.style.boxShadow = '';
            highlightedElementRef.current.style.zIndex = '';
            highlightedElementRef.current.style.position = '';
          } catch (err) {
            console.warn('Failed to clear highlight:', err);
          }
        }
      };
    }
  }, [currentStep, currentStepIndex]);

  if (stepsInvalid) {
    console.warn('GuidedOverlay: No steps provided');
    return null;
  }

  if (!currentStep) {
    console.warn('GuidedOverlay: Current step is undefined');
    return null;
  }

  return (
    <>
      {/* Semi-transparent backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
        onClick={handleSkip}
        aria-label="Guided test overlay backdrop (Press ESC to exit)"
        role="presentation"
      />

      {/* Floating guidance card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-lg px-4"
        role="dialog"
        aria-label="Guided test step instructions"
      >
        <Card className="shadow-2xl border-2" style={{ borderColor: '#0202ff' }}>
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#0202ff' }}>
                  {getActionIcon(currentStep.action_type)}
                </div>
                <div>
                  <Badge variant="outline" className="mb-1 text-xs">
                    Step {currentStepIndex + 1} of {steps.length}
                  </Badge>
                  <h3 className="font-semibold text-gray-900">
                    {currentStep.action_type ? currentStep.action_type.charAt(0).toUpperCase() + currentStep.action_type.slice(1) : 'Action Required'}
                  </h3>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                className="text-gray-400 hover:text-gray-600 -mt-2 -mr-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Step Description */}
            <div className="mb-6 space-y-3">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {currentStep.description}
                </p>
              </div>

              {currentStep.expected_value && (
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <p className="text-xs font-medium text-purple-900 mb-1">Expected Value:</p>
                  <p className="text-sm text-purple-700">
                    {currentStep.expected_value}
                  </p>
                </div>
              )}

              {currentStep.expected_result && (
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <p className="text-xs font-medium text-green-900 mb-1">Expected Result:</p>
                  <p className="text-sm text-green-700">
                    {currentStep.expected_result}
                  </p>
                </div>
              )}

              {currentStep.screenshot_guidance && (
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                  <p className="text-xs font-medium text-amber-900 mb-1">📸 Screenshot Guidance:</p>
                  <p className="text-sm text-amber-700">
                    {currentStep.screenshot_guidance}
                  </p>
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={handleHelp}
                className="flex-shrink-0"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Get Help
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isFirstStep}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  onClick={handleNext}
                  style={{ backgroundColor: '#0202ff' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
                >
                  {isLastStep ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Finish Test
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">Use ← → arrows to navigate, ESC to exit</p>
              </div>
              <div className="flex gap-1" role="progressbar" aria-valuenow={currentStepIndex + 1} aria-valuemin={1} aria-valuemax={steps.length} aria-label={`Test progress: Step ${currentStepIndex + 1} of ${steps.length}`}>
                {steps.map((_, idx) => (
                  <div
                    key={`progress-${idx}`}
                    className="h-1 flex-1 rounded-full transition-colors"
                    style={{
                      backgroundColor: idx <= currentStepIndex ? '#0202ff' : '#e5e7eb'
                    }}
                    aria-label={`Step ${idx + 1}${idx <= currentStepIndex ? ' completed' : ''}`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}