import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Send } from "lucide-react";

/**
 * Lightweight pre-submit confirmation modal.
 * Shown when the request looks vague or high-priority.
 * Lets the user either refine with Atreus or submit anyway.
 */
export default function AtreusPreSubmitModal({ open, onRefine, onSubmitAnyway }) {
  return (
    <Dialog open={open} onOpenChange={onSubmitAnyway}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#A25DDC20' }}>
              <Sparkles className="w-4 h-4" style={{ color: '#A25DDC' }} />
            </div>
            <DialogTitle className="text-lg">One moment before you submit</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600 leading-relaxed">
            Before you submit this, Atreus can help clarify the outcome — making it easier for your team to action quickly and accurately.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-purple-50 border border-purple-100 rounded-lg px-4 py-3 text-sm text-purple-800 space-y-1">
          <p className="font-medium">Atreus will help you clarify:</p>
          <ul className="list-disc list-inside text-purple-700 space-y-0.5 text-xs">
            <li>The real problem you're solving</li>
            <li>Desired outcome and success criteria</li>
            <li>Whether the urgency is accurately set</li>
            <li>Recommended next step</li>
          </ul>
        </div>

        <div className="flex gap-3 mt-2">
          <Button
            onClick={onRefine}
            className="flex-1 text-white"
            style={{ backgroundColor: '#A25DDC' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9147cc'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#A25DDC'}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Refine with Atreus
          </Button>
          <Button
            onClick={onSubmitAnyway}
            variant="outline"
            className="flex-1"
          >
            <Send className="w-4 h-4 mr-2" />
            Submit Anyway
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}