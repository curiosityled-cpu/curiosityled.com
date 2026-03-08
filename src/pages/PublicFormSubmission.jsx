import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CheckCircle, Star, AlertCircle } from "lucide-react";

export default function PublicFormSubmission() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState({});
  const [submitterInfo, setSubmitterInfo] = useState({ email: "", name: "" });
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (token) {
      loadForm();
    } else {
      setError("No form token provided");
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadForm = async () => {
    setLoading(true);
    try {
      const forms = await base44.entities.CustomForm.filter({
        public_access_enabled: true,
        status: "published"
      });

      const matchingForm = forms.find(f => f.public_access_config?.token === token);

      if (!matchingForm) {
        setError("Form not found or access has been disabled");
        setLoading(false);
        return;
      }

      // Check expiration
      if (matchingForm.public_access_config?.expires_at) {
        const expiryDate = new Date(matchingForm.public_access_config.expires_at);
        if (expiryDate < new Date()) {
          setError("This form has expired");
          setLoading(false);
          return;
        }
      }

      // Check max submissions
      if (matchingForm.public_access_config?.max_submissions) {
        const submissions = await base44.entities.CustomFormSubmission.filter({
          form_id: matchingForm.id,
          submission_source: "public_link"
        });

        if (submissions.length >= matchingForm.public_access_config.max_submissions) {
          setError("This form has reached its maximum number of submissions");
          setLoading(false);
          return;
        }
      }

      setForm(matchingForm);
    } catch (error) {
      console.error("Error loading form:", error);
      setError("Failed to load form");
    } finally {
      setLoading(false);
    }
  };

  const evaluateCondition = (condition) => {
    const { question_id, operator, value } = condition;
    const response = responses[question_id];

    switch (operator) {
      case "equals":
        return response === value;
      case "not_equals":
        return response !== value;
      case "greater_than":
        return Number(response) > Number(value);
      case "less_than":
        return Number(response) < Number(value);
      case "contains":
        return String(response).includes(value);
      case "is_empty":
        return !response;
      case "is_not_empty":
        return !!response;
      default:
        return true;
    }
  };

  const shouldShowQuestion = (question) => {
    if (!question.conditional_logic?.show_if) return true;
    return question.conditional_logic.show_if.every(evaluateCondition);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate email if required
    if (form.config.collect_email && !submitterInfo.email) {
      toast.error("Please provide your email address");
      return;
    }

    // Validate email format
    if (submitterInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterInfo.email)) {
      toast.error("Please provide a valid email address");
      return;
    }

    // Validate required questions
    for (const section of form.config.sections || []) {
      for (const question of section.questions || []) {
        if (question.required && shouldShowQuestion(question) && !responses[question.id]) {
          toast.error(`Please answer: ${question.question_text}`);
          return;
        }
      }
    }

    // Check if form has already been submitted (one response per user)
    if (form.config.one_response_per_user && submitterInfo.email) {
      try {
        const existing = await base44.entities.CustomFormSubmission.filter({
          form_id: form.id,
          submitter_email: submitterInfo.email,
          submission_source: "public_link"
        });

        if (existing.length > 0) {
          toast.error("You have already submitted this form");
          setSubmitting(false);
          return;
        }
      } catch (error) {
        console.error("Error checking duplicates:", error);
      }
    }

    setSubmitting(true);
    try {
      const completionTime = Math.floor((Date.now() - startTime) / 1000);

      const submission = {
        client_id: form.client_id,
        form_id: form.id,
        form_version: form.version,
        form_snapshot: form.config,
        submitter_email: submitterInfo.email || "anonymous@example.com",
        submitter_name: submitterInfo.name || "Anonymous",
        is_anonymous: !submitterInfo.email,
        submission_source: "public_link",
        responses,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        completion_time_seconds: completionTime
      };

      await base44.entities.CustomFormSubmission.create(submission);
      setSubmitted(true);
      toast.success("Form submitted successfully!");
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit form");
    } finally {
      setSubmitting(false);
    }
  };

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
            value={responses[question.id] || ""}
            onChange={(e) => setResponses({ ...responses, [question.id]: e.target.value })}
            required={question.required}
          />
        );

      case "long_text":
        return (
          <Textarea
            placeholder={question.placeholder || "Your answer..."}
            value={responses[question.id] || ""}
            onChange={(e) => setResponses({ ...responses, [question.id]: e.target.value })}
            rows={4}
            required={question.required}
          />
        );

      case "multiple_choice":
        return (
          <RadioGroup
            value={responses[question.id] || ""}
            onValueChange={(value) => setResponses({ ...responses, [question.id]: value })}
          >
            {(question.options || []).map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}_${idx}`} />
                <Label htmlFor={`${question.id}_${idx}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "checkboxes":
        const selectedOptions = responses[question.id] || [];
        return (
          <div className="space-y-2">
            {(question.options || []).map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}_${idx}`}
                  checked={selectedOptions.includes(option)}
                  onCheckedChange={(checked) => {
                    const newOptions = checked
                      ? [...selectedOptions, option]
                      : selectedOptions.filter(o => o !== option);
                    setResponses({ ...responses, [question.id]: newOptions });
                  }}
                />
                <Label htmlFor={`${question.id}_${idx}`}>{option}</Label>
              </div>
            ))}
          </div>
        );

      case "dropdown":
        return (
          <Select
            value={responses[question.id] || ""}
            onValueChange={(value) => setResponses({ ...responses, [question.id]: value })}
          >
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
        const rating = responses[question.id] || 0;
        return (
          <div className="flex gap-2">
            {Array.from({ length: question.max_value || 5 }).map((_, idx) => (
              <Star
                key={idx}
                className={`w-8 h-8 cursor-pointer transition-colors ${
                  idx < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                }`}
                onClick={() => setResponses({ ...responses, [question.id]: idx + 1 })}
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
                    type="button"
                    onClick={() => setResponses({ ...responses, [question.id]: value })}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-colors ${
                      responses[question.id] === value
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
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
        return (
          <Input
            type="date"
            value={responses[question.id] || ""}
            onChange={(e) => setResponses({ ...responses, [question.id]: e.target.value })}
            required={question.required}
          />
        );

      case "time":
        return (
          <Input
            type="time"
            value={responses[question.id] || ""}
            onChange={(e) => setResponses({ ...responses, [question.id]: e.target.value })}
            required={question.required}
          />
        );

      case "yes_no":
        return (
          <RadioGroup
            value={responses[question.id] || ""}
            onValueChange={(value) => setResponses({ ...responses, [question.id]: value })}
          >
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

      default:
        return <p className="text-sm text-gray-500 italic">Question type not supported</p>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Unable to Access Form</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-gray-600">
              {form.config.custom_thank_you_message || "Your response has been recorded."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form Header */}
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{form.title}</CardTitle>
              {form.description && (
                <p className="text-gray-600 mt-2">{form.description}</p>
              )}
              {form.public_access_config?.custom_message && (
                <p className="text-sm text-blue-600 mt-2 p-3 bg-blue-50 rounded-lg">
                  {form.public_access_config.custom_message}
                </p>
              )}
            </CardHeader>
          </Card>

          {/* Submitter Info */}
          {form.config.collect_email && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="submitter_email">
                    Email Address {form.config.collect_email && <span className="text-red-600">*</span>}
                  </Label>
                  <Input
                    id="submitter_email"
                    type="email"
                    value={submitterInfo.email}
                    onChange={(e) => setSubmitterInfo({ ...submitterInfo, email: e.target.value })}
                    required={form.config.collect_email}
                  />
                </div>
                <div>
                  <Label htmlFor="submitter_name">Name (optional)</Label>
                  <Input
                    id="submitter_name"
                    value={submitterInfo.name}
                    onChange={(e) => setSubmitterInfo({ ...submitterInfo, name: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sections */}
          {form.config.sections.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <h2 className="text-xl font-semibold">{section.title}</h2>
                {section.description && (
                  <p className="text-sm text-gray-600">{section.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {section.questions.map((question) => 
                  shouldShowQuestion(question) && (
                    <div key={question.id}>
                      <Label className="text-base font-medium">
                        {question.question_text}
                        {question.required && <span className="text-red-600 ml-1">*</span>}
                      </Label>
                      {question.description && (
                        <p className="text-sm text-gray-500 mt-1 mb-2">{question.description}</p>
                      )}
                      <div className="mt-2">{renderQuestion(question)}</div>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          ))}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full"
            style={{ backgroundColor: '#0202ff' }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}