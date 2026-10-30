import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Loader2, ArrowLeft, RotateCcw, Trophy } from "lucide-react";
import { toast } from "sonner";

const flatten = (config) => {
  const sections = Array.isArray(config?.sections) ? config.sections : [];
  const fromSections = sections.flatMap((s) => s?.questions || []);
  if (fromSections.length > 0) return fromSections;
  return Array.isArray(config?.questions) ? config.questions : [];
};

/** Takes a scored signal (quiz / knowledge check / assessment) and shows the graded result. */
export default function SignalPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [signal, setSignal] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [responses, setResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [lastSubmission, setLastSubmission] = useState(null);

  useEffect(() => {
    if (id && user?.email) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.email]);

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [signalResponse, submissions] = await Promise.all([
        base44.functions.invoke("getSignalForTaking", { assessment_id: id }),
        base44.entities.AssessmentSubmission.filter(
          { custom_assessment_id: id, user_email: user.email },
          "-submission_date",
          5
        ).catch(() => []),
      ]);

      setSignal(signalResponse.data.assessment);

      const scored = (Array.isArray(submissions) ? submissions : submissions?.items || []).find(
        (s) => s.status === "scored"
      );
      setLastSubmission(scored || null);
      if (scored) setResult(scored);
    } catch (error) {
      setLoadError(
        error?.response?.data?.error || error.message || "This signal could not be opened"
      );
    } finally {
      setLoading(false);
    }
  };

  const sections = signal?.config?.sections?.length
    ? signal.config.sections
    : [{ id: "all", title: "", questions: flatten(signal?.config) }];

  const allQuestions = sections.flatMap((s) => s.questions || []);

  const missingRequired = allQuestions.find((question) => {
    if (!question.required) return false;
    const value = responses[question.id];
    return Array.isArray(value) ? value.length === 0 : !value;
  });

  const submit = async () => {
    if (missingRequired) {
      toast.error(`Please answer: ${missingRequired.question_text}`);
      return;
    }
    setSubmitting(true);
    try {
      const response = await base44.functions.invoke("submitSignalResponse", {
        assessment_id: id,
        responses,
      });
      setResult(response.data);
      setLastSubmission(response.data);
      toast.success("Your responses were scored");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast.error(
        error?.response?.data?.error || error.message || "Your responses could not be submitted"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const retake = () => {
    setResponses({});
    setResult(null);
  };

  const renderQuestion = (question) => {
    const value = responses[question.id];

    switch (question.type) {
      case "checkboxes": {
        const selected = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {(question.options || []).map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Checkbox
                  id={`${question.id}_${index}`}
                  checked={selected.includes(option)}
                  onCheckedChange={(checked) =>
                    setResponses({
                      ...responses,
                      [question.id]: checked
                        ? [...selected, option]
                        : selected.filter((o) => o !== option),
                    })
                  }
                />
                <Label htmlFor={`${question.id}_${index}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );
      }
      case "multiple_choice":
      case "dropdown":
        return (
          <RadioGroup
            value={value || ""}
            onValueChange={(next) => setResponses({ ...responses, [question.id]: next })}
          >
            {(question.options || []).map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <RadioGroupItem value={option} id={`${question.id}_${index}`} />
                <Label htmlFor={`${question.id}_${index}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
      case "yes_no":
        return (
          <RadioGroup
            value={value || ""}
            onValueChange={(next) => setResponses({ ...responses, [question.id]: next })}
          >
            {["yes", "no"].map((option) => (
              <div key={option} className="flex items-center gap-2">
                <RadioGroupItem value={option} id={`${question.id}_${option}`} />
                <Label htmlFor={`${question.id}_${option}`} className="cursor-pointer capitalize">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
      case "long_text":
        return (
          <Textarea
            rows={4}
            value={value || ""}
            onChange={(event) => setResponses({ ...responses, [question.id]: event.target.value })}
            placeholder="Your answer..."
          />
        );
      case "rating_scale":
      case "linear_scale": {
        const min = question.min_value || 1;
        const max = question.max_value || 5;
        return (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: max - min + 1 }, (_, index) => index + min).map((point) => (
              <button
                key={point}
                type="button"
                onClick={() => setResponses({ ...responses, [question.id]: String(point) })}
                className={`h-10 w-10 rounded-full border text-sm font-medium transition-colors ${
                  String(value) === String(point)
                    ? "border-[#0202ff] bg-[#0202ff] text-white"
                    : "border-border hover:border-[#0202ff]"
                }`}
              >
                {point}
              </button>
            ))}
          </div>
        );
      }
      default:
        return (
          <Input
            type={question.type === "number" ? "number" : question.type === "email" ? "email" : "text"}
            value={value || ""}
            onChange={(event) => setResponses({ ...responses, [question.id]: event.target.value })}
            placeholder={question.placeholder || "Your answer..."}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError || !signal) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">{loadError || "Signal not found"}</p>
            <Button variant="outline" size="sm" onClick={() => navigate("/practice")}>
              Back to practice
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result) {
    const graded = result.question_results || [];
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-5">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate("/practice")}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl">{signal.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {lastSubmission?.submission_date
                    ? `Completed ${new Date(lastSubmission.submission_date).toLocaleDateString()}`
                    : "Just completed"}
                </p>
              </div>
              {result.passed ? (
                <Badge className="bg-emerald-100 text-emerald-800">
                  <Trophy className="w-3 h-3 mr-1" /> Passed
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">Not passed</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <p className="text-4xl font-semibold text-foreground">{result.percentage}%</p>
              <p className="text-sm text-muted-foreground">
                {result.score} of {result.max_score} points
                {result.passing_score_percentage != null
                  ? ` · pass mark ${result.passing_score_percentage}%`
                  : ""}
              </p>
            </div>
            <Progress value={result.percentage} className="h-2" />
            {(result.unscored_question_ids || []).length > 0 && (
              <p className="text-xs text-muted-foreground">
                {result.unscored_question_ids.length} question(s) had no answer key and were not scored.
              </p>
            )}
            <Button variant="outline" size="sm" onClick={retake}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Retake
            </Button>
          </CardContent>
        </Card>

        {graded.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your answers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {graded.map((item, index) => (
                <div key={item.question_id || index} className="rounded-xl border border-border p-3">
                  <div className="flex items-start gap-2">
                    {item.correct ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{item.question_text}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your answer:{" "}
                        {Array.isArray(item.response)
                          ? item.response.join(", ") || "—"
                          : item.response || "—"}
                      </p>
                      {!item.correct && (
                        <p className="text-xs text-emerald-700 mt-1">
                          Correct: {(item.correct_answers || []).join(", ")}
                        </p>
                      )}
                      {item.explanation && (
                        <p className="text-xs text-muted-foreground mt-1">{item.explanation}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {item.points_earned}/{item.points_possible}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{signal.title}</CardTitle>
          {signal.description && (
            <p className="text-sm text-muted-foreground">{signal.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {allQuestions.length} questions
            {signal.passing_score_percentage != null
              ? ` · pass mark ${signal.passing_score_percentage}%`
              : ""}
          </p>
        </CardHeader>
      </Card>

      {sections.map((section) => (
        <Card key={section.id}>
          {section.title && (
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
              {section.description && (
                <p className="text-sm text-muted-foreground">{section.description}</p>
              )}
            </CardHeader>
          )}
          <CardContent className="space-y-6">
            {(section.questions || []).map((question) => (
              <div key={question.id}>
                <Label className="text-sm font-medium">
                  {question.question_text}
                  {question.required && <span className="text-red-600 ml-1">*</span>}
                </Label>
                {question.description && (
                  <p className="text-xs text-muted-foreground mt-1">{question.description}</p>
                )}
                <div className="mt-2">{renderQuestion(question)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Button
        onClick={submit}
        disabled={submitting}
        className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
          </>
        ) : (
          "Submit answers"
        )}
      </Button>
    </div>
  );
}