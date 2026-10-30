import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

const asArray = (result) => (Array.isArray(result) ? result : result?.items || []);

/**
 * What the catalogue is still missing. This exists so nobody has to claim more than the
 * content can support: Curiosity Led delivers learning natively and does not export
 * SCORM or xAPI packages, so the gaps worth closing are the ones learners feel —
 * captions, descriptions, durations, and lessons that exist at all.
 */
export default function ContentGapReport() {
  const [state, setState] = useState({ loading: true, courses: [], resources: [] });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      base44.entities.Course.filter({ status: "published" }, { limit: 200 }).catch(() => []),
      base44.entities.LearningResource.filter({ is_active: true }, { limit: 500 }).catch(() => []),
    ]).then(([courses, resources]) => {
      if (!cancelled) {
        setState({ loading: false, courses: asArray(courses), resources: asArray(resources) });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const report = useMemo(() => {
    const { courses, resources } = state;
    const lessons = courses.flatMap((course) =>
      (course.modules || []).flatMap((module) =>
        (module.lessons || []).map((lesson) => ({ ...lesson, courseTitle: course.title }))
      )
    );
    const contentLessons = lessons.filter((lesson) => lesson.content_type === "resource");

    return {
      published: courses.length,
      captionCoverage: contentLessons.length
        ? Math.round(
            (contentLessons.filter((lesson) => lesson.captions_url).length / contentLessons.length) * 100
          )
        : null,
      gaps: [
        {
          id: "no_lessons",
          label: "Published courses with no lessons",
          items: courses.filter(
            (course) => !(course.modules || []).some((module) => (module.lessons || []).length)
          ),
          name: (course) => course.title,
        },
        {
          id: "no_captions",
          label: "Lessons with no captions or transcript",
          items: contentLessons.filter((lesson) => !lesson.captions_url),
          name: (lesson) => `${lesson.courseTitle} · ${lesson.title || lesson.reference_title || "Lesson"}`,
        },
        {
          id: "no_description",
          label: "Courses with no description",
          items: courses.filter((course) => !course.description?.trim()),
          name: (course) => course.title,
        },
        {
          id: "no_duration",
          label: "Courses with no estimated duration",
          items: courses.filter((course) => !course.estimated_duration_minutes),
          name: (course) => course.title,
        },
        {
          id: "dead_video",
          label: "Video resources with nothing to play",
          items: resources.filter(
            (resource) =>
              resource.type === "video" &&
              !resource.url &&
              !resource.uploaded_file_uri &&
              !resource.embed_code
          ),
          name: (resource) => resource.title,
        },
        {
          id: "resource_no_description",
          label: "Resources with no description",
          items: resources.filter((resource) => !resource.description?.trim()),
          name: (resource) => resource.title,
        },
      ],
    };
  }, [state]);

  if (state.loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  const open = report.gaps.filter((gap) => gap.items.length > 0);
  const totalItems = open.reduce((sum, gap) => sum + gap.items.length, 0);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Content readiness</h3>
          {totalItems === 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              <CheckCircle2 className="w-3 h-3" /> No gaps found
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              <AlertTriangle className="w-3 h-3" /> {totalItems} item{totalItems === 1 ? "" : "s"} to fix
            </span>
          )}
          <span className="ml-auto font-mono text-[11px] tabular-nums text-gray-400">
            {report.published} published course{report.published === 1 ? "" : "s"}
            {report.captionCoverage !== null && ` · ${report.captionCoverage}% caption coverage`}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
          Learning is delivered natively in Curiosity Led. There is no SCORM or xAPI export, so
          readiness means the content is complete and readable, not that it packages for another LMS.
        </p>
      </div>

      {open.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-600">
          Every published course has lessons, a description and a duration, and every lesson can be read.
        </p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {open.map((gap) => (
            <li key={gap.id} className="px-4 py-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-gray-800">{gap.label}</span>
                <span className="font-mono text-[11px] tabular-nums text-amber-700">
                  {gap.items.length}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-gray-400">
                {gap.items.slice(0, 3).map(gap.name).join(" · ")}
                {gap.items.length > 3 && ` +${gap.items.length - 3} more`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}