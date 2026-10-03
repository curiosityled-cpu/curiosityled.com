import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, ExternalLink, FileText, Video, BookOpen, Headphones,
  Calendar, MapPin, Clock, Users, Link2, MonitorPlay, ClipboardList,
  MessageSquare, FileQuestion, AlertCircle, GraduationCap
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";

const RESOURCE_TYPE_META = {
  video: { icon: Video, label: "Video" },
  article: { icon: FileText, label: "Article" },
  book: { icon: BookOpen, label: "Book" },
  podcast: { icon: Headphones, label: "Podcast" },
  course: { icon: GraduationCap, label: "Course" },
  whitepaper: { icon: FileText, label: "Whitepaper" },
  document: { icon: FileText, label: "Document" },
  quiz: { icon: FileQuestion, label: "Quiz" },
  assessment_tool: { icon: ClipboardList, label: "Assessment Tool" },
  external_link: { icon: Link2, label: "External Link" },
};

const CLASS_TYPE_LABELS = {
  ilt: "In-Person Training",
  virtual_ilt: "Virtual Training",
  workshop: "Workshop",
  seminar: "Seminar",
  webinar: "Webinar",
  coaching_group: "Coaching Group",
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

/**
 * LessonContent — fetches and renders the referenced entity for a lesson.
 * Pure display component; completion is handled by the parent CoursePlayer.
 *
 * Props: lesson (object with content_type, reference_id, reference_title, title)
 */
export default function LessonContent({ lesson }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!lesson?.reference_id || !lesson?.content_type) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        let entityName;
        switch (lesson.content_type) {
          case "resource": entityName = "LearningResource"; break;
          case "live_class": entityName = "Class"; break;
          case "assessment": entityName = "CustomAssessment"; break;
          case "form": entityName = "CustomForm"; break;
          case "conversational_module": entityName = "ConversationalLearningModule"; break;
          default: entityName = null;
        }
        if (!entityName) {
          setError(`Unknown content type: ${lesson.content_type}`);
          setLoading(false);
          return;
        }
        const data = await base44.entities[entityName].get(lesson.reference_id);
        if (!cancelled) setContent(data);
      } catch (err) {
        if (!cancelled) setError("Could not load this lesson's content. It may have been removed or is no longer available.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [lesson?.reference_id, lesson?.content_type]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">Loading lesson content…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <AlertCircle className="w-10 h-10 mb-3 text-amber-400" />
        <p className="text-sm font-medium text-gray-700">{error}</p>
        <p className="text-xs mt-1">Contact your program administrator if this persists.</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <AlertCircle className="w-10 h-10 mb-3" />
        <p className="text-sm">No content available for this lesson.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Resource ── */}
      {lesson.content_type === "resource" && <ResourceView resource={content} />}

      {/* ── Live Class ── */}
      {lesson.content_type === "live_class" && <ClassView cls={content} />}

      {/* ── Assessment ── */}
      {lesson.content_type === "assessment" && <AssessmentView assessment={content} />}

      {/* ── Form ── */}
      {lesson.content_type === "form" && <FormView form={content} />}

      {/* ── Conversational Module ── */}
      {lesson.content_type === "conversational_module" && <ConversationalModuleView module={content} />}
    </div>
  );
}

// ── Resource View ──
function ResourceView({ resource }) {
  const typeMeta = RESOURCE_TYPE_META[resource.type] || RESOURCE_TYPE_META.external_link;
  const TypeIcon = typeMeta.icon;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
          <TypeIcon className="w-6 h-6 text-[#0202ff]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs">{typeMeta.label}</Badge>
            {resource.difficulty_level && (
              <Badge variant="outline" className="text-xs capitalize">{resource.difficulty_level}</Badge>
            )}
            {resource.duration_string && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />{resource.duration_string}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{resource.title}</h2>
          {resource.provider && <p className="text-sm text-gray-500 mt-0.5">{resource.provider}{resource.author ? ` · ${resource.author}` : ""}</p>}
        </div>
      </div>

      {resource.description && (
        <p className="text-sm text-gray-600 leading-relaxed">{resource.description}</p>
      )}

      {resource.thumbnail_url && (
        <img src={resource.thumbnail_url} alt={resource.title} className="w-full max-h-72 object-cover rounded-xl border border-gray-100" />
      )}

      {resource.embed_code && (
        <div className="rounded-xl overflow-hidden border border-gray-100" dangerouslySetInnerHTML={{ __html: resource.embed_code }} />
      )}

      <div className="flex items-center gap-3 flex-wrap pt-2">
        {resource.url && (
          <a href={resource.url} target="_blank" rel="noopener noreferrer">
            <Button className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
              <ExternalLink className="w-4 h-4 mr-2" /> Access Resource
            </Button>
          </a>
        )}
        {resource.document_url && (
          <a href={resource.document_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" /> View Document
            </Button>
          </a>
        )}
        {resource.cost_string && (
          <span className="text-xs text-gray-500">Cost: {resource.cost_string}</span>
        )}
      </div>
    </div>
  );
}

// ── Live Class View ──
function ClassView({ cls }) {
  const typeLabel = CLASS_TYPE_LABELS[cls.class_type] || cls.class_type || "Class";
  const locationIcon = cls.location_type === "virtual" ? MonitorPlay : cls.location_type === "hybrid" ? Users : MapPin;
  const LocIcon = locationIcon;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-6 h-6 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <Badge variant="secondary" className="text-xs mb-1">{typeLabel}</Badge>
          <h2 className="text-xl font-bold text-gray-900">{cls.title}</h2>
          {cls.facilitator_email && <p className="text-sm text-gray-500 mt-0.5">Facilitated by {cls.facilitator_email}</p>}
        </div>
      </div>

      {cls.description && <p className="text-sm text-gray-600 leading-relaxed">{cls.description}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InfoRow icon={Calendar} label="Scheduled" value={formatDate(cls.scheduled_date)} />
        <InfoRow icon={Clock} label="Duration" value={cls.duration_minutes ? `${cls.duration_minutes} min` : "—"} />
        <InfoRow icon={LocIcon} label="Location" value={cls.location || "TBD"} />
        <InfoRow icon={Users} label="Enrollment" value={`${cls.enrolled_emails?.length || 0} / ${cls.max_capacity || "∞"}`} />
      </div>

      {cls.location && cls.location_type === "virtual" && (
        <a href={cls.location} target="_blank" rel="noopener noreferrer">
          <Button className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
            <MonitorPlay className="w-4 h-4 mr-2" /> Join Virtual Session
          </Button>
        </a>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100">
      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}

// ── Assessment View ──
function AssessmentView({ assessment }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-6 h-6 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <Badge variant="secondary" className="text-xs mb-1">Assessment</Badge>
          <h2 className="text-xl font-bold text-gray-900">{assessment.title}</h2>
          {assessment.form_type && <p className="text-sm text-gray-500 mt-0.5 capitalize">{assessment.form_type.replace(/_/g, " ")}</p>}
        </div>
      </div>
      {assessment.description && <p className="text-sm text-gray-600 leading-relaxed">{assessment.description}</p>}
      <div className="p-4 rounded-xl bg-violet-50/50 border border-violet-100">
        <p className="text-sm text-gray-600 mb-3">
          This lesson includes an assessment. Click below to begin. Your results will be tracked in your learning record.
        </p>
        <Link to={`/AssessmentLibrary?assessment=${assessment.id}`}>
          <Button className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
            <ClipboardList className="w-4 h-4 mr-2" /> Launch Assessment
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Form View ──
function FormView({ form }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
          <FileText className="w-6 h-6 text-sky-600" />
        </div>
        <div className="flex-1 min-w-0">
          <Badge variant="secondary" className="text-xs mb-1">Form</Badge>
          <h2 className="text-xl font-bold text-gray-900">{form.title}</h2>
          {form.form_type && <p className="text-sm text-gray-500 mt-0.5 capitalize">{form.form_type.replace(/_/g, " ")}</p>}
        </div>
      </div>
      {form.description && <p className="text-sm text-gray-600 leading-relaxed">{form.description}</p>}
      <div className="p-4 rounded-xl bg-sky-50/50 border border-sky-100">
        <p className="text-sm text-gray-600 mb-3">
          This lesson includes a form to complete. Click below to begin.
        </p>
        <Link to={`/FormSubmission?id=${form.id}`}>
          <Button className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
            <FileText className="w-4 h-4 mr-2" /> Launch Form
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Conversational Module View ──
function ConversationalModuleView({ module: mod }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <Badge variant="secondary" className="text-xs mb-1">Conversational Module</Badge>
          <h2 className="text-xl font-bold text-gray-900">{mod.title}</h2>
          {mod.estimated_duration_minutes && (
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />~{mod.estimated_duration_minutes} min
            </p>
          )}
        </div>
      </div>
      {mod.description && <p className="text-sm text-gray-600 leading-relaxed">{mod.description}</p>}
      <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
        <p className="text-sm text-gray-600 mb-3">
          This lesson is a guided conversational learning module with Atreus. Click below to start the conversation.
        </p>
        <Link to={`/ConversationalModule?moduleId=${mod.id}`}>
          <Button className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
            <MessageSquare className="w-4 h-4 mr-2" /> Start Conversation
          </Button>
        </Link>
      </div>
    </div>
  );
}