import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Award, MessageSquare, Eye, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const EVIDENCE_META = {
  accomplishment: { icon: Award, color: "text-green-600 bg-green-50", label: "Accomplishment" },
  feedback: { icon: MessageSquare, color: "text-blue-600 bg-blue-50", label: "Feedback" },
  context: { icon: Eye, color: "text-gray-600 bg-gray-50", label: "Context" },
  concern: { icon: AlertTriangle, color: "text-amber-600 bg-amber-50", label: "Concern" },
};

export default function EvidenceSection({ employeeEmail }) {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvidence = async () => {
      try {
        const goals = await base44.entities.Goal.filter({
          assigned_to_emails: { $in: [employeeEmail] },
        }, "-created_date", 20);

        const allEvidence = [];
        goals.forEach(goal => {
          (goal.evidence_entries || []).forEach(entry => {
            allEvidence.push({ ...entry, goal_title: goal.title, goal_id: goal.id });
          });
        });

        allEvidence.sort((a, b) => new Date(b.date || b.added_at || 0) - new Date(a.date || a.added_at || 0));
        setEvidence(allEvidence.slice(0, 10));
      } catch (e) {
        setEvidence([]);
      } finally {
        setLoading(false);
      }
    };
    if (employeeEmail) loadEvidence();
  }, [employeeEmail]);

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" /></div>;

  if (evidence.length === 0) {
    return <p className="text-xs text-gray-400 py-2">No evidence entries documented for this employee this period.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-400 mb-2">
        {evidence.length} evidence {evidence.length === 1 ? "entry" : "entries"} from goals — these should inform your assessment
      </p>
      {evidence.map((entry, i) => {
        const meta = EVIDENCE_META[entry.note_type] || EVIDENCE_META.context;
        const Icon = meta.icon;
        return (
          <div key={entry.id || i} className="flex items-start gap-2.5 p-2.5 border border-gray-100 rounded-lg">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
                <span className="text-[10px] text-gray-400">
                  {entry.date ? new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                </span>
                {entry.source && entry.source !== "manual" && (
                  <Badge variant="outline" className="text-[10px] text-gray-500">{entry.source}</Badge>
                )}
              </div>
              <p className="text-xs text-gray-700 mt-1">{entry.description}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">From: {entry.goal_title}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}