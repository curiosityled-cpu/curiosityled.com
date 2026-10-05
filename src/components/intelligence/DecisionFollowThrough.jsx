import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Clock, AlertTriangle, Info } from "lucide-react";
import { motion } from "framer-motion";

/**
 * DecisionFollowThrough — shows organisational actions taken and their
 * associated aggregate signal changes. Helps executives discuss what they
 * tried and what they learned, without asserting the intervention caused
 * the change.
 *
 * Props:
 *  - actions: array of { id, label, date, signal, status, note }
 *  - onPromptAtreus: optional handler
 */
export default function DecisionFollowThrough({ actions = [], onPromptAtreus }) {
  if (actions.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl">
          <CardContent className="px-5 py-5">
            <div className="flex items-start gap-3 mb-3">
              <ArrowRight className="w-4 h-4 text-[#0202ff] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Decision & Follow-Through</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Track actions taken and whether the relevant aggregate signal changed afterward
                </p>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                No organisational actions have been logged yet. When you record an intervention — for example,
                a workload rebalance, coaching cohort, or role-clarity initiative — it will appear here with
                the subsequent aggregate signal trend, so leadership can discuss what was tried and what was
                learned.
              </p>
              {onPromptAtreus && (
                <button
                  onClick={() => onPromptAtreus("Help me define an organisational action to track against our leadership signals.")}
                  className="mt-2 text-xs text-[#0202ff] hover:underline font-medium"
                >
                  Ask Atreus to help define an action →
                </button>
              )}
            </div>
            <div className="mt-3 flex items-start gap-2">
              <Info className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Signal changes after an action are described as associations, not proven effects. Establishing
                causation requires a proper evaluation design with comparison groups.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl">
        <CardContent className="px-5 py-5">
          <div className="flex items-start gap-3 mb-4">
            <ArrowRight className="w-4 h-4 text-[#0202ff] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Decision & Follow-Through</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Actions taken and subsequent aggregate signal changes — associations, not proven effects
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {actions.map((action, idx) => {
              const statusIcon =
                action.status === "improved" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                : action.status === "pending" ? <Clock className="w-3.5 h-3.5 text-amber-500" />
                : <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />;
              const statusBadge =
                action.status === "improved" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : action.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-gray-50 text-gray-600 border-gray-200";

              return (
                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">{statusIcon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">{action.label}</p>
                      <Badge className={`text-[10px] border ${statusBadge} flex-shrink-0`}>
                        {action.status === "improved" ? "Signal improved" : action.status === "pending" ? "Too early" : "No change"}
                      </Badge>
                    </div>
                    {action.date && <p className="text-[10px] text-gray-400 mb-1">{action.date}</p>}
                    {action.signal && (
                      <p className="text-[11px] text-gray-600 leading-relaxed">
                        Tracking: <span className="font-medium">{action.signal}</span>
                      </p>
                    )}
                    {action.note && <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{action.note}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-2 border-t border-gray-100 flex items-start gap-2">
            <Info className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Signal changes after an action are described as associations, not proven effects. Establishing
              causation requires a proper evaluation design with comparison groups.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}