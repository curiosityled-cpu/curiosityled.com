import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertCircle } from "lucide-react";

/**
 * AtreusPreSubmitModal
 * Shows before request submission if the request looks vague.
 * Offers to refine with Atreus or submit anyway.
 */
export default function AtreusPreSubmitModal({ open, onRefine, onSubmitAnyway, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Before you submit this...
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Atreus can help clarify what you're actually trying to solve so you get better results.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium">Your request might be clearer</p>
            <p className="text-xs mt-1">A quick refinement can help ensure you get exactly what you need.</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onSubmitAnyway}
          >
            Submit Anyway
          </Button>
          <Button
            type="button"
            onClick={onRefine}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Refine with Atreus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}