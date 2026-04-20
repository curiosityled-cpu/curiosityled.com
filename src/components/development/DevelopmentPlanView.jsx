import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import ExperienceFormModal from "./ExperienceFormModal";
import {
  Plus, Pencil, Trash2, CheckCircle2, Clock, PlayCircle,
  XCircle, BookOpen, GripVertical, Loader2, Target
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TYPE_META = {
  leadership_coaching:       { label: "Leadership Coaching",       emoji: "🎯", color: "bg-purple-100 text-purple-700" },
  stretch_project:           { label: "Stretch Project",           emoji: "🚀", color: "bg-blue-100 text-blue-700" },
  leadership_opportunity:    { label: "Leadership Opportunity",    emoji: "⭐", color: "bg-amber-100 text-amber-700" },
  mentorship:                { label: "Mentorship",                emoji: "🤝", color: "bg-green-100 text-green-700" },
  conference_event:          { label: "Conference / Event",        emoji: "🎤", color: "bg-pink-100 text-pink-700" },
  volunteer_leadership:      { label: "Volunteer Leadership",      emoji: "🌱", color: "bg-emerald-100 text-emerald-700" },
  cross_functional_project:  { label: "Cross-Functional Project",  emoji: "🔗", color: "bg-cyan-100 text-cyan-700" },
  speaking_opportunity:      { label: "Speaking Opportunity",      emoji: "📢", color: "bg-orange-100 text-orange-700" },
  other:                     { label: "Other",                     emoji: "💡", color: "bg-gray-100 text-gray-700" },
};

const STATUS_META = {
  planned:     { icon: Clock,        color: "text-gray-500",   label: "Planned" },
  in_progress: { icon: PlayCircle,   color: "text-blue-500",   label: "In Progress" },
  completed:   { icon: CheckCircle2, color: "text-emerald-500",label: "Completed" },
  cancelled:   { icon: XCircle,      color: "text-red-400",    label: "Cancelled" },
};

function ExperienceCard({ exp, onEdit, onDelete, onStatusChange }) {
  const meta = TYPE_META[exp.type] || TYPE_META.other;
  const status = STATUS_META[exp.status] || STATUS_META.planned;
  const StatusIcon = status.icon;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
      <Card className="border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0 mt-0.5">{meta.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-semibold text-gray-800 text-sm leading-tight">{exp.title}</h4>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onEdit(exp)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDelete(exp.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <Badge className={`${meta.color} border-0 text-xs px-2 py-0`}>{meta.label}</Badge>
                <div className={`flex items-center gap-1 text-xs ${status.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  <span>{status.label}</span>
                </div>
                {exp.planned_month && (
                  <span className="text-xs text-gray-400">
                    {new Date(exp.planned_month + "-01").toLocaleString("default", { month: "short", year: "numeric" })}
                  </span>
                )}
                {exp.expected_impact && (
                  <span className="text-xs font-semibold text-emerald-600">+{exp.expected_impact}% projected</span>
                )}
              </div>

              {exp.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-2">{exp.description}</p>
              )}

              {exp.competencies?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {exp.competencies.map((c) => (
                    <span key={c} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-medium">{c}</span>
                  ))}
                </div>
              )}

              {exp.provider_or_sponsor && (
                <p className="text-[11px] text-gray-400">via {exp.provider_or_sponsor}</p>
              )}

              {/* Quick status update */}
              {exp.status !== "completed" && exp.status !== "cancelled" && (
                <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-50">
                  {exp.status === "planned" && (
                    <button
                      onClick={() => onStatusChange(exp.id, "in_progress")}
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      Mark In Progress →
                    </button>
                  )}
                  {exp.status === "in_progress" && (
                    <button
                      onClick={() => onStatusChange(exp.id, "completed")}
                      className="text-[11px] text-emerald-600 hover:underline"
                    >
                      Mark Complete ✓
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DevelopmentPlanView({ user, assessment }) {
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    if (user?.email) loadExperiences();
  }, [user?.email]);

  const loadExperiences = async () => {
    setLoading(true);
    const data = await base44.entities.DevelopmentExperience.filter({ user_email: user.email }, "planned_month");
    setExperiences(data);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.DevelopmentExperience.delete(id);
    setExperiences((prev) => prev.filter((e) => e.id !== id));
  };

  const handleStatusChange = async (id, status) => {
    await base44.entities.DevelopmentExperience.update(id, { status });
    setExperiences((prev) => prev.map((e) => e.id === id ? { ...e, status } : e));
  };

  const handleEdit = (exp) => { setEditing(exp); setModalOpen(true); };
  const handleAdd = () => { setEditing(null); setModalOpen(true); };
  const handleSaved = () => { setModalOpen(false); loadExperiences(); };

  const filtered = filterStatus === "all"
    ? experiences
    : experiences.filter((e) => e.status === filterStatus);

  const stats = {
    total: experiences.length,
    completed: experiences.filter((e) => e.status === "completed").length,
    in_progress: experiences.filter((e) => e.status === "in_progress").length,
    planned: experiences.filter((e) => e.status === "planned").length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Off-Platform Experiences</h3>
          <p className="text-xs text-gray-500 mt-0.5">Coaching, stretch projects, leadership opportunities & more</p>
        </div>
        <Button size="sm" onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
          <Plus className="w-4 h-4" /> Add Experience
        </Button>
      </div>

      {/* Stats row */}
      {experiences.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { key: "all", label: "Total", val: stats.total, color: "text-gray-700" },
            { key: "planned", label: "Planned", val: stats.planned, color: "text-gray-500" },
            { key: "in_progress", label: "In Progress", val: stats.in_progress, color: "text-blue-600" },
            { key: "completed", label: "Completed", val: stats.completed, color: "text-emerald-600" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setFilterStatus(s.key)}
              className={`p-2 rounded-lg border text-center transition-all text-xs
                ${filterStatus === s.key ? "border-indigo-300 bg-indigo-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"}`}
            >
              <div className={`text-lg font-bold ${s.color}`}>{s.val}</div>
              <div className="text-gray-500">{s.label}</div>
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-gray-200 rounded-xl">
          <Target className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-sm font-medium text-gray-500">
            {filterStatus === "all" ? "No experiences added yet" : `No ${filterStatus.replace("_", " ")} experiences`}
          </p>
          {filterStatus === "all" && (
            <p className="text-xs text-gray-400 mt-1 mb-3 max-w-xs">
              Add coaching sessions, stretch projects, speaking opportunities and other off-platform growth activities.
            </p>
          )}
          {filterStatus === "all" && (
            <Button size="sm" variant="outline" onClick={handleAdd} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add your first experience
            </Button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          <AnimatePresence>
            {filtered.map((exp) => (
              <ExperienceCard
                key={exp.id}
                exp={exp}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <ExperienceFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        experience={editing}
        userEmail={user?.email}
      />
    </div>
  );
}