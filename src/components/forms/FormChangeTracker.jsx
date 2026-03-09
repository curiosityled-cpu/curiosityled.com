import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Plus, Minus, Edit } from "lucide-react";

export default function FormChangeTracker({ form, originalForm }) {
  const [changes, setChanges] = useState([]);

  useEffect(() => {
    if (originalForm && form && form.id === originalForm.id) {
      detectChanges();
    }
  }, [form, originalForm]);

  const detectChanges = () => {
    const detectedChanges = [];

    // Check title
    if (form.title !== originalForm.title) {
      detectedChanges.push({
        type: "edit",
        field: "Title",
        old: originalForm.title,
        new: form.title
      });
    }

    // Check description
    if (form.description !== originalForm.description) {
      detectedChanges.push({
        type: "edit",
        field: "Description",
        old: originalForm.description,
        new: form.description
      });
    }

    // Check sections
    const oldSections = originalForm.config?.sections || [];
    const newSections = form.config?.sections || [];

    if (newSections.length > oldSections.length) {
      detectedChanges.push({
        type: "add",
        field: "Sections",
        new: `${newSections.length - oldSections.length} section(s) added`
      });
    } else if (newSections.length < oldSections.length) {
      detectedChanges.push({
        type: "remove",
        field: "Sections",
        old: `${oldSections.length - newSections.length} section(s) removed`
      });
    }

    // Check questions
    const oldQuestions = oldSections.flatMap(s => s.questions || []);
    const newQuestions = newSections.flatMap(s => s.questions || []);

    if (newQuestions.length > oldQuestions.length) {
      detectedChanges.push({
        type: "add",
        field: "Questions",
        new: `${newQuestions.length - oldQuestions.length} question(s) added`
      });
    } else if (newQuestions.length < oldQuestions.length) {
      detectedChanges.push({
        type: "remove",
        field: "Questions",
        old: `${oldQuestions.length - newQuestions.length} question(s) removed`
      });
    }

    // Check scoring config
    const oldScoring = originalForm.config?.scoring_config?.enabled;
    const newScoring = form.config?.scoring_config?.enabled;
    if (oldScoring !== newScoring) {
      detectedChanges.push({
        type: "edit",
        field: "Auto-Scoring",
        old: oldScoring ? "Enabled" : "Disabled",
        new: newScoring ? "Enabled" : "Disabled"
      });
    }

    setChanges(detectedChanges);
  };

  if (changes.length === 0) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="w-4 h-4" />
          Unsaved Changes
          <Badge variant="secondary">{changes.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {changes.map((change, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm">
              {change.type === "add" && <Plus className="w-4 h-4 text-green-600 mt-0.5" />}
              {change.type === "remove" && <Minus className="w-4 h-4 text-red-600 mt-0.5" />}
              {change.type === "edit" && <Edit className="w-4 h-4 text-blue-600 mt-0.5" />}
              
              <div className="flex-1">
                <span className="font-medium">{change.field}:</span>{" "}
                {change.old && (
                  <span className="text-gray-500 line-through">{change.old}</span>
                )}
                {change.old && change.new && " → "}
                {change.new && (
                  <span className="text-gray-900">{change.new}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}