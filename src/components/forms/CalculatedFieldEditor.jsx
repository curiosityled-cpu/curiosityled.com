import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Plus, Trash2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CalculatedFieldEditor({ question, allQuestions, onUpdate }) {
  const [formula, setFormula] = useState(question.calculation_formula || { 
    fields: [],
    operators: [],
    result_type: "number"
  });

  const getNumericQuestions = () => {
    if (!allQuestions || allQuestions.length === 0) return [];
    
    const currentIndex = allQuestions.findIndex(q => q.id === question.id);
    if (currentIndex === -1) return allQuestions.filter(q => 
      q.type === "number" || 
      q.type === "rating_scale" || 
      q.type === "linear_scale" ||
      q.calculation_formula
    );
    
    return allQuestions
      .slice(0, currentIndex)
      .filter(q => 
        q.type === "number" || 
        q.type === "rating_scale" || 
        q.type === "linear_scale" ||
        q.calculation_formula
      );
  };

  const addField = () => {
    const updated = {
      ...formula,
      fields: [...formula.fields, ""],
      operators: formula.fields.length > 0 ? [...formula.operators, "+"] : []
    };
    setFormula(updated);
    saveFormula(updated);
  };

  const removeField = (index) => {
    const updated = {
      ...formula,
      fields: formula.fields.filter((_, i) => i !== index),
      operators: formula.operators.filter((_, i) => i !== index - 1)
    };
    setFormula(updated);
    saveFormula(updated);
  };

  const updateField = (index, value) => {
    const updated = {
      ...formula,
      fields: formula.fields.map((f, i) => i === index ? value : f)
    };
    setFormula(updated);
    saveFormula(updated);
  };

  const updateOperator = (index, value) => {
    const updated = {
      ...formula,
      operators: formula.operators.map((op, i) => i === index ? value : op)
    };
    setFormula(updated);
    saveFormula(updated);
  };

  const saveFormula = (updated) => {
    if (onUpdate) {
      onUpdate({
        ...question,
        calculation_formula: updated.fields.length > 0 ? updated : null,
        type: "calculated"
      });
    }
  };

  const numericQuestions = getNumericQuestions();

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="w-4 h-4" />
          Calculated Field
        </CardTitle>
        <p className="text-xs text-gray-600">
          Automatically calculate this field based on previous numeric answers
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {numericQuestions.length === 0 ? (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Add numeric questions above to create calculations
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {formula.fields.map((field, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Select
                      value={field}
                      onValueChange={(value) => updateField(index, value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {numericQuestions.map(q => (
                          <SelectItem key={q.id} value={q.id}>
                            {q.question_text?.substring(0, 40)}...
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeField(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>

                  {index < formula.operators.length && (
                    <div className="flex items-center gap-2 pl-4">
                      <Select
                        value={formula.operators[index]}
                        onValueChange={(value) => updateOperator(index, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+">+ Add</SelectItem>
                          <SelectItem value="-">- Subtract</SelectItem>
                          <SelectItem value="*">× Multiply</SelectItem>
                          <SelectItem value="/">÷ Divide</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={addField}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Field
            </Button>

            {formula.fields.length > 0 && (
              <div className="mt-3 p-3 bg-white rounded-lg border">
                <p className="text-xs font-medium text-gray-700 mb-2">Formula Preview:</p>
                <Badge variant="secondary" className="font-mono text-xs">
                  {formula.fields.map((fieldId, i) => {
                    const q = numericQuestions.find(q => q.id === fieldId);
                    const fieldName = q?.question_text?.substring(0, 15) || "Field";
                    const operator = i < formula.operators.length ? ` ${formula.operators[i]} ` : "";
                    return fieldName + operator;
                  }).join("")}
                </Badge>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}