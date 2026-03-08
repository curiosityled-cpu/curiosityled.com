import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ChevronRight } from "lucide-react";

export default function FirstTimeTooltips({ section }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const tooltipContent = {
    myExperiences: [
      {
        title: "Welcome to Your Learning Journey!",
        description: "This is your personal space to track all learning experiences assigned to you, including journeys, onboarding plans, and assessments.",
        position: "center"
      }
    ],
    teamExperiences: [
      {
        title: "Your Team's Development Hub",
        description: "Monitor your direct reports' progress across all learning experiences. Use this to identify who needs support and celebrate team wins.",
        position: "center"
      }
    ],
    experienceManagement: [
      {
        title: "Organizational Experience Administration",
        description: "Create and manage learning experiences for your entire organization. Use the tabs to access different tools:",
        position: "top"
      },
      {
        title: "Builders Tab",
        description: "Access all creation tools: Journey Builder, Onboarding Plans, Career Paths, and Custom Forms.",
        position: "center"
      },
      {
        title: "Requests Tab",
        description: "Manage development requests from across your organization. Assign, prioritize, and track progress.",
        position: "center"
      }
    ]
  };

  useEffect(() => {
    const storageKey = `first_time_${section}_tooltip`;
    const hasSeenTooltip = localStorage.getItem(storageKey);
    
    if (!hasSeenTooltip && tooltipContent[section]) {
      setShowTooltip(true);
    }
  }, [section]);

  const handleNext = () => {
    const content = tooltipContent[section];
    if (currentStep < content.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(`first_time_${section}_tooltip`, 'true');
    setShowTooltip(false);
    setCurrentStep(0);
  };

  if (!showTooltip || !tooltipContent[section]) return null;

  const content = tooltipContent[section][currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">{content.title}</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-gray-600 mb-6">{content.description}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {tooltipContent[section].map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 w-2 rounded-full ${
                    idx === currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
              {currentStep < tooltipContent[section].length - 1 ? (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                "Got it!"
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}