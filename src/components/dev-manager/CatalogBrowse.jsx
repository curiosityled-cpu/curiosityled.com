import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, Layers, BookOpen, Loader2, ArrowRight } from "lucide-react";

/**
 * CatalogBrowse — what a catalogue holds: the courses and journeys someone can
 * be enrolled in. Raw resources are not catalogue items (they live inside a
 * course), so they are managed in the Resources tab instead.
 */

const STATUS_BADGES = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-emerald-100 text-emerald-700",
  active: "bg-blue-100 text-blue-700",
  archived: "bg-slate-100 text-slate-600",
  paused: "bg-amber-100 text-amber-700",
};

function countLessons(course) {
  return (course.modules || []).reduce((sum, m) => sum + (m.lessons || []).length, 0);
}

function countJourneyItems(journey) {
  const structured = (journey.content_structure || []).length;
  const experiences = (journey.experiences || []).length;
  const items = (journey.learning_items || []).length + (journey.signal_items || []).length;
  return structured + experiences + items;
}

function CatalogRow({ icon: Icon, title, description, status, meta, onManage }) {
  return (
    <Card className="border border-gray-100 shadow-sm rounded-xl">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
            {status && (
              <Badge className={`text-[10px] ${STATUS_BADGES[status] || "bg-gray-100 text-gray-600"}`}>
                {status}
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
            {description || <span className="italic text-gray-400">No description</span>}
          </p>
          {meta && <p className="text-[11px] text-gray-400 mt-1">{meta}</p>}
        </div>
        <Button variant="ghost" size="sm" className="text-xs text-[#0202ff] hover:text-[#0101dd] flex-shrink-0" onClick={onManage}>
          Manage <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

function Section({ icon: Icon, title, count, empty, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-400">{count}</span>
      </div>
      {count === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
          {empty}
        </div>
      ) : children}
    </div>
  );
}

export default function CatalogBrowse({ onManageCourses, onManageJourneys }) {
  const [courses, setCourses] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [courseRows, journeyRows] = await Promise.all([
          base44.entities.Course.list("-created_date"),
          base44.entities.Journey.list("-created_date"),
        ]);
        setCourses(courseRows || []);
        setJourneys(journeyRows || []);
      } catch {
        setCourses([]);
        setJourneys([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>;
  }

  return (
    <div className="space-y-8">
      <p className="text-xs text-gray-500">
        The catalogue holds courses and journeys only. Resources are supporting material and live inside a course.
      </p>

      <Section
        icon={GraduationCap}
        title="Courses"
        count={courses.length}
        empty="No courses yet — create one from the Courses tab."
      >
        <div className="grid grid-cols-1 gap-3">
          {courses.map(course => {
            const lessons = countLessons(course);
            const meta = [
              lessons ? `${lessons} lesson${lessons === 1 ? "" : "s"}` : null,
              (course.modules || []).length ? `${course.modules.length} module${course.modules.length === 1 ? "" : "s"}` : null,
              course.estimated_duration_minutes ? `${course.estimated_duration_minutes} min` : null,
            ].filter(Boolean).join(" · ");
            return (
              <CatalogRow
                key={course.id}
                icon={BookOpen}
                title={course.title}
                description={course.description}
                status={course.status}
                meta={meta}
                onManage={onManageCourses}
              />
            );
          })}
        </div>
      </Section>

      <Section
        icon={Layers}
        title="Journeys"
        count={journeys.length}
        empty="No journeys yet — build one from Experiences → Journeys."
      >
        <div className="grid grid-cols-1 gap-3">
          {journeys.map(journey => {
            const items = countJourneyItems(journey);
            const meta = [
              items ? `${items} step${items === 1 ? "" : "s"}` : null,
              journey.estimated_duration_days ? `${journey.estimated_duration_days} days` : null,
              (journey.assigned_to_emails || []).length ? `${journey.assigned_to_emails.length} assigned` : null,
            ].filter(Boolean).join(" · ");
            return (
              <CatalogRow
                key={journey.id}
                icon={Layers}
                title={journey.title}
                description={journey.description}
                status={journey.status}
                meta={meta}
                onManage={onManageJourneys}
              />
            );
          })}
        </div>
      </Section>
    </div>
  );
}