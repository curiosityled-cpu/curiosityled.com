import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trophy, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ScoringConfigEditor({ question, onUpdate }) {
  const [scoring, setScoring] = useState(question.scoring || {
    enabled: false,
    correct_answers: [],
    points: 1,
    partial_credit: false
  });

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        ...question,
        scoring: scoring.enabled ? scoring : null
      });
      toast.success("Scoring settings saved");
    }
  };

  const addCorrectAnswer = () => {
    setScoring({
      ...scoring,
      correct_answers: [...(scoring.correct_answers || []), ""]
    });
  };

  const updateCorrectAnswer = (index, value) => {
    const updated = [...scoring.correct_answers];
    updated[index] = value;
    setScoring({ ...scoring, correct_answers: updated });
  };

  const removeCorrectAnswer = (index) => {
    setScoring({
      ...scoring,
      correct_answers: scoring.correct_answers.filter((_, i) => i !== index)
    });
  };

  const canHaveScoring = ["multiple_choice", "checkboxes", "dropdown", "short_text", "number", "yes_no", "text"].includes(question.type);

  if (!canHaveScoring || question.type === "calculated") {
    return null;
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="w-4 h-4" />
          Scoring Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="enable_scoring"
            checked={scoring.enabled}
            onCheckedChange={(checked) => setScoring({ ...scoring, enabled: checked })}
          />
          <label htmlFor="enable_scoring" className="text-sm font-medium cursor-pointer">
            Enable scoring for this question
          </label>
        </div>

        {scoring.enabled && (
          <>
            <div>
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                min="0"
                value={scoring.points || 1}
                onChange={(e) => setScoring({ ...scoring, points: parseFloat(e.target.value) || 1 })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Points awarded for correct answer
              </p>
            </div>

            {question.type === "multiple_choice" || question.type === "dropdown" || question.type === "yes_no" ? (
              <div>
                <Label>Correct Answer</Label>
                {question.type === "yes_no" ? (
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={scoring.correct_answers?.[0] === "yes" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setScoring({ ...scoring, correct_answers: ["yes"] })}
                    >
                      Yes
                    </Button>
                    <Button
                      variant={scoring.correct_answers?.[0] === "no" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setScoring({ ...scoring, correct_answers: ["no"] })}
                    >
                      No
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 mt-2">
                    {question.options?.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Checkbox
                          id={`correct_${idx}`}
                          checked={scoring.correct_answers?.includes(option)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setScoring({
                                ...scoring,
                                correct_answers: [...(scoring.correct_answers || []), option]
                              });
                            } else {
                              setScoring({
                                ...scoring,
                                correct_answers: scoring.correct_answers.filter(a => a !== option)
                              });
                            }
                          }}
                        />
                        <label htmlFor={`correct_${idx}`} className="text-sm cursor-pointer">
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : question.type === "checkboxes" ? (
              <>
                <div>
                  <Label>Correct Answers (select multiple)</Label>
                  <div className="space-y-2 mt-2">
                    {question.options?.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Checkbox
                          id={`correct_${idx}`}
                          checked={scoring.correct_answers?.includes(option)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setScoring({
                                ...scoring,
                                correct_answers: [...(scoring.correct_answers || []), option]
                              });
                            } else {
                              setScoring({
                                ...scoring,
                                correct_answers: scoring.correct_answers.filter(a => a !== option)
                              });
                            }
                          }}
                        />
                        <label htmlFor={`correct_${idx}`} className="text-sm cursor-pointer">
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="partial_credit"
                    checked={scoring.partial_credit}
                    onCheckedChange={(checked) => setScoring({ ...scoring, partial_credit: checked })}
                  />
                  <label htmlFor="partial_credit" className="text-sm cursor-pointer">
                    Award partial credit for partially correct answers
                  </label>
                </div>
              </>
            ) : (
              <div>
                <Label>Correct Answer(s)</Label>
                <div className="space-y-2 mt-2">
                  {(scoring.correct_answers || []).map((answer, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={answer}
                        onChange={(e) => updateCorrectAnswer(idx, e.target.value)}
                        placeholder="Correct answer"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCorrectAnswer(idx)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addCorrectAnswer}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Answer
                  </Button>
                </div>
              </div>
            )}

            <Button
              onClick={handleSave}
              className="w-full mt-2"
              size="sm"
              style={{ backgroundColor: '#0202ff' }}
            >
              Save Scoring
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}