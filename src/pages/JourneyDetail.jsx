import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Layers,
  Loader2,
  Lock,
  MessageSquare,
  Sparkles,
  Target,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { openResource } from "@/lib/openResource";
import { dueMeta, DUE_TONE_CLASSES } from "@/lib/learning";
import {
  journeySteps,
  progressByContentId,
  journeyProgressPatch,
  nextContentItem,
} from "@/lib/journeyProgress";
import ProgressRing from "@/components/journey-home/ProgressRing";
import { cn } from "@/lib/utils";

const RECORD_ID = /^[0-9a-f]{24}$/i;

/**
 * One journey, seen as a trail: every step in order with its state, and an inline
 * panel for progress, optional missions and practice.
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
  const percent = Math.min(100, enrollment?.completion_percentage || 0);
  const due = dueMeta(enrollment?.due_date || journey?.target_date);
  const next = useMemo(
    () => (journey ? nextContentItem(journey, enrollment?.content_progress) : null),
    [journey, enrollment]
  );

  const resourceSteps = steps.filter((step) => step.kind === "resource");
  const doneSteps = resourceSteps.filter((step) => progressMap[step.id] === "completed").length;

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

  const openStep = async (step) => {
    if (lockedKeys.has(step.key)) return;
    if (step.kind === "signal" && step.id) {
      navigate(`/signal/${step.id}`);
      return;
    }
    if (step.kind === "resource") {
      const resource = resources[step.id];
      if (!resource) {
        toast.info("This step has no attached resource yet.");
        return;
      }
      const opened = await openResource(resource);
      if (!opened) toast.info("This resource has no link or file attached yet.");
    }
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

  const optionalSteps = steps.filter((step) => step.optional && progressMap[step.id] !== "completed");
  const complete = enrollment?.status === "completed";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Link
        to="/my-development"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> My development
      </Link>

      {/* Journey overview */}
      <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="relative h-36 w-full sm:h-44">
          {journey.thumbnail_url ? (
            <img src={journey.thumbnail_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#0202ff] via-[#2a1fd6] to-[#070a2b]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-white backdrop-blur">
              {journey.type === "learning_path" ? "Sequenced path" : "Curriculum"}
            </span>
            {due && (
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] text-white backdrop-blur">
                {due.label}
              </span>
            )}
            {complete && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-medium text-white">
                <CheckCircle2 className="h-3 w-3" /> Completed
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 max-w-2xl">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground">
              {journey.title}
            </h1>
            {journey.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{journey.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(journey.target_competencies || []).slice(0, 4).map((competency) => (
                <span
                  key={competency}
                  className="rounded-full border border-purple-100 bg-purple-50 px-2 py-0.5 text-[11px] text-purple-700"
                >
                  {competency}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 md:flex-col md:items-end">
            <ProgressRing percent={percent} size={84} stroke={8} />
            <p className="text-xs text-muted-foreground">
              {doneSteps} of {resourceSteps.length} learning steps
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* The trail */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-foreground">Your path</h2>
            <span className="text-xs text-muted-foreground">
              {next ? "Next step is ready" : "Everything is complete"}
            </span>
          </div>

          <ol className="relative space-y-2.5">
            {steps.map((step, index) => {
              const done = step.kind === "resource" && progressMap[step.id] === "completed";
              const locked = lockedKeys.has(step.key);
              const isNext = next && step.id && next.learning_resource_id === step.id;
              const busy = busyKey === step.key;
              const Icon = step.kind === "signal" ? MessageSquare : step.kind === "experience" ? Sparkles : Layers;

              return (
                <motion.li
                  key={step.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                >
                  <div
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border p-4 transition-colors",
                      locked
                        ? "border-dashed border-border bg-muted/40"
                        : done
                        ? "border-emerald-100 bg-emerald-50/50"
                        : isNext
                        ? "border-[#0202ff]/30 bg-[#0202ff]/5"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                          done
                            ? "bg-emerald-500 text-white"
                            : locked
                            ? "bg-muted text-muted-foreground"
                            : isNext
                            ? "bg-[#0202ff] text-white"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {done ? <CheckCircle2 className="h-4 w-4" /> : locked ? <Lock className="h-3.5 w-3.5" /> : index + 1}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <p
                          className={cn(
                            "text-sm font-semibold leading-snug",
                            done ? "text-muted-foreground line-through" : "text-foreground"
                          )}
                        >
                          {step.title}
                        </p>
                        {step.optional && (
                          <span className="rounded-full border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            Optional
                          </span>
                        )}
                        {isNext && !done && (
                          <span className="rounded-full bg-[#0202ff] px-1.5 py-0.5 text-[10px] font-medium text-white">
                            Up next
                          </span>
                        )}
                      </div>
                      {step.subtitle && (
                        <p className="mt-0.5 text-xs capitalize text-muted-foreground">{step.subtitle}</p>
                      )}
                      {step.kind === "experience" && step.entry?.provider_or_sponsor && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{step.entry.provider_or_sponsor}</p>
                      )}
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      {step.kind === "resource" && (
                        <button
                          type="button"
                          disabled={locked || busy}
                          onClick={() => toggleStep(step)}
                          title={done ? "Mark as not started" : "Mark done"}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : done ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {step.kind !== "experience" && (
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => openStep(step)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                        >
                          {locked ? "Locked" : done ? "Review" : "Open"}
                          {!locked && <ExternalLink className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ol>

          {steps.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <Layers className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">This journey has no steps yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Its owner can add learning resources, signals and experiences.
              </p>
            </div>
          )}
        </div>

        {/* Inline panel: progress, optional missions, practice */}
        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Where you are
            </p>
            <div className="mt-2">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", complete ? "bg-emerald-500" : "bg-[#0202ff]")}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">
                {complete ? "Journey complete" : `${percent}% complete`}
              </p>
              {due && (
                <p
                  className={cn(
                    "mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                    DUE_TONE_CLASSES[due.tone]
                  )}
                >
                  <Clock className="h-3 w-3" /> {due.label}
                </p>
              )}
            </div>

            {next && (
              <button
                type="button"
                onClick={() => openStep(steps.find((step) => step.id === next.learning_resource_id) || {})}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0202ff] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0101dd]"
              >
                Continue
              </button>
            )}
          </div>

          {optionalSteps.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Optional missions
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Extras you can take on — they don't hold up completion.
              </p>
              <ul className="mt-3 space-y-1.5">
                {optionalSteps.map((step) => (
                  <li key={step.key}>
                    <button
                      type="button"
                      onClick={() => openStep(step)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-muted"
                    >
                      <span className="truncate">{step.title}</span>
                      <Sparkles className="h-3 w-3 flex-shrink-0 text-amber-500" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Practice alongside
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Turn what you're learning into a 3–7 minute workout.
            </p>
            <Link
              to="/practice"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#0202ff] hover:underline"
            >
              <Target className="h-3.5 w-3.5" /> Open practice
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}