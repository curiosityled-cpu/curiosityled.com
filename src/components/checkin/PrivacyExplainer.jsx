/**
 * PrivacyExplainer — inline, compact, plain-language privacy card.
 * Designed to appear near check-ins and rhythm features — not buried in settings.
 * Reinforces trust with every interaction, not just on first launch.
 */
import React, { useState } from "react";
import { Shield, ChevronDown, ChevronUp, Lock, Eye, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const ITEMS = [
  {
    icon: Lock,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    label: "Always private to you",
    detail: "Your check-ins, energy levels, reflections, conversations with Atreus, confidence patterns, and identity notes never leave your private space.",
  },
  {
    icon: Eye,
    color: "text-blue-600",
    bg: "bg-blue-50",
    label: "Visible only if you choose",
    detail: "You can choose to share specific goals or a self-authored summary with your manager or HR — but only if you decide to. Nothing happens automatically.",
  },
  {
    icon: Users,
    color: "text-purple-600",
    bg: "bg-purple-50",
    label: "HR sees aggregates only",
    detail: "HR can only see anonymised group-level patterns — like 'managers in this team report high load' — and standard development data. Not your individual responses.",
  },
];

export default function PrivacyExplainer({ compact = false }) {
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Shield className="w-3 h-3 text-emerald-500 flex-shrink-0" />
        <span>Private to you · Not shared with HR or your manager</span>
        <Link to="/PrivacySettings" className="underline hover:text-gray-600 ml-auto flex-shrink-0">Learn more</Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-gray-900 text-left">What's private here?</p>
          <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">Always</span>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        }
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3 border-t border-gray-50">
              {ITEMS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-start gap-3 pt-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 mb-0.5">{item.label}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                );
              })}

              <div className="border-t border-gray-50 pt-3">
                <p className="text-xs text-gray-400 leading-relaxed">
                  This space is designed for honest self-reflection, not evaluation.
                  Nothing here is used in performance reviews or HR decisions.{" "}
                  <Link to="/PrivacySettings" className="text-[#0202ff] underline hover:text-[#0101dd]">
                    See full privacy settings →
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}