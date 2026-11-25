import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import useMyLearning from "@/hooks/useMyLearning";
import usePracticeStudio from "@/hooks/usePracticeStudio";
import useLearnerActions from "@/hooks/useLearnerActions";
import { dueMeta } from "@/lib/learning";
import DevHomeHeader from "@/components/development-home/DevHomeHeader";
import NextActionCard from "@/components/development-home/NextActionCard";
import MomentumCard from "@/components/development-home/MomentumCard";
import JourneyPreviewRow from "@/components/development-home/JourneyPreviewRow";
import LearningRows from "@/components/development-home/LearningRows";
import ExperienceRows from "@/components/development-home/ExperienceRows";
import PracticeToolsGrid from "@/components/development-home/PracticeToolsGrid";
import { DevSection } from "@/components/development-home/DevSection";
import PracticeStudio from "@/components/practice-first/PracticeStudio";
import PracticeSettings from "@/components/practice/PracticeSettings";
import DevelopRecord from "@/components/practice-first/DevelopRecord";
import EarnedBadgesCard from "@/components/gamification/EarnedBadgesCard";
import MyCertificatesCard from "@/components/learning/MyCertificatesCard";
import MyLearningRecord from "@/components/learning/MyLearningRecord";
import ExperienceFormModal from "@/components/development/ExperienceFormModal";
import CreateDevelopmentPlanModal from "@/components/development/CreateDevelopmentPlanModal";
import DeleteJourneyDialog from "@/components/development/DeleteJourneyDialog";

const STATUS_RANK = { in_progress: 0, not_started: 1, completed: 2 };

/**
 * The single next action. Deliberately deterministic and auditable:
 *   1. something already started (resume before suggesting anything new)
 *   2. the most overdue required work
 *   3. the soonest due date
 *   4. the furthest along, then title, so the result never flickers
 */
function selectNextAction(items) {
  const open = items.filter((item) => item.status !== "completed");
  if (!open.length) return null;
  const started = (item) => (item.status === "in_progress" ? 0 : 1);
  const overdue = (item) => (dueMeta(item.due_date)?.tone === "danger" ? 0 : 1);
  const dueAt = (item) =>
    item.due_date ? new Date(item.due_date).getTime() : Number.MAX_SAFE_INTEGER;

  return [...open].sort(
    (a, b) =>
      started(a) - started(b) ||
      overdue(a) - overdue(b) ||
      dueAt(a) - dueAt(b) ||
      (b.percent || 0) - (a.percent || 0) ||
      String(a.title).localeCompare(String(b.title))
  )[0];
}

/**
 * My Development — one pathway: the next useful step, momentum, journeys,
 * courses, experiences and practice tools, in that order.
 */
export default function MyDevelopment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [experiences, setExperiences] = useState([]);
  const [loadingExperiences, setLoadingExperiences] = useState(true);
  const [showCompletedLearning, setShowCompletedLearning] = useState(false);
  const [showCompletedExperiences, setShowCompletedExperiences] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingJourney, setEditingJourney] = useState(null);
  const [deletingJourney, setDeletingJourney] = useState(null);
  const [showExpModal, setShowExpModal] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeFlow, setActiveFlow] = useState(null);

  const email = user?.email || user?.data?.email;
  const { items, loading, reload } = useMyLearning();
  const { weekCount } = usePracticeStudio();
  const { open, markComplete, busyId } = useLearnerActions({ onChanged: reload });

  const loadExperiences = useCallback(async () => {
    if (!email) {
      setLoadingExperiences(false);
      return;
    }
    try {
      setExperiences(await base44.entities.DevelopmentExperience.list("-created_date"));
    } catch (error) {
      console.error("Error loading experiences:", error);
    } finally {
      setLoadingExperiences(false);
    }
  }, [email]);

  useEffect(() => {
    loadExperiences();
  }, [loadExperiences]);

  const journeyItems = useMemo(
    () =>
      items
        .filter((item) => item.kind === "journey")
        .sort((a, b) => (STATUS_RANK[a.status] ?? 1) - (STATUS_RANK[b.status] ?? 1)),
    [items]
  );
  const learningItems = useMemo(() => items.filter((item) => item.kind !== "journey"), [items]);

  const activeJourneys = journeyItems.filter((item) => item.status !== "completed");
  const activeLearning = learningItems.filter((item) => item.status !== "completed");
  const completedLearning = learningItems.filter((item) => item.status === "completed");
  const completedCount = items.filter((item) => item.status === "completed").length;
  const overdueCount = items.filter(
    (item) => item.status !== "completed" && dueMeta(item.due_date)?.tone === "danger"
  ).length;

  const nextAction = useMemo(() => selectNextAction(items), [items]);

  const activeExperiences = experiences.filter(
    (exp) => exp.status !== "completed" && exp.status !== "cancelled"
  );
  const completedExperiences = experiences.filter((exp) => exp.status === "completed");
  const shownExperiences = showCompletedExperiences ? completedExperiences : activeExperiences;

  // Journeys open their own detail route; everything else goes through the
  // shared learner actions so resume/mark-in-progress behave as before.
  const openItem = (item) => {
    if (item.kind === "journey") {
      navigate(`/journey/${item.launch.journey.id}`);
      return;
    }
    open(item);
  };

  const openCreate = () => {
    setEditingJourney(null);
    setShowModal(true);
  };
  const openEdit = (item) => {
    setEditingJourney(item.launch.journey);
    setShowModal(true);
  };
  const openExperience = () => {
    setEditingExp(null);
    setShowExpModal(true);
  };

  return (
    <div className="pf-canvas relative min-h-screen pb-14">
      <div className="mx-auto w-full max-w-[1240px] px-4 pt-5 sm:px-6 lg:px-8">
        <DevHomeHeader
          activeJourneys={activeJourneys.length}
          activeLearning={activeLearning.length}
          sessionsThisWeek={weekCount}
          onSettingsClick={() => setShowSettings((s) => !s)}
        />

        {/* Next action + momentum */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <NextActionCard item={nextAction} onOpen={openItem} />
          </div>
          <MomentumCard
            completed={completedCount}
            total={items.length}
            nextTitle={nextAction?.title}
            overdue={overdueCount}
            sessionsThisWeek={weekCount}
          />
        </div>

        {/* Journeys */}
        <div className="mt-8">
          <JourneyPreviewRow
            items={journeyItems}
            onOpen={openItem}
            onEdit={openEdit}
            onDelete={(item) => setDeletingJourney(item.launch.journey)}
            canManage={(item) => item.launch?.journey?.author_email === email}
            onNewJourney={openCreate}
          />
        </div>

        {/* Courses and experiences */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <LearningRows
            items={showCompletedLearning ? completedLearning : activeLearning}
            loading={loading}
            showCompleted={showCompletedLearning}
            onToggleCompleted={() => setShowCompletedLearning((prev) => !prev)}
            onOpen={openItem}
            onMarkComplete={markComplete}
            busyId={busyId}
          />

          <ExperienceRows
            experiences={shownExperiences}
            loading={loadingExperiences}
            showCompleted={showCompletedExperiences}
            onToggleCompleted={() => setShowCompletedExperiences((prev) => !prev)}
            onLog={openExperience}
            onEdit={(exp) => {
              setEditingExp(exp);
              setShowExpModal(true);
            }}
            onDelete={async (exp) => {
              await base44.entities.DevelopmentExperience.delete(exp.id);
              loadExperiences();
            }}
            onAdopt={loadExperiences}
          />
        </div>

        {/* Practice and tools */}
        <div className="mt-8">
          <DevSection
            title="Practice"
            subtitle="Short, structured sessions you can run in a few minutes."
          >
            <PracticeToolsGrid onStartFlow={setActiveFlow} />
          </DevSection>

          <div className="mt-4">
            <PracticeStudio
              activeFlow={activeFlow}
              onStartFlow={setActiveFlow}
              onCloseFlow={() => setActiveFlow(null)}
            />
          </div>
        </div>

        {/* Achievements */}
        <div className="mt-8">
          <DevSection
            title="Achievements"
            subtitle="Badges earned, certificates issued and your complete learning record."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <EarnedBadgesCard />
              <MyCertificatesCard />
            </div>

            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--pf-muted)]">
                Learning Records
              </p>
              <p className="mt-0.5 text-xs leading-[1.4] text-[var(--pf-muted)]">
                Every completion across journeys, courses, conversations and experiences —
                exportable as CSV or PDF.
              </p>
            </div>

            <div className="mt-2">
              <DevelopRecord title="Learning Record" defaultOpen={false}>
                <MyLearningRecord email={email} items={items} experiences={experiences} />
              </DevelopRecord>
            </div>
          </DevSection>
        </div>
      </div>

      {/* ── Settings slide-out ── */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md overflow-y-auto bg-background shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-5 py-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[#0202ff]" />
                  <p className="text-sm font-semibold text-foreground">Practice Settings</p>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-5">
                <PracticeSettings />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ExperienceFormModal
        open={showExpModal}
        onClose={() => {
          setShowExpModal(false);
          setEditingExp(null);
        }}
        onSaved={() => {
          setShowExpModal(false);
          setEditingExp(null);
          loadExperiences();
        }}
        experience={editingExp}
        userEmail={email}
      />

      <DeleteJourneyDialog
        open={!!deletingJourney}
        onClose={() => setDeletingJourney(null)}
        plan={deletingJourney}
        onDeleted={() => {
          setDeletingJourney(null);
          reload();
        }}
      />

      <CreateDevelopmentPlanModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingJourney(null);
        }}
        onSaved={() => {
          setShowModal(false);
          setEditingJourney(null);
          reload();
        }}
        userEmail={email}
        plan={editingJourney}
      />
    </div>
  );
}