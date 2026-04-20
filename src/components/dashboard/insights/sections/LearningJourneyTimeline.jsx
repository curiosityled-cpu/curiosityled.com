import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  GripVertical,
  X,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Plus,
  Loader2,
  Info,
  Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EXPERIENCE_TYPE_EMOJI = {
  leadership_coaching: "🎯",
  stretch_project: "🚀",
  leadership_opportunity: "⭐",
  mentorship: "🤝",
  conference_event: "🎤",
  volunteer_leadership: "🌱",
  cross_functional_project: "🔗",
  speaking_opportunity: "📢",
  other: "💡",
};

// Competency → assessment score key
const COMP_SCORE_MAP = {
  "Situational Intelligence": "si_pct",
  "Decision Making": "dm_pct",
  "Communication": "comm_pct",
  "Resource Management": "rm_pct",
  "Stakeholder Management": "sm_pct",
  "Performance Management": "pm_pct",
};

// Estimated score boost per completed course (conservative)
const BOOST_PER_COURSE = 4;

// Generate the next N month labels from today
function getMonthLabels(count = 6) {
  const months = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("default", { month: "short", year: "2-digit" }),
    });
  }
  return months;
}

function ScoreBar({ current, target, projected, label }) {
  const gap = Math.max(0, target - current);
  const boost = Math.min(gap, projected - current);
  const pct = (v) => Math.min(100, Math.max(0, v));

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-700 truncate max-w-[130px]">{label}</span>
        <div className="flex items-center gap-2 text-xs shrink-0">
          <span className="text-gray-500">Now: <span className="font-semibold text-gray-800">{current}%</span></span>
          {projected > current && (
            <span className="text-emerald-600 font-semibold">+{projected - current}% projected</span>
          )}
          <span className="text-gray-400">Target: {target}%</span>
        </div>
      </div>
      <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
        {/* Current score */}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${pct(current)}%`, background: "linear-gradient(to right, #0012ff, #3b30ff)" }}
        />
        {/* Projected boost */}
        {boost > 0 && (
          <div
            className="absolute top-0 h-full rounded-r-full transition-all duration-500"
            style={{
              left: `${pct(current)}%`,
              width: `${pct(boost)}%`,
              background: "linear-gradient(to right, #10b981, #34d399)",
              opacity: 0.85,
            }}
          />
        )}
        {/* Target line */}
        <div
          className="absolute top-0 h-full w-0.5 bg-amber-500"
          style={{ left: `${pct(target)}%` }}
        />
      </div>
    </div>
  );
}

function CourseChip({ course, monthKey, onRemove }) {
  const isExperience = course._kind === "experience";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("courseId", course.id);
        e.dataTransfer.setData("fromMonth", monthKey);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`group flex items-start gap-1.5 p-2 rounded-lg border text-xs cursor-grab active:cursor-grabbing
        ${isExperience
          ? "bg-amber-50 border-amber-200 hover:border-amber-400"
          : "bg-white border-blue-100 hover:border-blue-300"}
        shadow-sm hover:shadow-md transition-all`}
    >
      {isExperience ? (
        <span className="text-sm shrink-0">{EXPERIENCE_TYPE_EMOJI[course.type] || "💡"}</span>
      ) : (
        <GripVertical className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 leading-tight line-clamp-2">{course.title}</p>
        {course.competencies?.[0] && (
          <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium
            ${isExperience ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-600"}`}>
            {course.competencies[0]}
          </span>
        )}
        {!isExperience && course.duration_string && (
          <span className="ml-1 text-gray-400 text-[10px]">{course.duration_string}</span>
        )}
        {isExperience && (
          <span className="ml-1 text-amber-600 text-[10px] font-semibold">+{course.expected_impact || 5}%</span>
        )}
      </div>
      <button
        onClick={() => onRemove(course.id, monthKey)}
        className="opacity-0 group-hover:opacity-100 mt-0.5 p-0.5 rounded hover:bg-red-50 transition-opacity"
      >
        <X className="w-3 h-3 text-red-400" />
      </button>
    </motion.div>
  );
}

function MonthColumn({ month, courses, onDrop, onRemove, dragOverMonth, setDragOverMonth }) {
  const isOver = dragOverMonth === month.key;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverMonth(month.key);
  };

  const handleDragLeave = () => setDragOverMonth(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const courseId = e.dataTransfer.getData("courseId");
    const fromMonth = e.dataTransfer.getData("fromMonth");
    setDragOverMonth(null);
    if (courseId) onDrop(courseId, fromMonth, month.key);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col min-h-[120px] rounded-xl border-2 transition-all duration-200
        ${isOver
          ? "border-blue-400 bg-blue-50 shadow-inner"
          : "border-dashed border-gray-200 bg-gray-50/50 hover:border-gray-300"
        }`}
    >
      <div className="px-2 py-1.5 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs font-bold text-gray-600">{month.label}</span>
        {courses.length > 0 && (
          <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-0">
            {courses.length}
          </Badge>
        )}
      </div>
      <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto max-h-40">
        <AnimatePresence>
          {courses.map((c) => (
            <CourseChip key={c.id} course={c} monthKey={month.key} onRemove={onRemove} />
          ))}
        </AnimatePresence>
        {courses.length === 0 && (
          <div className={`flex flex-col items-center justify-center h-16 text-gray-300 text-[10px] transition-colors ${isOver ? "text-blue-400" : ""}`}>
            <Plus className="w-4 h-4 mb-1" />
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

export default function LearningJourneyTimeline({ assessment, user }) {
  const [availableCourses, setAvailableCourses] = useState([]);
  const [userExperiences, setUserExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState({}); // { "2025-05": [course, ...], ... }
  const [dragOverMonth, setDragOverMonth] = useState(null);
  const [showTray, setShowTray] = useState(false);
  const [trayFilter, setTrayFilter] = useState(null);
  const [trayTab, setTrayTab] = useState("courses"); // "courses" | "experiences"

  const months = getMonthLabels(6);

  // Competency scores from assessment
  const compScores = Object.entries(COMP_SCORE_MAP).map(([name, key]) => ({
    name,
    current: assessment?.[key] ?? 0,
    target: 75, // default target
  }));

  const placedItemIds = new Set(Object.values(plan).flat().map((c) => c.id));

  const boostedScores = compScores.map((c) => {
    const placedItems = Object.values(plan).flat().filter((item) =>
      item.competencies?.includes(c.name)
    );
    const courseBoost = placedItems.filter((i) => i._kind !== "experience").length * BOOST_PER_COURSE;
    const expBoost = placedItems
      .filter((i) => i._kind === "experience")
      .reduce((sum, e) => sum + (e.expected_impact || 5), 0);
    return { ...c, projected: Math.min(100, c.current + courseBoost + expBoost) };
  });

  useEffect(() => {
    loadData();
  }, [assessment?.id, user?.email]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resources, exps] = await Promise.all([
        base44.entities.LearningResource.filter({ provider: "LinkedIn Learning", is_active: true }),
        user?.email ? base44.entities.DevelopmentExperience.filter({ user_email: user.email }) : Promise.resolve([]),
      ]);
      const relevant = resources.filter((r) =>
        r.competencies?.some((c) => COMP_SCORE_MAP[c] !== undefined)
      );
      setAvailableCourses(relevant);
      // Tag experiences so we can distinguish them in the timeline
      const tagged = exps.map((e) => ({ ...e, _kind: "experience" }));
      setUserExperiences(tagged);

      // Pre-populate plan with experiences that already have a planned_month
      const prePlanned = {};
      tagged.forEach((e) => {
        if (e.planned_month) {
          prePlanned[e.planned_month] = [...(prePlanned[e.planned_month] || []), e];
        }
      });
      setPlan((prev) => {
        // Merge: keep user-dragged courses, add pre-planned experiences
        const merged = { ...prev };
        Object.entries(prePlanned).forEach(([month, items]) => {
          const existingIds = new Set((merged[month] || []).map((x) => x.id));
          items.forEach((item) => {
            if (!existingIds.has(item.id)) {
              merged[month] = [...(merged[month] || []), item];
            }
          });
        });
        return merged;
      });
    } catch (e) {
      console.warn("[LearningJourneyTimeline]", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDropOnMonth = (courseId, fromMonth, toMonth) => {
    if (fromMonth === toMonth) return;

    let course = null;

    if (fromMonth === "tray") {
      course = [...availableCourses, ...userExperiences].find((c) => c.id === courseId);
    } else {
      const fromList = plan[fromMonth] || [];
      course = fromList.find((c) => c.id === courseId);
    }

    if (!course) return;

    setPlan((prev) => {
      const next = { ...prev };
      // Remove from old month
      if (fromMonth !== "tray" && next[fromMonth]) {
        next[fromMonth] = next[fromMonth].filter((c) => c.id !== courseId);
      }
      // Add to new month (avoid duplicates)
      const toList = next[toMonth] || [];
      if (!toList.find((c) => c.id === courseId)) {
        next[toMonth] = [...toList, course];
      }
      return next;
    });
  };

  const handleDropOnTray = (courseId, fromMonth) => {
    if (fromMonth === "tray") return;
    setPlan((prev) => {
      const next = { ...prev };
      if (next[fromMonth]) {
        next[fromMonth] = next[fromMonth].filter((c) => c.id !== courseId);
      }
      return next;
    });
  };

  const handleRemoveCourse = (courseId, monthKey) => {
    setPlan((prev) => ({
      ...prev,
      [monthKey]: (prev[monthKey] || []).filter((c) => c.id !== courseId),
    }));
  };

  const totalPlaced = Object.values(plan).flat().length;
  const projectedOverallBoost = Math.round(
    boostedScores.reduce((sum, c) => sum + (c.projected - c.current), 0) / boostedScores.length
  );

  const filteredTray = trayFilter
    ? availableCourses.filter((c) => c.competencies?.includes(trayFilter))
    : availableCourses.filter((c) => c.competencies?.some((cc) => COMP_SCORE_MAP[cc] !== undefined));

  const filteredExpTray = trayFilter
    ? userExperiences.filter((e) => e.competencies?.includes(trayFilter))
    : userExperiences;

  const gapCompetencies = [...compScores]
    .sort((a, b) => a.current - b.current)
    .slice(0, 3)
    .map((c) => c.name);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
        <span className="text-sm text-gray-400">Loading learning modules...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-semibold text-gray-800">Learning Journey Planner</span>
          {totalPlaced > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              +{projectedOverallBoost}% avg projected gain
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Drag courses into months to plan your journey
          </span>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={() => setShowTray((v) => !v)}
          >
            <BookOpen className="w-3 h-3 mr-1" />
            {showTray ? "Hide" : "Browse"} Courses
          </Button>
        </div>
      </div>

      {/* Competency Score Bars */}
      <div className="grid md:grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
        <div className="md:col-span-2 flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Competency Gap vs Target</span>
          <div className="flex items-center gap-3 ml-auto text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: "linear-gradient(to right, #0012ff, #3b30ff)" }} /> Current</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-emerald-400" /> Projected gain</span>
            <span className="flex items-center gap-1"><span className="inline-block w-0.5 h-3 bg-amber-500" /> Target</span>
          </div>
        </div>
        {boostedScores.map((c) => (
          <ScoreBar key={c.name} label={c.name} current={c.current} target={c.target} projected={c.projected} />
        ))}
      </div>

      {/* Course Tray */}
      <AnimatePresence>
        {showTray && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-3"
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
              onDrop={(e) => {
                e.preventDefault();
                const courseId = e.dataTransfer.getData("courseId");
                const fromMonth = e.dataTransfer.getData("fromMonth");
                handleDropOnTray(courseId, fromMonth);
              }}
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-bold text-indigo-700">Available Courses</span>
                <span className="text-[10px] text-gray-400">— drag into a month below, or drop here to remove</span>
                <div className="flex gap-1 flex-wrap ml-auto">
                  <button
                    onClick={() => setTrayFilter(null)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${!trayFilter ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-300 text-gray-500 hover:border-indigo-400"}`}
                  >
                    All
                  </button>
                  {gapCompetencies.map((comp) => (
                    <button
                      key={comp}
                      onClick={() => setTrayFilter(trayFilter === comp ? null : comp)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${trayFilter === comp ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-300 text-gray-500 hover:border-indigo-400"}`}
                    >
                      {comp}
                    </button>
                  ))}
                </div>
              </div>
              {/* Tab switcher */}
              <div className="flex gap-1 mb-2">
                <button
                  onClick={() => setTrayTab("courses")}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${trayTab === "courses" ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-300 text-gray-500 hover:border-indigo-400"}`}
                >
                  📚 Courses ({filteredTray.length})
                </button>
                <button
                  onClick={() => setTrayTab("experiences")}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${trayTab === "experiences" ? "bg-amber-500 text-white border-amber-500" : "border-gray-300 text-gray-500 hover:border-amber-400"}`}
                >
                  ⭐ My Experiences ({filteredExpTray.length})
                </button>
              </div>

              <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto">
                {trayTab === "courses" && filteredTray.map((course) => {
                  const alreadyPlaced = placedItemIds.has(course.id);
                  return (
                    <div
                      key={course.id}
                      draggable={!alreadyPlaced}
                      onDragStart={(e) => {
                        if (alreadyPlaced) { e.preventDefault(); return; }
                        e.dataTransfer.setData("courseId", course.id);
                        e.dataTransfer.setData("fromMonth", "tray");
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all
                        ${alreadyPlaced
                          ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                          : "bg-white border-indigo-100 text-gray-700 cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-sm"
                        }`}
                    >
                      <GripVertical className="w-3 h-3 text-gray-300 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-medium block truncate max-w-[140px]">{course.title}</span>
                        <span className="text-[10px] text-indigo-500 block">{course.competencies?.[0]}</span>
                      </div>
                      {alreadyPlaced && <Badge className="text-[9px] px-1 py-0 bg-emerald-100 text-emerald-600 border-0 ml-1 shrink-0">planned</Badge>}
                    </div>
                  );
                })}

                {trayTab === "experiences" && filteredExpTray.map((exp) => {
                  const alreadyPlaced = placedItemIds.has(exp.id);
                  return (
                    <div
                      key={exp.id}
                      draggable={!alreadyPlaced}
                      onDragStart={(e) => {
                        if (alreadyPlaced) { e.preventDefault(); return; }
                        e.dataTransfer.setData("courseId", exp.id);
                        e.dataTransfer.setData("fromMonth", "tray");
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all
                        ${alreadyPlaced
                          ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                          : "bg-amber-50 border-amber-200 text-gray-700 cursor-grab active:cursor-grabbing hover:border-amber-400 hover:shadow-sm"
                        }`}
                    >
                      <span className="text-base shrink-0">{EXPERIENCE_TYPE_EMOJI[exp.type] || "💡"}</span>
                      <div className="min-w-0">
                        <span className="font-medium block truncate max-w-[140px]">{exp.title}</span>
                        <span className="text-[10px] text-amber-600 block">{exp.competencies?.[0]} · +{exp.expected_impact || 5}%</span>
                      </div>
                      {alreadyPlaced && <Badge className="text-[9px] px-1 py-0 bg-emerald-100 text-emerald-600 border-0 ml-1 shrink-0">planned</Badge>}
                    </div>
                  );
                })}

                {trayTab === "experiences" && filteredExpTray.length === 0 && (
                  <p className="text-xs text-gray-400 py-2">No experiences added yet. Use the "Off-Platform Experiences" section below to add some.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Month columns */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {months.map((month) => (
          <MonthColumn
            key={month.key}
            month={month}
            courses={plan[month.key] || []}
            onDrop={handleDropOnMonth}
            onRemove={handleRemoveCourse}
            dragOverMonth={dragOverMonth}
            setDragOverMonth={setDragOverMonth}
          />
        ))}
      </div>

      {/* Summary */}
      {totalPlaced > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm"
        >
          <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-emerald-700">
            <span className="font-semibold">{totalPlaced} course{totalPlaced !== 1 ? "s" : ""} planned</span> across {Object.values(plan).filter((v) => v.length > 0).length} month{Object.values(plan).filter((v) => v.length > 0).length !== 1 ? "s" : ""}
            {projectedOverallBoost > 0 && ` — estimated +${projectedOverallBoost}% avg competency gain on completion`}.
          </span>
          <ChevronRight className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />
        </motion.div>
      )}
    </div>
  );
}