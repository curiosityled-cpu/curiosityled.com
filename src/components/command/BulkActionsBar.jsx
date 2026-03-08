import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, BookOpen, Target, Mail, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function BulkActionsBar({ 
  selectedCount, 
  onClearSelection,
  onBulkAssignLearning,
  onBulkCreateGoals,
  onBulkSendNudge,
  onBulkSchedule1on1s
}) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40"
        >
          <Card className="shadow-2xl border-2 border-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600 text-white text-base px-3 py-1">
                    {selectedCount} selected
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClearSelection}
                    className="h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="h-8 w-px bg-gray-300"></div>

                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onBulkAssignLearning}
                    className="gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    Assign Learning
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onBulkCreateGoals}
                    className="gap-2"
                  >
                    <Target className="w-4 h-4" />
                    Create Goals
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onBulkSendNudge}
                    className="gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Send Nudge
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onBulkSchedule1on1s}
                    className="gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Schedule 1:1s
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}