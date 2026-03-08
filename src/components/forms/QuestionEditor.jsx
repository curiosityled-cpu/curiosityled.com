import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import ConditionalLogicEditor from "./ConditionalLogicEditor";
import ValidationRulesEditor from "./ValidationRulesEditor";
import CalculatedFieldEditor from "./CalculatedFieldEditor";
import ScoringConfigEditor from "./ScoringConfigEditor";

export default function QuestionEditor({ question, allQuestions = [], onSave, onCancel }) {
  const [editedQuestion, setEditedQuestion] = useState({ ...question });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasOptions = ["multiple_choice", "checkboxes", "dropdown"].includes(editedQuestion.type);
  const hasScale = ["rating_scale", "linear_scale"].includes(editedQuestion.type);

  const handleAddOption = () => {
    const options = editedQuestion.options || [];
    setEditedQuestion({
      ...editedQuestion,
      options: [...options, `Option ${options.length + 1}`]
    });
  };

  const handleUpdateOption = (index, value) => {
    const newOptions = [...editedQuestion.options];
    newOptions[index] = value;
    setEditedQuestion({ ...editedQuestion, options: newOptions });
  };

  const handleDeleteOption = (index) => {
    setEditedQuestion({
      ...editedQuestion,
      options: editedQuestion.options.filter((_, i) => i !== index)
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Question Text */}
          <div>
            <Label htmlFor="question_text">Question Text *</Label>
            <Textarea
              id="question_text"
              value={editedQuestion.question_text}
              onChange={(e) => setEditedQuestion({ ...editedQuestion, question_text: e.target.value })}
              placeholder="Enter your question..."
              rows={3}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Help Text (optional)</Label>
            <Input
              id="description"
              value={editedQuestion.description || ""}
              onChange={(e) => setEditedQuestion({ ...editedQuestion, description: e.target.value })}
              placeholder="Additional context or instructions..."
            />
          </div>

          {/* Placeholder */}
          {["short_text", "long_text", "email", "number", "phone"].includes(editedQuestion.type) && (
            <div>
              <Label htmlFor="placeholder">Placeholder</Label>
              <Input
                id="placeholder"
                value={editedQuestion.placeholder || ""}
                onChange={(e) => setEditedQuestion({ ...editedQuestion, placeholder: e.target.value })}
                placeholder="e.g., Enter your answer here..."
              />
            </div>
          )}

          {/* Options for Multiple Choice, Checkboxes, Dropdown */}
          {hasOptions && (
            <div>
              <Label>Options *</Label>
              <div className="space-y-2 mt-2">
                {(editedQuestion.options || []).map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => handleUpdateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteOption(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={handleAddOption}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          {/* Scale Configuration */}
          {hasScale && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_value">Minimum Value</Label>
                <Input
                  id="min_value"
                  type="number"
                  value={editedQuestion.min_value || 1}
                  onChange={(e) => setEditedQuestion({ ...editedQuestion, min_value: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="max_value">Maximum Value</Label>
                <Input
                  id="max_value"
                  type="number"
                  value={editedQuestion.max_value || 5}
                  onChange={(e) => setEditedQuestion({ ...editedQuestion, max_value: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="min_label">Min Label (optional)</Label>
                <Input
                  id="min_label"
                  value={editedQuestion.min_label || ""}
                  onChange={(e) => setEditedQuestion({ ...editedQuestion, min_label: e.target.value })}
                  placeholder="e.g., Not at all"
                />
              </div>
              <div>
                <Label htmlFor="max_label">Max Label (optional)</Label>
                <Input
                  id="max_label"
                  value={editedQuestion.max_label || ""}
                  onChange={(e) => setEditedQuestion({ ...editedQuestion, max_label: e.target.value })}
                  placeholder="e.g., Extremely"
                />
              </div>
            </div>
          )}

          {/* Required */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="required"
              checked={editedQuestion.required || false}
              onCheckedChange={(checked) => setEditedQuestion({ ...editedQuestion, required: checked })}
            />
            <Label htmlFor="required" className="cursor-pointer">
              Required question
            </Label>
          </div>

          {/* Advanced Features Toggle */}
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? "Hide" : "Show"} Advanced Features
            </Button>
          </div>

          {/* Advanced Features */}
          {showAdvanced && (
            <div className="space-y-4 border-t pt-4">
              <ScoringConfigEditor
                question={editedQuestion}
                onUpdate={(updated) => setEditedQuestion(updated)}
              />

              <ConditionalLogicEditor
                question={editedQuestion}
                allQuestions={allQuestions}
                onUpdate={(updated) => setEditedQuestion(updated)}
              />

              <ValidationRulesEditor
                question={editedQuestion}
                onUpdate={(updated) => setEditedQuestion(updated)}
              />

              {editedQuestion.type !== "calculated" && (
                <CalculatedFieldEditor
                  question={editedQuestion}
                  allQuestions={allQuestions}
                  onUpdate={(updated) => setEditedQuestion(updated)}
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={() => onSave(editedQuestion)}
            style={{ backgroundColor: '#0202ff' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
          >
            Save Question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}