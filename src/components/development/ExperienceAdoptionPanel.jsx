import React, { useState } from "react";
import { Target, BookOpen, Plus, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Coachee-side adoption panel for a coaching experience.
 * Renders captured goals and recommended learning captured by the coach,
 * with "Add to my goals" / "Add to my learning" actions. Only the coachee
 * can adopt — the coach cannot push items into the coachee's lists.
 *
 * @param {object} exp - the DevelopmentExperience record
 * @param {Function} onAdopted - called after a successful adoption (to reload)
 */
export default function ExperienceAdoptionPanel({ exp, onAdopted }) {
  const [busyId, setBusyId] = useState(null);

  const adoptGoal = async (goal) => {
    if (goal.adopted_by_coachee) return;
    setBusyId(goal.id);
    try {
      const me = await base44.auth.me();
      const myEmail = me?.email;
      if (!myEmail) throw new Error("Could not determine your account.");
      const newGoal = await base44.entities.Goal.create({
        title: goal.title,
        goal_type: "coaching_goal",
        coach_email: exp.coach_email || null,
        assigned_to_emails: [myEmail],
        timeframe_end: goal.target_date || "",
        status: "active",
        visibility: "private",
        client_id: me?.client_id || me?.data?.client_id || null,
      });
      const updatedGoals = (exp.captured_goals || []).map((g) =>
        g.id === goal.id ? { ...g, adopted_by_coachee: true, linked_goal_id: newGoal.id } : g
      );
      await base44.entities.DevelopmentExperience.update(exp.id, { captured_goals: updatedGoals });
      toast.success("Added to your goals");
      onAdopted?.();
    } catch (e) {
      console.error(e);
      toast.error("Could not add to goals");
    } finally {
      setBusyId(null);
    }
  };

  const adoptLearning = async (item) => {
    if (item.adopted_by_coachee) return;
    setBusyId(item.id);
    try {
      const me = await base44.auth.me();
      const myEmail = me?.email;
      if (!myEmail) throw new Error("Could not determine your account.");
      const newAssignment = await base44.entities.AssignedLearning.create({
        title: item.resource_title,
        description: item.reason || "",
        user_email: myEmail,
        status: "assigned",
        resource_url: item.resource_url || "",
        client_id: me?.client_id || me?.data?.client_id || null,
      });
      const updatedLearning = (exp.recommended_learning || []).map((r) =>
        r.id === item.id ? { ...r, adopted_by_coachee: true, linked_assigned_learning_id: newAssignment.id } : r
      );
      await base44.entities.DevelopmentExperience.update(exp.id, { recommended_learning: updatedLearning });
      toast.success("Added to your learning");
      onAdopted?.();
    } catch (e) {
      console.error(e);
      toast.error("Could not add to learning");
    } finally {
      setBusyId(null);
    }
  };

  const hasGoals = (exp.captured_goals || []).length > 0;
  const hasLearning = (exp.recommended_learning || []).length > 0;

  return (
    <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
      {hasGoals && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <Target className="w-3 h-3" /> Agreed-Upon Goals
          </p>
          <div className="space-y-1.5">
            {exp.captured_goals.map((g) => (
              <div key={g.id} className="flex items-center gap-2 bg-blue-50/50 border border-blue-100 rounded-lg px-2.5 py-1.5">
                <Target className="w-3 h-3 text-[#0202ff] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{g.title}</p>
                  {g.target_date && <p className="text-[10px] text-gray-500">Due {new Date(g.target_date).toLocaleDateString()}</p>}
                </div>
                {g.adopted_by_coachee ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium flex-shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Added
                  </span>
                ) : (
                  <button
                    onClick={() => adoptGoal(g)}
                    disabled={busyId === g.id}
                    className="text-[10px] font-medium text-[#0202ff] bg-white border border-[#0202ff]/30 rounded-full px-2 py-0.5 hover:bg-blue-50 transition-colors flex items-center gap-1 flex-shrink-0 disabled:opacity-50"
                  >
                    {busyId === g.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Add to my goals
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {hasLearning && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> Recommended Learning
          </p>
          <div className="space-y-1.5">
            {exp.recommended_learning.map((r) => (
              <div key={r.id} className="flex items-start gap-2 bg-emerald-50/50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
                <BookOpen className="w-3 h-3 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-medium text-gray-800 truncate">{r.resource_title}</p>
                    {r.resource_url && (
                      <a href={r.resource_url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-[#0202ff] flex-shrink-0">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {r.reason && <p className="text-[10px] text-gray-500 line-clamp-1">{r.reason}</p>}
                </div>
                {r.adopted_by_coachee ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Added
                  </span>
                ) : (
                  <button
                    onClick={() => adoptLearning(r)}
                    disabled={busyId === r.id}
                    className="text-[10px] font-medium text-emerald-600 bg-white border border-emerald-300 rounded-full px-2 py-0.5 hover:bg-emerald-50 transition-colors flex items-center gap-1 flex-shrink-0 mt-0.5 disabled:opacity-50"
                  >
                    {busyId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Add to my learning
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}