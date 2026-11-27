import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Clock, Layers, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { dueMeta, DUE_TONE_CLASSES } from "@/lib/learning";
import {
  journeySteps,
  progressByContentId,
  journeyProgressPatch,
  nextContentItem,
  contentItemId,
} from "@/lib/journeyProgress";
import JourneyTrail from "@/components/journey-trail/JourneyTrail";
import JourneyFinish from "@/components/journey-trail/JourneyFinish";
import { cn } from "@/lib/utils";

const RECORD_ID = /^[0-9a-f]{24}$/i;

/**
 * One journey, seen as a trail: every step in the order it was authored, each one
 * opening in place, and a single progress rule for the whole path.
 */
export default function JourneyDetail() {
  const { journeyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const email = user?.email || user?.data?.email;

  const [journey, setJourney] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [resources, setResources] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  const load = useCallback(async () => {
    if (!journeyId || !email) return;
    setLoading(true);
    try {
      const rows = await base44.entities.Journey.filter({ id: journeyId });
      const found = rows?.[0] || null;
      setJourney(found);
      if (!found) return;

      const resourceIds = [
        ...new Set(journeySteps(found).filter((step) => step.kind === "resource").map((step) => step.id)),
      ].filter((id) => typeof id === "string" && RECORD_ID.test(id));

      const [enrollmentRows, resourceRows] = await Promise.all([
        base44.entities.JourneyEnrollment
          .filter({ journey_id: journeyId, user_email: email })
          .catch(() => []),
        resourceIds.length
          ? base44.entities.LearningResource.filter({ id: { $in: resourceIds } }).catch(() => [])
          : Promise.resolve([]),
      ]);

      setEnrollment(enrollmentRows?.[0] || null);
      setResources(
        Object.fromEntries((Array.isArray(resourceRows) ? resourceRows : []).map((row) => [row.id, row]))
      );
    } catch (error) {
      console.error("Journey load error:", error);
      toast.error("Could not load this journey");
    } finally {
      setLoading(false);
    }
  }, [journeyId, email]);

  useEffect(() => {
    load();
  }, [load]);

  const steps = useMemo(() => (journey ? journeySteps(journey) : []), [journey]);
  const progressMap = useMemo(
    () => progressByContentId(enrollment?.content_progress),
    [enrollment]
  );
  const due = dueMeta(enrollment?.due_date || journey?.target_date);
  const next = useMemo(
    () => (journey ? nextContentItem(journey, enrollment?.content_progress) : null),
    [journey, enrollment]
  );

  // One rule for the whole path: the required learning steps. Optional steps and
  // the experiences that run alongside are never counted against completion.
  const requiredSteps = useMemo(
    () => steps.filter((step) => step.kind === "resource" && !step.optional),
    [steps]
  );
  const doneRequired = requiredSteps.filter((step) => progressMap[step.id] === "completed").length;
  const percent = requiredSteps.length
    ? Math.round((doneRequired / requiredSteps.length) * 100)
    : 0;
  const isComplete = requiredSteps.length > 0 && doneRequired === requiredSteps.length;

  // A sequential learning path holds back a step until the ones before it are done.
  const lockedKeys = useMemo(() => {
    if (journey?.type !== "learning_path") return new Set();
    const locked = new Set();
    let blocked = false;
    steps.forEach((step) => {
      if (blocked && step.sequential) locked.add(step.key);
      if (step.sequential && progressMap[step.id] !== "completed") blocked = true;
    });
    return locked;
  }, [journey, steps, progressMap]);

  const toggleStep = async (step) => {
    if (step.kind !== "resource" || !step.id) return;
    const nowComplete = progressMap[step.id] !== "completed";
    const patch = journeyProgressPatch(journey, enrollment?.content_progress, step.id, nowComplete);

    setBusyKey(step.key);
    try {
      const saved = enrollment?.id
        ? await base44.entities.JourneyEnrollment.update(enrollment.id, patch)
        : await base44.entities.JourneyEnrollment.create({
            journey_id: journey.id,
            user_email: email,
            enrolled_date: new Date().toISOString(),
            enrolled_by: email,
            started_date: new Date().toISOString(),
            ...patch,
          });
      setEnrollment(saved?.id ? saved : { ...(enrollment || {}), ...patch });
      toast.success(nowComplete ? "Step complete" : "Marked as not started");
    } catch (error) {
      console.error("Journey progress error:", error);
      toast.error("Could not update this journey");
    } finally {
      setBusyKey(null);
    }
  };

  const startSignal = (step) => {
    if (step.id) navigate(`/signal/${step.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading journey…
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Layers className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="font-medium text-foreground">This journey is not available.</p>
        <Link
          to="/my-development"
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#0202ff] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to my development
        </Link>
      </div>
    );
  }

  return (
    <div className="pf-canvas min-h-screen pb-16">
      <div className="mx-auto w-full max-w-4xl px-4 pt-5 sm:px-6 lg:px-8">
        <Link
          to="/my-development"
          className="inline-flex items-center gap-2 text-sm text-[var(--pf-muted)] transition-colors hover:text-[var(--pf-text)]"
        >
          <ArrowLeft className="h-4 w-4" /> My development
        </Link>

        {/* Journey overview */}
        <div className="mt-4 overflow-hidden rounded-3xl border border-[var(--pf-soft-border)] bg-[var(--pf-surface)] shadow-sm">
          <div className="relative h-32 w-full sm:h-40">
            {journey.thumbnail_url ? (
              <img src={journey.thumbnail_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[#0202ff] via-[#2a1fd6] to-[#070a2b]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
            <div className="absolute bottom-3.5 left-4 right-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-white backdrop-blur">
                {journey.type === "learning_path" ? "Sequenced path" : "Curriculum"}
              </span>
              {due && (
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] text-white backdrop-blur">
                  {due.label}
                </span>
              )}
              {isComplete && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-medium text-white">
                  <CheckCircle2 className="h-3 w-3" /> Completed
                </span>
              )}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-[var(--pf-text)]">
              {journey.title}
            </h1>
            {journey.description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--pf-muted)]">
                {journey.description}
              </p>
            )}

            {(journey.target_competencies || []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(journey.target_competencies || []).slice(0, 6).map((competency) => (
                  <span
                    key={competency}
                    className="rounded-full border border-[var(--pf-soft-border)] bg-[var(--pf-soft)] px-2 py-0.5 text-[11px] text-[var(--pf-muted)]"
                  >
                    {competency}
                  </span>
                ))}
              </div>
            )}

            {/* One progress number for the whole path */}
            <div className="mt-5 rounded-2xl border border-[var(--pf-soft-border)] bg-[var(--pf-panel)] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-[var(--pf-text)]">
                  {isComplete
                    ? "Every required step is done"
                    : `${doneRequired} of ${requiredSteps.length} required steps complete`}
                </p>
                <p className="text-xs font-bold tabular-nums text-[var(--pf-text)]">{percent}%</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--pf-soft)]">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isComplete ? "bg-emerald-500" : "bg-[#0202ff]"
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
              {due && (
                <p
                  className={cn(
                    "mt-2.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                    DUE_TONE_CLASSES[due.tone]
                  )}
                >
                  <Clock className="h-3 w-3" /> {due.label}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Finish line */}
        {isComplete && (
          <div className="mt-5">
            <JourneyFinish
              journey={journey}
              stepCount={doneRequired}
              competencies={journey.target_competencies || []}
            />
          </div>
        )}

        {/* The trail */}
        <div className="mt-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[var(--pf-text)]">Your path</h2>
              <p className="text-xs text-[var(--pf-muted)]">
                {isComplete
                  ? "You can revisit any step."
                  : "Open a step to work on it here — you won't lose your place."}
              </p>
            </div>
            {next && !isComplete && (
              <span className="hidden text-[11px] text-[var(--pf-muted)] sm:block">
                Next up: {next.title || "continue the path"}
              </span>
            )}
          </div>

          {steps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--pf-soft-border)] bg-[var(--pf-surface)] p-10 text-center">
              <Layers className="mx-auto mb-3 h-8 w-8 text-[var(--pf-muted)]/40" />
              <p className="text-sm font-medium text-[var(--pf-text)]">This journey has no steps yet</p>
              <p className="mt-1 text-xs text-[var(--pf-muted)]">
                Its owner can add learning resources, signals and experiences.
              </p>
            </div>
          ) : (
            <JourneyTrail
              steps={steps}
              progressMap={progressMap}
              lockedKeys={lockedKeys}
              nextId={next ? contentItemId(next) : null}
              resources={resources}
              busyKey={busyKey}
              onToggle={toggleStep}
              onStartSignal={startSignal}
            />
          )}
        </div>
      </div>
    </div>
  );
}