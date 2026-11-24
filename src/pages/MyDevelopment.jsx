import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, Plus, Star } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import LearningShelf from "@/components/learning/LearningShelf";
import CertificateViewer from "@/components/learning/CertificateViewer";
import MyLearningRecord from "@/components/learning/MyLearningRecord";
import CollapsibleSection from "@/components/learning/CollapsibleSection";
import ExperienceShelfCard from "@/components/development/ExperienceShelfCard";
import ShelfCarousel from "@/components/journey-home/ShelfCarousel";
import useMyLearning from "@/hooks/useMyLearning";
import ExperienceFormModal from "@/components/development/ExperienceFormModal";
import CreateDevelopmentPlanModal from "@/components/development/CreateDevelopmentPlanModal";
import DeleteJourneyDialog from "@/components/development/DeleteJourneyDialog";
import JourneyHomeHero from "@/components/journey-home/JourneyHomeHero";
import JourneyCarousel from "@/components/journey-home/JourneyCarousel";
import SectionHeader from "@/components/journey-home/SectionHeader";
import AchievementsStrip from "@/components/journey-home/AchievementsStrip";
import DevelopAreaHeader from "@/components/develop/DevelopAreaHeader";

const STATUS_RANK = { in_progress: 0, not_started: 1, completed: 2 };

/**
 * Journey Home — the learner's development in one place: journeys to continue,
 * courses and resources to work through, and experiences they've taken on.
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

  const firstName = (() => {
    const raw = user?.display_name || user?.data?.display_name || user?.full_name;
    return raw && raw.trim() && !raw.includes("@") ? raw.split(" ")[0] : null;
  })();

  // The single next thing: a journey in progress, else an unfinished course, else a journey.
  const nextAction = useMemo(() => {
    const journey = activeJourneys.find((item) => item.status === "in_progress") || activeJourneys[0];
    const course = activeLearning.find((item) => item.launch?.to);
    if (journey) {
      return { to: `/journey/${journey.launch.journey.id}`, label: `Continue ${journey.title}` };
    }
    if (course) return { to: course.launch.to, label: `Continue ${course.title}` };
    return null;
  }, [activeJourneys, activeLearning]);

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

  return (
    <MVPPageLayout>
      <DevelopAreaHeader />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <JourneyHomeHero
          firstName={firstName}
          percent={overallPercent}
          activeJourneys={activeJourneys.length}
          activeLearning={activeLearning.length}
          nextAction={nextAction}
        />
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <SectionHeader
          title="My Journeys"
          subtitle="Multi-step development paths — resume where you left off."
          action={
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" /> New journey
            </button>
          }
        />

        {loading ? (
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-64 w-[280px] flex-shrink-0 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        ) : journeyItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Layers className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
            <p className="font-medium text-foreground">No journeys yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Journeys combine coaching, projects and learning into one path. Create one, or wait for
              your program team to assign one.
            </p>
          </div>
        ) : (
          <JourneyCarousel
            items={journeyItems}
            onOpen={(item) => navigate(`/journey/${item.launch.journey.id}`)}
            onEdit={openEdit}
            onDelete={(item) => setDeletingJourney(item.launch.journey)}
            canManage={(item) => item.launch?.journey?.author_email === email}
          />
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <SectionHeader
          title="My Courses & Learning"
          subtitle="Assigned courses, resources and conversations."
          action={
            <button
              type="button"
              onClick={() => setShowCompletedLearning((prev) => !prev)}
              className="text-xs font-medium text-[#0202ff] hover:underline"
            >
              {showCompletedLearning ? "Show active" : "Show completed"}
            </button>
          }
        />
        <LearningShelf
          items={showCompletedLearning ? completedLearning : activeLearning}
          loading={loading}
          onChanged={reload}
        />
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <SectionHeader
          title="My Experiences"
          subtitle="Coaching, stretch projects, mentorship and more."
          action={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCompletedExperiences((prev) => !prev)}
                className="text-xs font-medium text-[#0202ff] hover:underline"
              >
                {showCompletedExperiences ? "Show active" : "Show completed"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingExp(null);
                  setShowExpModal(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" /> Log experience
              </button>
            </div>
          }
        />

        {loadingExperiences ? (
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2].map((key) => (
              <div
                key={key}
                className="h-48 w-[280px] flex-shrink-0 animate-pulse rounded-2xl border border-border bg-card"
              />
            ))}
          </div>
        ) : shownExperiences.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Star className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
            <p className="font-medium text-foreground">
              {showCompletedExperiences ? "No completed experiences yet" : "No active experiences"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Log coaching, stretch projects, mentorship and more.
            </p>
            {!showCompletedExperiences && (
              <button
                type="button"
                onClick={() => {
                  setEditingExp(null);
                  setShowExpModal(true);
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0202ff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0101dd]"
              >
                Log experience
              </button>
            )}
          </div>
        ) : (
          <ShelfCarousel
            items={shownExperiences}
            renderItem={(exp) => (
              <ExperienceShelfCard
                exp={exp}
                onEdit={() => {
                  setEditingExp(exp);
                  setShowExpModal(true);
                }}
                onDelete={async () => {
                  await base44.entities.DevelopmentExperience.delete(exp.id);
                  loadExperiences();
                }}
                onAdopt={loadExperiences}
              />
            )}
          />
        )}
      </motion.section>

      <AchievementsStrip />

      <CollapsibleSection title="My certificates">
        <CertificateViewer />
      </CollapsibleSection>

      <CollapsibleSection title="My learning record">
        <MyLearningRecord email={email} />
      </CollapsibleSection>

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
    </MVPPageLayout>
  );
}