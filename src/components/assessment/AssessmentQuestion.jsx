import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function AssessmentQuestion({ question, selectedOption, onSelect }) {
  if (!question) return null;

  const handleOptionSelect = (option) => {
    const proficiencyValue = question.options.find(opt => opt.label === option)?.proficiency_level;
    onSelect(option, proficiencyValue);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card className="border-0 shadow-lg">
        <CardHeader>
          {question.scenario_text && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Scenario:</p>
              <p className="text-sm text-blue-800 leading-relaxed">
                {question.scenario_text}
              </p>
            </div>
          )}
          <CardTitle className="text-xl leading-relaxed">
            {question.question_text}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {question.options.map((option, idx) => {
            const isSelected = selectedOption === option.label;
            
            return (
              <motion.button
                key={option.label}
                onClick={() => handleOptionSelect(option.label)}
                className={`w-full text-left p-5 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50 shadow-md'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                    isSelected
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {option.label}
                  </div>
                  <p className={`text-sm leading-relaxed ${
                    isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'
                  }`}>
                    {option.value}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}