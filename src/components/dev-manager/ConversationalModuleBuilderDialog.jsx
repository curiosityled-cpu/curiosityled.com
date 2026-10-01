import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import ConversationalModuleBuilderForm from "./ConversationalModuleBuilderForm";

/**
 * ConversationalModuleBuilderDialog — opens the Conversational Learning Module
 * builder as a modal popup (matching the Add Resource pattern in the Content
 * Library tab) instead of navigating to a separate page.
 *
 * Props:
 *   open     — controlled open state
 *   onClose  — callback to close the dialog
 *   moduleId — optional existing module ID to edit (null/undefined = new module)
 *   onSaved  — callback invoked after a successful save
 */
export default function ConversationalModuleBuilderDialog({ open, onClose, moduleId, onSaved }) {
  const formRef = useRef(null);
  const [saving, setSaving] = useState(false);

  const handleSaveClick = async () => {
    setSaving(true);
    try {
      await formRef.current?.save();
    } finally {
      setSaving(false);
    }
  };

  const handleFormSaved = (saved) => {
    onSaved?.(saved);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{moduleId ? "Edit Conversational Module" : "New Conversational Module"}</DialogTitle>
        </DialogHeader>
        <ConversationalModuleBuilderForm
          ref={formRef}
          moduleId={moduleId}
          onSaved={handleFormSaved}
        />
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveClick} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? "Saving..." : moduleId ? "Save Changes" : "Create Module"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}