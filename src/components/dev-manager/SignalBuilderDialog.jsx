import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2, X } from "lucide-react";
import SignalTypeSelector from "./SignalTypeSelector";
import SignalBuilder from "./SignalBuilder";
import { SIGNAL_TYPE_CONFIG } from "./signalTemplateConfig";

/**
 * SignalBuilderDialog — modal for creating or editing a Signal.
 * Two-step flow:
 *   1. Type selector (compact, only when creating)
 *   2. Full-screen visual builder (FormBuilderEditor + settings + AI Assist)
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

  const isBuilder = step === "builder" && selectedType;
  const typeLabel = selectedType ? SIGNAL_TYPE_CONFIG[selectedType]?.label : "";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent
        className={
          isBuilder
            ? "max-w-7xl w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] p-0 gap-0 overflow-hidden rounded-2xl"
            : "max-w-2xl max-h-[90vh] overflow-y-auto"
        }
      >
        {isBuilder ? (
          <div className="flex flex-col h-full">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {!editingSignal && (
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0" onClick={handleBack}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                )}
                <DialogTitle className="text-base font-semibold truncate">
                  {editingSignal ? `Edit ${typeLabel}` : `New ${typeLabel}`}
                </DialogTitle>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={handleClose}>
                  <X className="w-4 h-4 mr-1.5" />
                  Cancel
                </Button>
                <Button onClick={handleSaveClick} disabled={saving} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {saving ? "Saving…" : editingSignal ? "Update Signal" : "Create Signal"}
                </Button>
              </div>
            </div>

            {/* Builder body */}
            <div className="flex-1 min-h-0 p-4 overflow-hidden">
              <SignalBuilder
                ref={formRef}
                signalType={selectedType}
                editingSignal={editingSignal}
                onClose={handleFormClose}
                users={users}
                showChrome={false}
              />
            </div>
          </div>
        ) : (
          <>
            <DialogTitle className="text-base font-semibold">Create a Signal</DialogTitle>
            <div className="mt-2">
              <SignalTypeSelector onSelect={handleTypeSelect} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}