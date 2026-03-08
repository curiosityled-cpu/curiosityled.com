import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, PlayCircle, RotateCcw } from "lucide-react";

export default function UATWelcomeModal({ 
  open, 
  onClose, 
  onStartTesting, 
  onResetProgress,
  uatCycle, 
  completedCount, 
  totalCount,
  hasProgress
}) {
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to UAT Testing</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Current UAT Cycle</h3>
            <Badge className="bg-blue-600 text-white">{uatCycle}</Badge>
          </div>

          <div>
            <h3 className="font-semibold mb-3">What is UAT Testing?</h3>
            <p className="text-gray-600 mb-3">
              User Acceptance Testing (UAT) helps us ensure the platform works correctly for all users. 
              You'll test features relevant to your role and report any issues you encounter.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Test features by following step-by-step instructions</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Report Pass/Fail with optional screenshots</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Navigate through tests sequentially (can revisit previous tests)</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>80% completion threshold to finish UAT</span>
              </li>
            </ul>
          </div>

          {hasProgress && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Your Progress</h3>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-full transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700">{completionPercentage}%</span>
              </div>
              <p className="text-sm text-gray-600">
                You've completed {completedCount} of {totalCount} tests
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button 
              onClick={onStartTesting}
              className="flex-1 gap-2"
              style={{ backgroundColor: '#0202ff' }}
            >
              <PlayCircle className="w-4 h-4" />
              {hasProgress ? 'Continue Testing' : 'Start Testing'}
            </Button>
            
            {hasProgress && (
              <Button 
                onClick={onResetProgress}
                variant="outline"
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Start Fresh
              </Button>
            )}
          </div>

          <p className="text-xs text-gray-500 text-center">
            You can exit and resume testing at any time. Your progress is saved automatically.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}