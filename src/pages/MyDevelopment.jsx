import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Layers, GraduationCap, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import LearningInbox from "@/components/learning/LearningInbox";
import JourneyInbox from "@/components/learning/JourneyInbox";
import CertificateViewer from "@/components/learning/CertificateViewer";
import ExperienceCard from "@/components/development/ExperienceCard";
import useMyLearning from "@/hooks/useMyLearning";
import ExperienceFormModal from "@/components/development/ExperienceFormModal";
import CreateDevelopmentPlanModal from "@/components/development/CreateDevelopmentPlanModal";
import DeleteJourneyDialog from "@/components/development/DeleteJourneyDialog";

export default function MyDevelopment() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [experiences, setExperiences] = useState([]);
  const [loadingExperiences, setLoadingExperiences] = useState(true);
  const [section, setSection] = useState(searchParams.get("tab") === "learning" ? "learning" : "journeys");
  const [activeTab, setActiveTab] = useState("active");
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

  const journeyItems = items.filter((item) => item.kind === "journey");
  const learningItems = items.filter((item) => item.kind !== "journey");
  const completedJourneys = journeyItems.filter((item) => item.status === "completed");
  const activeJourneys = journeyItems.filter((item) => item.status !== "completed");
  const activeLearning = learningItems.filter((item) => item.status !== "completed");

  const activeExperiences = experiences.filter((e) => e.status !== "completed" && e.status !== "cancelled");
  const completedExperiences = experiences.filter((e) => e.status === "completed");

  const stats = [
    { label: "Active Journeys", value: activeJourneys.length, color: "text-purple-600" },
    { label: "Active Learning", value: activeLearning.length, color: "text-blue-600" },
    { label: "Experiences", value: experiences.length, color: "text-amber-600" },
  ];

  const openCreate = () => {
    setEditingJourney(null);
    setShowModal(true);
  };
  const openEdit = (item) => {
    setEditingJourney(item.launch.journey);
    setShowModal(true);
  };

  const activeCount =
    section === "journeys"
      ? activeJourneys.length
      : section === "learning"
      ? activeLearning.length
      : activeExperiences.length;
  const completedCount =
    section === "journeys"
      ? completedJourneys.length
      : section === "learning"
      ? learningItems.length - activeLearning.length
      : completedExperiences.length;

  const SECTIONS = [
    { id: "journeys", label: "Journeys", Icon: Layers },
    { id: "learning", label: "Learning Progress", Icon: GraduationCap },
    { id: "experiences", label: "Experiences", Icon: Star },
  ];

  return (
    <MVPPageLayout title="My Development" subtitle="Your journeys, learning and experiences in one place">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-sm border border-gray-100 rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {SECTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => {
                setSection(id);
                setActiveTab("active");
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg transition-all ${
                section === id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex gap-1 bg-gray-50 border border-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all ${
              activeTab === "active" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all ${
              activeTab === "completed" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>

        {section === "journeys" && (
          <JourneyInbox
            items={activeTab === "active" ? activeJourneys : completedJourneys}
            loading={loading}
            onCreate={activeTab === "active" ? openCreate : null}
            onEdit={openEdit}
            onDelete={(item) => setDeletingJourney(item.launch.journey)}
            onChanged={reload}
          />
        )}

        {section === "learning" && (
          <>
            {activeTab === "completed" && <CertificateViewer />}
            <LearningInbox status={activeTab} />
          </>
        )}

        {section === "experiences" && (
          <div className="space-y-3">
            {(activeTab === "active" ? activeExperiences : completedExperiences).map((exp, index) => (
              <ExperienceCard
                key={exp.id}
                exp={exp}
                index={index}
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
            ))}
            {loadingExperiences && <div className="h-24 rounded-2xl border border-gray-100 bg-white animate-pulse" />}
            {!loadingExperiences &&
              (activeTab === "active" ? activeExperiences : completedExperiences).length === 0 && (
                <Card className="shadow-sm border border-gray-100 rounded-2xl">
                  <CardContent className="p-8 text-center">
                    <Star className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="font-semibold text-gray-800">
                      {activeTab === "active" ? "No active experiences" : "No completed experiences yet"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1 mb-4">
                      Log coaching, stretch projects, mentorship and more.
                    </p>
                    {activeTab === "active" && (
                      <button
                        onClick={() => {
                          setEditingExp(null);
                          setShowExpModal(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#0202ff] px-4 py-2 text-sm font-medium text-white hover:bg-[#0101dd]"
                      >
                        Log experience
                      </button>
                    )}
                  </CardContent>
                </Card>
              )}
          </div>
        )}
      </motion.div>

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