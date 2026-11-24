import React, { useMemo } from "react";
import { Compass, Dumbbell } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import useMyLearning from "@/hooks/useMyLearning";
import usePracticeWeek from "@/hooks/usePracticeWeek";
import DevelopHero from "@/components/develop/DevelopHero";
import DevelopAreaCard from "@/components/develop/DevelopAreaCard";

const STATUS_RANK = { in_progress: 0, not_started: 1, completed: 2 };

/**
 * Develop — the single destination for a learner's growth, made of two equal
 * areas: My Journey (the path) and Practice (building the skills for it).
 */
export default function Develop() {
  const { user } = useAuth();
  const { items, loading } = useMyLearning();
  const { weekCount, total: practiceTotal, loading: loadingPractice } = usePracticeWeek();

  const email = user?.email || user?.data?.email;

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
  const completedCount =
    journeyItems.filter((item) => item.status === "completed").length +
    learningItems.filter((item) => item.status === "completed").length;
  const overallPercent = items.length ? Math.round((completedCount / items.length) * 100) : 0;

  const firstName = (() => {
    const raw = user?.display_name || user?.data?.display_name || user?.full_name;
    return raw && raw.trim() && !raw.includes("@") ? raw.split(" ")[0] : null;
  })();

  // The same "next thing" the Journey area leads with, surfaced on the hub.
  const journeyNext = useMemo(() => {
    const journey = activeJourneys.find((item) => item.status === "in_progress") || activeJourneys[0];
    if (journey) return `Continue ${journey.title}`;
    const course = activeLearning.find((item) => item.launch?.to);
    if (course) return `Continue ${course.title}`;
    return email ? "Pick a journey or a course to begin" : null;
  }, [activeJourneys, activeLearning, email]);

  return (
    <MVPPageLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <DevelopHero
          firstName={firstName}
          journeyPercent={overallPercent}
          activeJourneys={activeJourneys.length}
          activeLearning={activeLearning.length}
          practiceThisWeek={weekCount}
        />
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <DevelopAreaCard
          icon={Compass}
          kicker="The path"
          title="My Journey"
          description="Journeys, courses, resources and experiences — the longer arc of your development, with everything you've completed along the way."
          stats={[
            {
              value: loading ? "—" : activeJourneys.length,
              label: "Journeys active",
            },
            {
              value: loading ? "—" : activeLearning.length,
              label: "Learning active",
            },
            {
              value: loading ? "—" : completedCount,
              label: "Completed",
            },
          ]}
          nextAction={loading ? null : journeyNext}
          ctaLabel="Open My Journey"
          to="/develop/journey"
        />

        <DevelopAreaCard
          icon={Dumbbell}
          kicker="The workout"
          title="Practice"
          description="Coaching flows, short workouts and leadership tools — the reps that turn what you know into what you do under pressure."
          stats={[
            {
              value: loadingPractice ? "—" : weekCount,
              label: "This week",
            },
            {
              value: loadingPractice ? "—" : practiceTotal,
              label: "All time",
            },
          ]}
          nextAction={
            weekCount > 0 ? "Keep your rhythm — start another workout" : "Start your first workout this week"
          }
          ctaLabel="Open Practice"
          to="/practice"
        />
      </motion.section>
    </MVPPageLayout>
  );
}