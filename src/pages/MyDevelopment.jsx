import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import useMyLearning from "@/hooks/useMyLearning";
import PracticeCanvasHero from "@/components/practice-first/PracticeCanvasHero";
import PracticeStudio from "@/components/practice-first/PracticeStudio";
import DevelopLibrary from "@/components/practice-first/DevelopLibrary";
import PracticeSettings from "@/components/practice/PracticeSettings";
import ExperienceFormModal from "@/components/development/ExperienceFormModal";
import CreateDevelopmentPlanModal from "@/components/development/CreateDevelopmentPlanModal";
import DeleteJourneyDialog from "@/components/development/DeleteJourneyDialog";

const STATUS_RANK = { in_progress: 0, not_started: 1, completed: 2 };

/**
 * Practice First — the learner's single development home. Practice sits at the
 * top as the immediate starting point; the Develop library below holds journeys,
 * courses, experiences and records.
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

  const email = user?.email || user?.data?.email;
  const { items, loading, reload } = useMyLearning();

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
  const completedCount =
    journeyItems.filter((item) => item.status === "completed").length +
    learningItems.filter((item) => item.status === "completed").length;
  const overallPercent = items.length ? Math.round((completedCount / items.length) * 100) : 0;

  const activeExperiences = experiences.filter((e) => e.status !== "completed" && e.status !== "cancelled");
  const completedExperiences = experiences.filter((e) => e.status === "completed");
  const shownExperiences = showCompletedExperiences ? completedExperiences : activeExperiences;

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
    <div className="pf-canvas relative min-h-screen overflow-hidden pb-10">
      {/* Copper thread traced from the banner down through Practice into Develop */}
      <div
        className="pointer-events-none absolute left-10 top-[300px] hidden h-[1380px] w-[3px] rounded-[2px] lg:block"
        style={{
          background: "linear-gradient(#E1A45E,#E1A45E 60%,rgba(225,164,94,.2))",
          transformOrigin: "top",
          animation: "pf-draw 1.6s ease-out both",
        }}
      />

      <PracticeCanvasHero
        percent={overallPercent}
        activeJourneys={activeJourneys.length}
        activeLearning={activeLearning.length}
        onSettingsClick={() => setShowSettings((s) => !s)}
      />

      <div
        className="relative mx-4 mt-7 sm:mx-6 sm:ml-12 lg:ml-16"
        style={{ animation: "pf-rise .8s ease-out both", animationDelay: ".3s" }}
      >
        <PracticeStudio />
      </div>

      <div
        className="relative mx-4 mt-[34px] sm:mx-6 sm:ml-12 lg:ml-16"
        style={{ animation: "pf-rise .8s ease-out both", animationDelay: ".55s" }}
      >
        <DevelopLibrary
          journeyItems={journeyItems}
          learningItems={showCompletedLearning ? completedLearning : activeLearning}
          showCompletedLearning={showCompletedLearning}
          onToggleCompletedLearning={() => setShowCompletedLearning((prev) => !prev)}
          experiences={shownExperiences}
          showCompletedExperiences={showCompletedExperiences}
          onToggleCompletedExperiences={() => setShowCompletedExperiences((prev) => !prev)}
          loading={loading}
          loadingExperiences={loadingExperiences}
          email={email}
          onOpenJourney={(item) => navigate(`/journey/${item.launch.journey.id}`)}
          onEditJourney={openEdit}
          onDeleteJourney={(item) => setDeletingJourney(item.launch.journey)}
          canManageJourney={(item) => item.launch?.journey?.author_email === email}
          onNewJourney={openCreate}
          onLearningChanged={reload}
          onLogExperience={openExperience}
          onEditExperience={(exp) => {
            setEditingExp(exp);
            setShowExpModal(true);
          }}
          onDeleteExperience={async (exp) => {
            await base44.entities.DevelopmentExperience.delete(exp.id);
            loadExperiences();
          }}
          onAdoptExperience={loadExperiences}
        />
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