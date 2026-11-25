import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import useMyLearning from "@/hooks/useMyLearning";
import usePracticeStudio from "@/hooks/usePracticeStudio";
import useLearnerActions from "@/hooks/useLearnerActions";
import { rankDevelopmentItems } from "@/lib/nextStep";
import DevelopmentHeader from "@/components/development-home/DevelopmentHeader";
import NextStepCard from "@/components/development-home/NextStepCard";
import JourneySection from "@/components/development-home/JourneySection";
import LearningSection from "@/components/development-home/LearningSection";
import ExperienceSection from "@/components/development-home/ExperienceSection";
import RecordsSection from "@/components/development-home/RecordsSection";
import { SectionHeading } from "@/components/development-home/ui";
import DevelopmentProgressCard from "@/components/practice/DevelopmentProgressCard";
import PracticeStudio from "@/components/practice-first/PracticeStudio";
import PracticeSettings from "@/components/practice/PracticeSettings";
import ExperienceFormModal from "@/components/development/ExperienceFormModal";
import CreateDevelopmentPlanModal from "@/components/development/CreateDevelopmentPlanModal";
import DeleteJourneyDialog from "@/components/development/DeleteJourneyDialog";

const STATUS_RANK = { in_progress: 0, not_started: 1, completed: 2 };

/**
 * My Development — one next step, then the journeys, learning and experiences
 * that make it up, with practice kept close but quiet.
 */
export default function MyDevelopment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [experiences, setExperiences] = useState([]);
  const [loadingExperiences, setLoadingExperiences] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingJourney, setEditingJourney] = useState(null);
  const [deletingJourney, setDeletingJourney] = useState(null);
  const [showExpModal, setShowExpModal] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const email = user?.email || user?.data?.email;
  const { items, loading, reload } = useMyLearning();
  const { weekCount } = usePracticeStudio();
  const { open: openLearning, markComplete, busyId } = useLearnerActions({ onChanged: reload });

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
  const completedCount = items.filter((item) => item.status === "completed").length;
  const overallPercent = items.length ? Math.round((completedCount / items.length) * 100) : 0;

  const { ranked, overdue, dueSoon } = useMemo(() => rankDevelopmentItems(items), [items]);

  const openItem = (item) => {
    if (item.kind === "journey") {
      const journeyId = item.launch?.journey?.id;
      if (journeyId) navigate(`/journey/${journeyId}`);
      return;
    }
    openLearning(item);
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
    <div className="pf-canvas min-h-screen pb-12">
      <DevelopmentHeader
        percent={overallPercent}
        completedCount={completedCount}
        totalCount={items.length}
        activeJourneys={activeJourneys.length}
        activeLearning={activeLearning.length}
        sessionsThisWeek={weekCount}
        onSettingsClick={() => setShowSettings((prev) => !prev)}
      />

      {/* Next step + momentum */}
      <div className="mx-4 mt-5 grid items-stretch gap-4 sm:mx-6 sm:ml-12 lg:ml-16 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <NextStepCard
          items={ranked.slice(0, 5)}
          overdue={overdue}
          dueSoon={dueSoon}
          onOpen={openItem}
        />
        <DevelopmentProgressCard title="Momentum" hideLink />
      </div>

      <JourneySection
        items={journeyItems}
        loading={loading}
        onOpen={openItem}
        onEdit={openEdit}
        onDelete={(item) => setDeletingJourney(item.launch.journey)}
        canManage={(item) => item.launch?.journey?.author_email === email}
        onNew={openCreate}
      />

      <LearningSection
        items={learningItems}
        loading={loading}
        onOpen={openItem}
        onMarkComplete={markComplete}
        busyId={busyId}
      />

      <ExperienceSection
        experiences={experiences}
        loading={loadingExperiences}
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

      {/* Practice & tools — everything that was here before, kept quiet */}
      <section
        id="practice-tools"
        className="mx-4 mt-10 scroll-mt-6 sm:mx-6 sm:ml-12 lg:ml-16"
      >
        <SectionHeading
          eyebrow="Practice & tools"
          title="Keep the habit"
          subtitle="Short, structured practice — and the tools that turn it into action at work."
        />
        <PracticeStudio />
      </section>

      <RecordsSection email={email} />

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
                  aria-label="Close settings"
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