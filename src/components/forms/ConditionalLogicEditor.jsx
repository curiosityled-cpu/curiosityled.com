import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { GitBranch, Plus, Trash2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ConditionalLogicEditor({ question, allQuestions, onUpdate }) {
  const [rules, setRules] = useState(question.conditional_logic?.rules || []);

  const addRule = () => {
    const newRule = {
      id: `rule_${Date.now()}`,
      condition_type: "show_if",
      source_question_id: "",
      operator: "equals",
      value: ""
    };
    const updatedRules = [...rules, newRule];
    setRules(updatedRules);
    saveRules(updatedRules);
  };

  const removeRule = (ruleId) => {
    const updatedRules = rules.filter(r => r.id !== ruleId);
    setRules(updatedRules);
    saveRules(updatedRules);
  };

  const updateRule = (ruleId, field, value) => {
    const updatedRules = rules.map(r => 
      r.id === ruleId ? { ...r, [field]: value } : r
    );
    setRules(updatedRules);
    saveRules(updatedRules);
  };

  const saveRules = (updatedRules) => {
    const logic = updatedRules.length > 0 ? {
      rules: updatedRules,
      match: "all" // all conditions must be met
    } : null;

    if (onUpdate) {
      onUpdate({
        ...question,
        conditional_logic: logic
      });
    }
  };

  const getAvailableQuestions = () => {
    if (!allQuestions || allQuestions.length === 0) return [];
    
    const currentIndex = allQuestions.findIndex(q => q.id === question.id);
    if (currentIndex === -1 || currentIndex === 0) return [];
    
    return allQuestions.slice(0, currentIndex);
  };

  const getOperatorsForQuestion = (questionId) => {
    const sourceQuestion = allQuestions.find(q => q.id === questionId);
    if (!sourceQuestion) return [];

    const baseOperators = [
      { value: "equals", label: "equals" },
      { value: "not_equals", label: "does not equal" }
    ];

    if (sourceQuestion.type === "number" || sourceQuestion.type === "rating_scale" || sourceQuestion.type === "linear_scale") {
      return [
        ...baseOperators,
        { value: "greater_than", label: "is greater than" },
        { value: "less_than", label: "is less than" }
      ];
    }

    if (sourceQuestion.type === "text" || sourceQuestion.type === "long_text") {
      return [
        ...baseOperators,
        { value: "contains", label: "contains" },
        { value: "not_contains", label: "does not contain" }
      ];
    }

    return baseOperators;
  };

  const availableQuestions = getAvailableQuestions();

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="w-4 h-4" />
          Conditional Logic
        </CardTitle>
        <p className="text-xs text-gray-600">
          Show or hide this question based on answers to previous questions
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {availableQuestions.length === 0 ? (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Add questions above this one to create conditional logic
          </div>
        ) : (
          <>
            {rules.map((rule) => {
              const sourceQuestion = allQuestions.find(q => q.id === rule.source_question_id);
              const operators = getOperatorsForQuestion(rule.source_question_id);

              return (
                <div key={rule.id} className="bg-white p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      {rule.condition_type === "show_if" ? "Show" : "Hide"} this question if:
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRule(rule.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={rule.source_question_id}
                      onValueChange={(value) => updateRule(rule.id, "source_question_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select question" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableQuestions.map(q => (
                          <SelectItem key={q.id} value={q.id}>
                            {q.question_text?.substring(0, 30)}...
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={rule.operator}
                      onValueChange={(value) => updateRule(rule.id, "operator", value)}
                      disabled={!rule.source_question_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map(op => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {sourceQuestion?.type === "multiple_choice" || sourceQuestion?.type === "dropdown" ? (
                      <Select
                        value={rule.value}
                        onValueChange={(value) => updateRule(rule.id, "value", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Value" />
                        </SelectTrigger>
                        <SelectContent>
                          {sourceQuestion.options?.map(opt => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Value"
                        value={rule.value}
                        onChange={(e) => updateRule(rule.id, "value", e.target.value)}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={addRule}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Condition
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}