import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Save, Loader2, X } from "lucide-react";
import CourseBuilder from "./CourseBuilder";

/**
 * CourseBuilderDialog — full-screen modal for creating or editing a Course.
 *
 * Props:
 *   open          — controlled open state
 *   onClose       — callback to close the dialog
 *   editingCourse — optional course object to edit (null = create new)
 *   clientId      — current user's client_id for tenant scoping
 *   onSaved       — callback after successful save (closes dialog)
 */
export default function CourseBuilderDialog({ open, onClose, editingCourse, clientId, onSaved }) {
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);

  const handleSaveClick = async () => {
    setSaving(true);
    try {
      await formRef.current?.save();
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-7xl w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] p-0 gap-0 overflow-hidden rounded-2xl flex flex-col">
        <div className="flex flex-col h-full">
          {/* Header bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
            <DialogTitle className="text-base font-semibold truncate">
              {editingCourse ? "Edit Course" : "New Course"}
            </DialogTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={handleClose}>
                <X className="w-4 h-4 mr-1.5" />
                Cancel
              </Button>
              <Button onClick={handleSaveClick} disabled={saving} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {saving ? "Saving…" : editingCourse ? "Update Course" : "Create Course"}
              </Button>
            </div>
          </div>

          {/* Builder body */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <CourseBuilder
              ref={formRef}
              editingCourse={editingCourse}
              clientId={clientId}
              onClose={onClose}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}