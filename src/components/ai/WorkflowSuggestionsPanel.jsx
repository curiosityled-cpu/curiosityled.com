import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  CheckCircle, 
  Calendar, 
  Mail, 
  Target, 
  BookOpen, 
  AlertTriangle,
  Users,
  TrendingUp,
  X
} from "lucide-react";

export default function WorkflowSuggestionsPanel({ suggestions, onSelectSuggestion, onDismiss }) {
  if (!suggestions || suggestions.length === 0) return null;

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'onboarding': return <CheckCircle className="w-4 h-4" />;
      case 'assessment': return <TrendingUp className="w-4 h-4" />;
      case 'learning': return <BookOpen className="w-4 h-4" />;
      case 'communication': return <Mail className="w-4 h-4" />;
      case 'calendar': return <Calendar className="w-4 h-4" />;
      case 'goals': return <Target className="w-4 h-4" />;
      case 'intervention': return <AlertTriangle className="w-4 h-4" />;
      case 'tracking': return <TrendingUp className="w-4 h-4" />;
      case 'career': return <Users className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="mb-4"
      >
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 shadow-lg">
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-600">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900">✨ Smart Next Steps</h4>
                  <p className="text-xs text-gray-600">Continue your workflow with these suggestions</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDismiss}
                className="h-6 w-6 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>

            <div className="space-y-2">
              {suggestions.map((suggestion, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${getPriorityColor(suggestion.priority)} hover:shadow-md transition-all cursor-pointer group`}
                  onClick={() => onSelectSuggestion(suggestion)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getCategoryIcon(suggestion.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-semibold text-sm text-gray-900">{suggestion.title}</h5>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] px-1.5 py-0 ${
                          suggestion.priority === 'high' ? 'border-red-300 text-red-700' :
                          suggestion.priority === 'medium' ? 'border-orange-300 text-orange-700' :
                          'border-blue-300 text-blue-700'
                        }`}
                      >
                        {suggestion.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-700">{suggestion.description}</p>
                  </div>
                  <Button
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-purple-600 hover:bg-purple-700 text-white text-xs h-7"
                  >
                    Execute
                  </Button>
                </motion.div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-purple-200">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Click any suggestion to execute, or dismiss to continue the conversation
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}