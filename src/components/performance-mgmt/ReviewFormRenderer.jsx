import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Star, Target, TrendingUp, FileText } from "lucide-react";

const RATING_OPTIONS = [
  { value: 5, label: "5 — Exceeds" },
  { value: 4, label: "4 — Meets" },
  { value: 3, label: "3 — Partially" },
  { value: 2, label: "2 — Below" },
  { value: 1, label: "1 — Far Below" },
];

function RatingSelector({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
            value === n
              ? "bg-[#0202ff] text-white"
              : "bg-gray-50 text-gray-500 hover:bg-gray-100"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function CompetencyRatingsSection({ section, responses, onChange }) {
  const [competencies, setCompetencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCompetencies = async () => {
      try {
        const comps = await base44.entities.Competency.list(50);
        setCompetencies(comps);
      } catch (e) {
        setCompetencies([]);
      } finally {
        setLoading(false);
      }
    };
    loadCompetencies();
  }, []);

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" /></div>;

  const ratings = responses.competency_ratings || {};

  return (
    <div className="space-y-2">
      {competencies.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">No competencies configured for this organization.</p>
      ) : (
        competencies.map(comp => (
          <div key={comp.id} className="flex items-center justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">{comp.name || comp.title}</p>
              {comp.description && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{comp.description}</p>}
            </div>
            <RatingSelector value={ratings[comp.id] || 0} onChange={(val) => onChange({ ...ratings, [comp.id]: val })} />
          </div>
        ))
      )}
    </div>
  );
}

function GoalAchievementSection({ section, employeeEmail, responses, onChange }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGoals = async () => {
      try {
        const goalList = await base44.entities.Goal.filter({
          assigned_to_emails: { $in: [employeeEmail] },
          status: { $in: ["active", "draft"] },
        }, "-created_date", 20);
        setGoals(goalList);
      } catch (e) {
        setGoals([]);
      } finally {
        setLoading(false);
      }
    };
    loadGoals();
  }, [employeeEmail]);

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" /></div>;

  const goalRatings = responses.goal_achievement || {};

  return (
    <div className="space-y-3">
      {goals.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">No active goals found for this employee.</p>
      ) : (
        goals.map(goal => {
          const gr = goalRatings[goal.id] || { rating: 0, comments: "" };
          return (
            <div key={goal.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-[#0202ff]" />
                    {goal.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{goal.progress || 0}% progress</Badge>
                    {goal.status && <Badge variant="outline" className="text-[10px]">{goal.status}</Badge>}
                  </div>
                </div>
                <RatingSelector
                  value={gr.rating}
                  onChange={(val) => onChange({ ...goalRatings, [goal.id]: { ...gr, rating: val } })}
                />
              </div>
              <Textarea
                placeholder="Comments on goal achievement..."
                value={gr.comments}
                onChange={(e) => onChange({ ...goalRatings, [goal.id]: { ...gr, comments: e.target.value } })}
                rows={2}
                className="text-xs"
              />
            </div>
          );
        })
      )}
    </div>
  );
}

function TextSectionsSection({ section, responses, onChange }) {
  const questions = section.questions || [];
  return (
    <div className="space-y-3">
      {questions.map(q => (
        <div key={q.id} className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-700">{q.label}</Label>
          <Textarea
            placeholder={q.placeholder || ""}
            value={responses[q.id] || ""}
            onChange={(e) => onChange({ ...responses, [q.id]: e.target.value })}
            rows={q.rows || 3}
            className="text-xs"
          />
        </div>
      ))}
    </div>
  );
}

function OverallSection({ section, responses, onChange }) {
  const questions = section.questions || [];
  const ratingQ = questions.find(q => q.type === "rating");
  const textQ = questions.find(q => q.type === "textarea");

  return (
    <div className="space-y-3">
      {ratingQ && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-700">{ratingQ.label}</Label>
          <RatingSelector
            value={responses[ratingQ.id] || 0}
            onChange={(val) => onChange({ ...responses, [ratingQ.id]: val })}
          />
        </div>
      )}
      {textQ && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-700">{textQ.label}</Label>
          <Textarea
            placeholder={textQ.placeholder || ""}
            value={responses[textQ.id] || ""}
            onChange={(e) => onChange({ ...responses, [textQ.id]: e.target.value })}
            rows={4}
            className="text-xs"
          />
        </div>
      )}
    </div>
  );
}

export default function ReviewFormRenderer({ formConfig, employeeEmail, responses, onChange }) {
  const sections = formConfig?.sections || [];

  const handleSectionChange = (sectionId, newSectionResponses) => {
    onChange({ ...responses, ...newSectionResponses });
  };

  return (
    <div className="space-y-4">
      {sections.map(section => {
        const Icon = section.type === "competency_ratings" ? Star :
                     section.type === "goal_achievement" ? Target :
                     section.type === "overall" ? TrendingUp : FileText;
        return (
          <Card key={section.id} className="border border-gray-100 shadow-sm rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-50">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-[#0202ff]" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{section.title}</h4>
                  {section.description && <p className="text-[10px] text-gray-400">{section.description}</p>}
                </div>
              </div>

              {section.type === "competency_ratings" && (
                <CompetencyRatingsSection
                  section={section}
                  responses={responses}
                  onChange={(ratings) => handleSectionChange(section.id, { competency_ratings: ratings })}
                />
              )}
              {section.type === "goal_achievement" && (
                <GoalAchievementSection
                  section={section}
                  employeeEmail={employeeEmail}
                  responses={responses}
                  onChange={(goalRatings) => handleSectionChange(section.id, { goal_achievement: goalRatings })}
                />
              )}
              {section.type === "text_sections" && (
                <TextSectionsSection
                  section={section}
                  responses={responses}
                  onChange={(newResponses) => handleSectionChange(section.id, newResponses)}
                />
              )}
              {section.type === "overall" && (
                <OverallSection
                  section={section}
                  responses={responses}
                  onChange={(newResponses) => handleSectionChange(section.id, newResponses)}
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export const DEFAULT_REVIEW_FORM_CONFIG = {
  sections: [
    {
      id: "competency_ratings",
      title: "Competency Ratings",
      type: "competency_ratings",
      description: "Rate the employee on each core competency",
    },
    {
      id: "goal_achievement",
      title: "Goal Achievement",
      type: "goal_achievement",
      description: "Review progress on assigned goals",
    },
    {
      id: "development_plan",
      title: "Development Plan",
      type: "text_sections",
      questions: [
        { id: "strengths", label: "Key Strengths", type: "textarea", rows: 3, placeholder: "What are the employee's key strengths demonstrated this period?" },
        { id: "improvements", label: "Areas for Improvement", type: "textarea", rows: 3, placeholder: "Where can the employee improve?" },
        { id: "development_goals", label: "Development Goals for Next Period", type: "textarea", rows: 3, placeholder: "What development goals should be set for the next review period?" },
      ],
    },
    {
      id: "overall_assessment",
      title: "Overall Assessment",
      type: "overall",
      questions: [
        { id: "overall_rating", label: "Overall Rating", type: "rating" },
        { id: "calibration_comments", label: "Calibration Comments", type: "textarea", rows: 4, placeholder: "Comments for calibration session..." },
      ],
    },
  ],
};