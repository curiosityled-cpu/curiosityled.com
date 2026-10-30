import React from "react";
import { format } from "date-fns";
import {
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  ShieldCheck,
  UserPlus,
  XCircle,
} from "lucide-react";

const KIND = {
  course_enrolled: { icon: UserPlus, label: "Enrolled", tone: "text-gray-400", ring: "ring-gray-100" },
  lesson_completed: { icon: CircleDot, label: "Lesson completed", tone: "text-blue-500", ring: "ring-blue-50" },
  course_completed: { icon: CheckCircle2, label: "Course completed", tone: "text-emerald-500", ring: "ring-emerald-50" },
  certificate_issued: { icon: Award, label: "Certificate issued", tone: "text-amber-500", ring: "ring-amber-50" },
  course_published: { icon: BookOpen, label: "Course published", tone: "text-gray-400", ring: "ring-gray-100" },
  waiver_requested: { icon: CalendarClock, label: "Waiver requested", tone: "text-violet-500", ring: "ring-violet-50" },
  assignment_waived: { icon: ShieldCheck, label: "Requirement waived", tone: "text-violet-500", ring: "ring-violet-50" },
  waiver_declined: { icon: XCircle, label: "Waiver declined", tone: "text-red-500", ring: "ring-red-50" },
  due_date_extended: { icon: CalendarClock, label: "Due date extended", tone: "text-blue-500", ring: "ring-blue-50" },
};

const DECISION_EVENTS = ["waiver_requested", "assignment_waived", "waiver_declined", "due_date_extended"];

/**
 * The learner's record, oldest to newest top-down: a hairline spine of timestamped
 * events. Deliberately plain — this is evidence, not a dashboard.
 */
export default function TranscriptTimeline({ events = [] }) {
  if (events.length === 0) {
    return <p className="py-10 text-center text-xs text-gray-500">Nothing recorded for this learner yet.</p>;
  }

  return (
    <ol className="relative ml-1.5 border-l border-gray-200 pl-5 space-y-4 py-2">
      {events.map((event) => {
        const kind = KIND[event.event_type] || KIND.lesson_completed;
        const Icon = kind.icon;
        const isCompletion = event.event_type === "course_completed" || event.event_type === "certificate_issued";

        return (
          <li key={event.id} className="relative">
            <span
              className={`absolute -left-[27px] top-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-white ring-4 ring-white`}
            >
              <Icon className={`w-3.5 h-3.5 ${kind.tone}`} />
            </span>

            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className={`text-xs font-medium ${isCompletion ? "text-gray-900" : "text-gray-700"}`}>
                {event.event_type === "lesson_completed"
                  ? `Completed “${event.lesson_title || "a lesson"}”`
                  : event.event_type === "course_completed"
                    ? `Completed “${event.course_title || "Course"}”`
                    : event.event_type === "course_published"
                      ? `Published “${event.course_title || "Course"}”`
                      : kind.label}
              </span>
              {event.course_version && (
                <span className="font-mono text-[10px] text-gray-400 border border-gray-200 rounded px-1 py-px">
                  v{event.course_version}
                </span>
              )}
              <span className="ml-auto font-mono text-[10px] tabular-nums text-gray-400">
                {format(new Date(event.occurred_at || event.created_date), "MMM d, yyyy · HH:mm")}
              </span>
            </div>

            {event.event_type === "lesson_completed" && event.course_title && (
              <p className="text-[11px] text-gray-500 mt-0.5">
                {event.course_title}
                {event.metadata?.module_title ? ` · ${event.metadata.module_title}` : ""}
              </p>
            )}
            {event.event_type === "course_enrolled" && event.course_title && (
              <p className="text-[11px] text-gray-500 mt-0.5">
                {event.course_title}
                {event.metadata?.via === "self_enrolment" ? " · self-enrolled" : ""}
              </p>
            )}
            {event.event_type === "certificate_issued" && event.metadata?.verification_code && (
              <p className="font-mono text-[10px] text-gray-400 mt-0.5">
                {String(event.metadata.verification_code).slice(0, 18)}
              </p>
            )}
            {DECISION_EVENTS.includes(event.event_type) && (
              <div className="mt-0.5 space-y-0.5">
                {event.metadata?.reason && (
                  <p className="text-[11px] leading-snug text-gray-600">{event.metadata.reason}</p>
                )}
                {event.event_type === "due_date_extended" && event.metadata?.new_due_date && (
                  <p className="text-[11px] text-gray-500">
                    Due {event.metadata.previous_due_date || "—"} → {event.metadata.new_due_date}
                  </p>
                )}
                {event.actor_email && (
                  <p className="text-[11px] text-gray-400">Recorded by {event.actor_email}</p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}