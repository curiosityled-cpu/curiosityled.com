import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import SignalTypeSelector from "./SignalTypeSelector";
import SignalBuilder from "./SignalBuilder";

/**
 * SignalBuilderDialog — modal popup for creating or editing a Signal.
 * Two-step flow inside a single dialog:
 *   1. Type selector (only when creating, not editing)
 *   2. Builder form
 *
 * Props:
 *   open          — controlled open state
 *   onClose       — callback to close the dialog
 *   editingSignal — optional signal object to edit (null = create new)
 *   users         — user list for assignment
 *   onSaved       — callback after successful save (closes dialog)
 */
export default function SignalBuilderDialog({ open, onClose, editingSignal, users, onSaved }) {
  const [step, setStep] = useState(editingSignal ? "builder" : "selector");
  const [selectedType, setSelectedType] = useState(editingSignal?.signalType || null);
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setStep("builder");
  };

  const handleSaveClick = async () => {
    setSaving(true);
    try {
      await formRef.current?.save();
    } finally {
      setSaving(false);
    }
  };

  const handleFormClose = () => {
    onSaved?.();
    onClose?.();
  };

  const handleBack = () => {
    setStep("selector");
    setSelectedType(null);
  };

  const handleClose = () => {
    setStep(editingSignal ? "builder" : "selector");
    setSelectedType(editingSignal?.signalType || null);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step === "builder" && !editingSignal && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <DialogTitle>
              {step === "selector" ? "Create a Signal" : editingSignal ? "Edit Signal" : "New Signal"}
            </DialogTitle>
          </div>
        </DialogHeader>

        {step === "selector" && (
          <SignalTypeSelector onSelect={handleTypeSelect} />
        )}

        {step === "builder" && selectedType && (
          <SignalBuilder
            ref={formRef}
            signalType={selectedType}
            editingSignal={editingSignal}
            onClose={handleFormClose}
            users={users}
            showChrome={false}
          />
        )}

        {step === "builder" && (
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSaveClick} disabled={saving} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {saving ? "Saving..." : editingSignal ? "Update Signal" : "Create Signal"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}