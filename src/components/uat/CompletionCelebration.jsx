import React, { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Trophy, PartyPopper } from "lucide-react";
import confetti from "canvas-confetti";

export default function CompletionCelebration({ 
  open, 
  onClose, 
  completedCount, 
  totalCount,
  passCount,
  failCount,
  blockedCount 
}) {
  useEffect(() => {
    if (open) {
      // Trigger confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#0202ff', '#10b981', '#3b82f6', '#8b5cf6']
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#0202ff', '#10b981', '#3b82f6', '#8b5cf6']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [open]);

  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <div className="text-center py-6">
          {/* Trophy Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full p-6 shadow-lg">
              <Trophy className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-2 text-gray-900">
            Congratulations! 🎉
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            You've completed {completionPercentage}% of UAT testing!
          </p>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div className="text-left">
                    <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
                    <p className="text-sm text-gray-600">Tests Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-3">
                  <PartyPopper className="w-8 h-8 text-blue-600" />
                  <div className="text-left">
                    <p className="text-2xl font-bold text-gray-900">{completionPercentage}%</p>
                    <p className="text-sm text-gray-600">Coverage</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold mb-3">Test Results Summary</h3>
            <div className="flex justify-center gap-6 text-sm">
              <div>
                <p className="text-2xl font-bold text-green-600">{passCount}</p>
                <p className="text-gray-600">Passed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{failCount}</p>
                <p className="text-gray-600">Failed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{blockedCount}</p>
                <p className="text-gray-600">Blocked</p>
              </div>
            </div>
          </div>

          {/* Thank You Message */}
          <div className="mb-6">
            <p className="text-gray-700">
              Thank you for your valuable contribution to improving the platform! 
              Your feedback helps us deliver a better experience for everyone.
            </p>
          </div>

          {/* Action Button */}
          <Button
            onClick={onClose}
            size="lg"
            className="gap-2"
            style={{ backgroundColor: '#0202ff' }}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}