import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Layers, Plus, Pencil, Trash2, ChevronDown, ChevronUp, BookOpen, Briefcase, ExternalLink, CheckCircle2, Circle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { openResource } from "@/lib/openResource";
import { dueMeta } from "@/lib/learning";

const journeyContent = (journey) =>
  journey?.content_structure?.length ? journey.content_structure : journey?.learning_items || [];

const contentItemId = (entry) => entry?.learning_resource_id || entry?.resource_id;

/** Journeys the learner is part of, with their content and next action. */
export default function JourneyInbox({ items, loading, onCreate, onEdit, onDelete, onChanged }) {
  const { user } = useAuth();
  const email = user?.email || user?.data?.email;
  const [expandedId, setExpandedId] = useState(null);
  const [resources, setResources] = useState({});
  const [busyId, setBusyId] = useState(null);

  const journeys = useMemo(() => items, [items]);

  /** Marks one journey item done and recomputes the journey's completion. */
  const toggleItem = async (item, entry) => {
    const journey = item.launch.journey;
    const content = journeyContent(journey);
    const targetId = contentItemId(entry);
    if (!targetId || !email) return;

    const current = Object.fromEntries(
      (item.contentProgress || []).map((row) => [row.learning_resource_id, row.status])
    );
    const nowComplete = current[targetId] !== "completed";
    const progressEntries = content.map((contentEntry) => {
      const id = contentItemId(contentEntry);
      const isTarget = id === targetId;
      const status = isTarget
        ? nowComplete
          ? "completed"
          : "not_started"
        : current[id] || "not_started";
      return {
        learning_resource_id: id,
        status,
        ...(isTarget && nowComplete ? { completed_date: new Date().toISOString() } : {}),
      };
    });

    const required = content.filter((contentEntry) => !contentEntry.is_optional);
    const doneRequired = required.filter(
      (contentEntry) =>
        progressEntries.find((row) => row.learning_resource_id === contentItemId(contentEntry))
          ?.status === "completed"
    ).length;
    const percent = required.length ? Math.round((doneRequired / required.length) * 100) : 0;
    const patch = {
      content_progress: progressEntries,
      completion_percentage: percent,
      status: required.length && doneRequired === required.length ? "completed" : "in_progress",
    };

    setBusyId(item.id);
    try {
      const enrollmentId = item.raw?.journey_id ? item.raw.id : null;
      if (enrollmentId) {
        await base44.entities.JourneyEnrollment.update(enrollmentId, patch);
      } else {
        await base44.entities.JourneyEnrollment.create({
          journey_id: journey.id,
          user_email: email,
          enrolled_date: new Date().toISOString(),
          enrolled_by: email,
          started_date: new Date().toISOString(),
          ...patch,
        });
      }
      toast.success(nowComplete ? "Marked done" : "Marked as not started");
      await onChanged?.();
    } catch (error) {
      console.error("Journey progress error:", error);
      toast.error("Could not update this journey");
    } finally {
      setBusyId(null);
    }
  };

  const ensureResources = async (journey) => {
    const ids = [
      ...new Set(journeyContent(journey).map(contentItemId).filter(Boolean)),
    ].filter((id) => !resources[id]);
    if (!ids.length) return;
    try {
      const rows = await base44.entities.LearningResource.filter({ id: { $in: ids } });
      setResources((prev) => ({
        ...prev,
        ...Object.fromEntries((rows || []).map((row) => [row.id, row])),
      }));
    } catch (error) {
      console.error("Journey content load error:", error);
    }
  };

  const openItem = async (entry) => {
    const resource = resources[contentItemId(entry)];
    if (!resource) {
      toast.info("This item has no attached resource yet.");
      return;
    }
    const opened = await openResource(resource);
    if (!opened) toast.info("This resource has no link or file attached yet.");
  };

  const continueJourney = async (item) => {
    const journey = item.launch.journey;
    await ensureResources(journey);
    const progressById = Object.fromEntries(
      (item.contentProgress || []).map((row) => [row.learning_resource_id, row.status])
    );
    const next = journeyContent(journey).find(
      (entry) => progressById[contentItemId(entry)] !== "completed"
    );
    setExpandedId(item.id);
    if (next) await openItem(next);
  };

  const toggle = async (item) => {
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);
    await ensureResources(item.launch.journey);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((key) => (
          <div key={key} className="h-28 rounded-2xl border border-gray-100 bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {onCreate && (
        <Button size="sm" className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={onCreate}>
          <Plus className="w-4 h-4 mr-1.5" /> New Journey
        </Button>
      )}

      {journeys.length === 0 ? (
        <Card className="shadow-sm border border-gray-100 rounded-2xl">
          <CardContent className="p-8 text-center">
            <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-800">No journeys here</p>
            <p className="text-sm text-gray-500 mt-1">
              Create a journey combining coaching, projects, and learning resources.
            </p>
          </CardContent>
        </Card>
      ) : (
        journeys.map((item, index) => {
          const journey = item.launch.journey;
          const content = journeyContent(journey);
          const progressById = Object.fromEntries(
            (item.contentProgress || []).map((row) => [row.learning_resource_id, row.status])
          );
          const due = dueMeta(item.due_date);
          const expanded = expandedId === item.id;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium text-gray-900 leading-snug">{journey.title}</p>
                        {item.status && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700 capitalize">
                            {item.status.replace("_", " ")}
                          </span>
                        )}
                        {due && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-100">
                            {due.label}
                          </span>
                        )}
                      </div>
                      {journey.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{journey.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {journey.target_competencies?.slice(0, 3).map((competency) => (
                          <span
                            key={competency}
                            className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100"
                          >
                            {competency}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {journey.experiences?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3" /> {journey.experiences.length} experience
                            {journey.experiences.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {content.length > 0 && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> {content.length} resource
                            {content.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      {item.percent > 0 && (
                        <div className="mt-3">
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#0202ff] rounded-full" style={{ width: `${Math.min(100, item.percent)}%` }} />
                          </div>
                          <p className="mt-1 text-[11px] text-gray-500">{item.percent}% complete</p>
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {content.length > 0 && (
                          <Button size="sm" className="bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={() => continueJourney(item)}>
                            Continue
                          </Button>
                        )}
                        {content.length > 0 && (
                          <Button size="sm" variant="outline" onClick={() => toggle(item)}>
                            {expanded ? <ChevronUp className="w-4 h-4 mr-1.5" /> : <ChevronDown className="w-4 h-4 mr-1.5" />}
                            {expanded ? "Hide items" : `View ${content.length} items`}
                          </Button>
                        )}
                      </div>

                      {expanded && (
                        <div className="mt-3 space-y-1.5">
                          {content.map((entry, entryIndex) => {
                            const resource = resources[contentItemId(entry)];
                            const complete = progressById[contentItemId(entry)] === "completed";
                            return (
                              <div
                                key={entryIndex}
                                className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-2"
                              >
                                <button
                                  type="button"
                                  disabled={busyId === item.id}
                                  onClick={() => toggleItem(item, entry)}
                                  title={complete ? "Mark as not started" : "Mark done"}
                                  className="flex-shrink-0 disabled:opacity-50"
                                >
                                  {complete ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-gray-300 hover:text-emerald-500 transition-colors" />
                                  )}
                                </button>
                                <span className={`flex-1 text-xs truncate ${complete ? "text-gray-400 line-through" : "text-gray-700"}`}>
                                  {entry.title || resource?.title || "Learning resource"}
                                  {resource?.provider ? ` · ${resource.provider}` : ""}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openItem(entry)}
                                  className="text-[11px] font-medium text-[#0202ff] hover:underline flex items-center gap-1 flex-shrink-0"
                                >
                                  Open <ExternalLink className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {(onEdit || onDelete) && (
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        {onEdit && (
                          <button onClick={() => onEdit(item)} className="text-gray-400 hover:text-[#0202ff] transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button onClick={() => onDelete(item)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })
      )}
    </div>
  );
}