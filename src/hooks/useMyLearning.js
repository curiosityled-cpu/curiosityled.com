import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { computeCourseProgress, formatMinutes } from "@/lib/learning";

const asArray = (result) => (Array.isArray(result) ? result : result?.items || []);
const indexById = (result) =>
  Object.fromEntries(asArray(result).map((record) => [record.id, record]));

// Record IDs are 24-char hex. An assignment can carry a stale or placeholder
// reference, and the API rejects the whole query if any ID is malformed — so
// unusable references are dropped instead of being passed through.
const RECORD_ID = /^[0-9a-f]{24}$/i;

const byIds = (entity, ids) => {
  const usable = ids.filter((id) => typeof id === "string" && RECORD_ID.test(id));
  return usable.length
    ? base44.entities[entity].filter({ id: { $in: usable } })
    : Promise.resolve([]);
};

/**
 * The learner's unified work list: assigned courses, learning resources,
 * conversational modules and journeys — normalised into one item shape.
 */
export default function useMyLearning() {
  const { user } = useAuth();
  const email = user?.email || user?.data?.email;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!email) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [
        progressRows,
        assignedRows,
        enrollmentRows,
        moduleProgressRows,
        authoredRows,
        assignedJourneyRows,
      ] = await Promise.all([
        base44.entities.CourseProgress.filter({ learner_email: email }),
        base44.entities.AssignedLearning.filter({ user_email: email }),
        base44.entities.JourneyEnrollment.filter({ user_email: email }),
        base44.entities.LearnerProgress.filter({ user_email: email }).catch(() => []),
        base44.entities.Journey.filter({ author_email: email }),
        base44.entities.Journey.filter({ assigned_to_emails: { $in: [email] } }),
      ]);

      const progress = asArray(progressRows);
      const assigned = asArray(assignedRows);
      const enrollments = asArray(enrollmentRows);
      const moduleProgress = asArray(moduleProgressRows);

      const courseIds = [...new Set(progress.map((row) => row.course_id).filter(Boolean))];
      const resourceIds = [...new Set(assigned.map((row) => row.learning_resource_id).filter(Boolean))];
      const moduleIds = [...new Set(assigned.map((row) => row.conversational_learning_module_id).filter(Boolean))];
      const journeyIds = [
        ...new Set([
          ...enrollments.map((row) => row.journey_id),
          ...asArray(authoredRows).map((row) => row.id),
          ...asArray(assignedJourneyRows).map((row) => row.id),
        ].filter(Boolean)),
      ];

      const [courses, resources, modules, journeys] = await Promise.all([
        byIds("Course", courseIds),
        byIds("LearningResource", resourceIds),
        byIds("ConversationalLearningModule", moduleIds),
        byIds("Journey", journeyIds),
      ]);

      const courseMap = indexById(courses);
      const resourceMap = indexById(resources);
      const moduleMap = indexById(modules);
      const journeyMap = indexById(journeys);
      const moduleStatusById = Object.fromEntries(
        moduleProgress.map((row) => [row.conversational_learning_module_id, row.status])
      );

      const courseItems = progress
        .filter((row) => courseMap[row.course_id])
        .map((row) => {
          const course = courseMap[row.course_id];
          const { completedCount, total } = computeCourseProgress(course, row);
          return {
            id: `course:${row.id}`,
            kind: "course",
            refId: row.id,
            title: course.title,
            subtitle: course.description,
            meta: [
              total ? `${completedCount} of ${total} lessons` : null,
              formatMinutes(course.estimated_duration_minutes),
              course.pacing === "cohort" ? "Cohort-paced" : "Self-paced",
            ]
              .filter(Boolean)
              .join(" · "),
            status: row.status || "not_started",
            percent:
              typeof row.overall_percentage === "number"
                ? row.overall_percentage
                : total
                ? Math.round((completedCount / total) * 100)
                : 0,
            due_date: row.due_date || null,
            assignedBy: row.assigned_by || null,
            launch: { to: `/course/${row.course_id}` },
            raw: row,
          };
        });

      const resourceItems = assigned
        .filter((row) => row.learning_resource_id && resourceMap[row.learning_resource_id])
        .map((row) => {
          const resource = resourceMap[row.learning_resource_id];
          const status =
            row.status === "completed"
              ? "completed"
              : row.status === "assigned"
              ? "not_started"
              : "in_progress";
          return {
            id: `resource:${row.id}`,
            kind: "resource",
            refId: row.id,
            title: row.title || resource.title,
            subtitle: row.description || resource.description,
            meta: [resource.provider, resource.type, resource.duration_string, resource.cost_string]
              .filter(Boolean)
              .join(" · "),
            status,
            percent: status === "completed" ? 100 : 0,
            due_date: row.due_date || null,
            assignedBy: row.assigned_by || null,
            priority: row.priority,
            launch: { resource },
            raw: row,
          };
        });

      const moduleItems = assigned
        .filter(
          (row) =>
            row.conversational_learning_module_id &&
            moduleMap[row.conversational_learning_module_id]
        )
        .map((row) => {
          const module = moduleMap[row.conversational_learning_module_id];
          const status = moduleStatusById[module.id] === "completed" ? "completed" : "in_progress";
          return {
            id: `module:${row.id}`,
            kind: "module",
            refId: row.id,
            title: row.title || module.title,
            subtitle: row.description || module.description,
            meta: [
              module.conversation_structure?.length
                ? `${module.conversation_structure.length} steps`
                : null,
              formatMinutes(module.estimated_duration_minutes),
            ]
              .filter(Boolean)
              .join(" · "),
            status,
            percent: status === "completed" ? 100 : 0,
            due_date: row.due_date || null,
            assignedBy: row.assigned_by || null,
            launch: {
              moduleId: module.id,
              module,
              to: `/ConversationalModule?moduleId=${module.id}`,
            },
            raw: row,
          };
        });

      const enrolledJourneyIds = new Set(enrollments.map((row) => row.journey_id));
      const journeyItems = [
        ...enrollments
          .filter((row) => journeyMap[row.journey_id])
          .map((row) => {
            const journey = journeyMap[row.journey_id];
            return buildJourneyItem(journey, row);
          }),
        ...Object.values(journeyMap)
          .filter((journey) => !enrolledJourneyIds.has(journey.id))
          .map((journey) => buildJourneyItem(journey, null)),
      ];

      setItems([...courseItems, ...resourceItems, ...moduleItems, ...journeyItems]);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    load();
  }, [load]);

  // Learning Library dispatches this after an assignment is created.
  useEffect(() => {
    window.addEventListener("learningAssigned", load);
    return () => window.removeEventListener("learningAssigned", load);
  }, [load]);

  return { items, loading, reload: load };
}

function buildJourneyItem(journey, enrollment) {
  const contentItems = journey.content_structure?.length
    ? journey.content_structure
    : journey.learning_items || [];
  return {
    id: `journey:${enrollment?.id || journey.id}`,
    kind: "journey",
    refId: enrollment?.id || journey.id,
    title: journey.title,
    subtitle: journey.description,
    meta: [
      contentItems.length ? `${contentItems.length} items` : null,
      journey.type === "learning_path" ? "Sequenced" : "Any order",
      journey.experiences?.length ? `${journey.experiences.length} experiences` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    status: enrollment
      ? enrollment.status === "dropped"
        ? "in_progress"
        : enrollment.status || "not_started"
      : journey.status === "completed"
      ? "completed"
      : "not_started",
    percent: enrollment?.completion_percentage || 0,
    due_date: enrollment?.due_date || journey.target_date || null,
    contentProgress: enrollment?.content_progress || [],
    launch: { journey },
    raw: enrollment || journey,
  };
}