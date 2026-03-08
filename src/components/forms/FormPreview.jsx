import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star } from "lucide-react";

export default function FormPreview({ formData }) {
  const renderQuestion = (question) => {
    switch (question.type) {
      case "short_text":
      case "email":
      case "number":
      case "phone":
        return (
          <Input
            placeholder={question.placeholder || "Your answer..."}
            type={question.type === "email" ? "email" : question.type === "number" ? "number" : "text"}
            disabled
          />
        );

      case "long_text":
        return (
          <Textarea
            placeholder={question.placeholder || "Your answer..."}
            rows={4}
            disabled
          />
        );

      case "multiple_choice":
        return (
          <RadioGroup disabled>
            {(question.options || []).map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}_${idx}`} />
                <Label htmlFor={`${question.id}_${idx}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "checkboxes":
        return (
          <div className="space-y-2">
            {(question.options || []).map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox id={`${question.id}_${idx}`} disabled />
                <Label htmlFor={`${question.id}_${idx}`}>{option}</Label>
              </div>
            ))}
          </div>
        );

      case "dropdown":
        return (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {(question.options || []).map((option, idx) => (
                <SelectItem key={idx} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "rating_scale":
        return (
          <div className="flex gap-2">
            {Array.from({ length: question.max_value || 5 }).map((_, idx) => (
              <Star
                key={idx}
                className="w-8 h-8 text-gray-300 cursor-not-allowed"
              />
            ))}
          </div>
        );

      case "linear_scale":
        return (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              {question.min_label && (
                <span className="text-sm text-gray-600">{question.min_label}</span>
              )}
              <div className="flex gap-2">
                {Array.from(
                  { length: (question.max_value || 5) - (question.min_value || 1) + 1 },
                  (_, idx) => idx + (question.min_value || 1)
                ).map((value) => (
                  <button
                    key={value}
                    disabled
                    className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-sm font-medium cursor-not-allowed"
                  >
                    {value}
                  </button>
                ))}
              </div>
              {question.max_label && (
                <span className="text-sm text-gray-600">{question.max_label}</span>
              )}
            </div>
          </div>
        );

      case "date":
        return <Input type="date" disabled />;

      case "time":
        return <Input type="time" disabled />;

      case "yes_no":
        return (
          <RadioGroup disabled>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id={`${question.id}_yes`} />
              <Label htmlFor={`${question.id}_yes`}>Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id={`${question.id}_no`} />
              <Label htmlFor={`${question.id}_no`}>No</Label>
            </div>
          </RadioGroup>
        );

      case "file_upload":
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">File upload (preview only)</p>
          </div>
        );

      case "calculated":
        return (
          <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500 italic">Calculated field - auto-populated</p>
            {question.calculation_formula && (
              <p className="text-xs text-gray-400 mt-1">
                Formula: {question.calculation_formula.fields?.length || 0} fields
              </p>
            )}
          </div>
        );

      default:
        return (
          <p className="text-sm text-gray-500 italic">
            Preview not available for this question type
          </p>
        );
    }
  };

  if (!formData.config || !formData.config.sections || formData.config.sections.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No sections to preview yet.</p>
        <p className="text-sm mt-2">Add sections and questions in the Build tab to see a preview.</p>
      </div>
    );
  }

  const renderSections = () => {
    if (formData.multi_step_enabled && formData.pages) {
      return formData.pages.map((page, pageIndex) => (
        <div key={page.id} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-900">
              Page {pageIndex + 1} of {formData.pages.length}: {page.title}
            </h2>
            <div className="w-full bg-gray-200 h-2 rounded-full mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${((pageIndex + 1) / formData.pages.length) * 100}%` }}
              />
            </div>
          </div>

          {formData.config.sections
            .filter(section => page.section_ids.includes(section.id))
            .map((section) => (
              <Card key={section.id} className="p-6">
                <h3 className="text-xl font-semibold mb-2">{section.title}</h3>
                {section.description && (
                  <p className="text-sm text-gray-600 mb-4">{section.description}</p>
                )}

                <div className="space-y-6">
                  {section.questions.map((question) => (
                    <div key={question.id}>
                      <Label className="text-base font-medium">
                        {question.question_text}
                        {question.required && <span className="text-red-600 ml-1">*</span>}
                      </Label>
                      {question.description && (
                        <p className="text-sm text-gray-500 mt-1 mb-2">{question.description}</p>
                      )}
                      {question.conditional_logic && (
                        <p className="text-xs text-blue-600 mb-2">⚡ Conditional logic applied</p>
                      )}
                      <div className="mt-2">{renderQuestion(question)}</div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
        </div>
      ));
    }

    return formData.config.sections.map((section) => (
      <Card key={section.id} className="p-6">
        <h2 className="text-xl font-semibold mb-2">{section.title}</h2>
        {section.description && (
          <p className="text-sm text-gray-600 mb-4">{section.description}</p>
        )}

        <div className="space-y-6">
          {section.questions.map((question) => (
            <div key={question.id}>
              <Label className="text-base font-medium">
                {question.question_text}
                {question.required && <span className="text-red-600 ml-1">*</span>}
              </Label>
              {question.description && (
                <p className="text-sm text-gray-500 mt-1 mb-2">{question.description}</p>
              )}
              {question.conditional_logic && (
                <p className="text-xs text-blue-600 mb-2">⚡ Conditional logic applied</p>
              )}
              <div className="mt-2">{renderQuestion(question)}</div>
            </div>
          ))}
        </div>
      </Card>
    ));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Form Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{formData.title}</h1>
        {formData.description && (
          <p className="text-gray-600 mt-2">{formData.description}</p>
        )}
      </div>

      {/* Sections */}
      {renderSections()}

      <div className="text-center text-sm text-gray-500 py-4">
        This is a preview. Actual form submissions will be functional.
      </div>
    </div>
  );
}