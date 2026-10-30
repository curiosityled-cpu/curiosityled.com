import React, { useState } from "react";
import { ChevronDown, MessageSquare, ShieldCheck, Compass } from "lucide-react";
import {
  MANAGER_OBLIGATIONS,
  CONVERSATIONS,
  GUARDRAILS,
  WHEN_NOT_NOW,
} from "@/components/succession/enablement/enablementContent";

function ConversationCard({ item, isOpen, onToggle }) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50"
        aria-expanded={isOpen}
      >
        <MessageSquare className="w-4 h-4 text-[#0202ff] mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{item.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{item.when}</p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-0 space-y-3 border-t border-gray-100">
          <p className="text-sm text-gray-700 pt-3">{item.purpose}</p>
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Framing</p>
            <p className="text-sm text-gray-700 mt-1">{item.frame}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Questions worth asking
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {item.questions.map((q) => (
                <li key={q} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-gray-300">–</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
            {item.avoid}
          </p>
        </div>
      )}
    </div>
  );
}

export default function EnablementKitView() {
  const [open, setOpen] = useState(CONVERSATIONS[0]?.key || null);

  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-lg bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
            <Compass className="w-4 h-4 text-[#0202ff]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Your part in the succession cycle
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              A cycle only produces something usable if line managers contribute the material
              nobody else has: what they saw, what the person actually did, and what is still
              missing. This kit covers what you are asked for, how to hold the conversations, and
              the lines that do not move.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">What we ask of you</h4>
        <div className="grid gap-3 md:grid-cols-2">
          {MANAGER_OBLIGATIONS.map((item) => (
            <div key={item.title} className="border border-gray-200 rounded-lg bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">
                  {item.stage}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1.5">{item.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">The five conversations</h4>
        <div className="space-y-2">
          {CONVERSATIONS.map((item) => (
            <ConversationCard
              key={item.key}
              item={item}
              isOpen={open === item.key}
              onToggle={() => setOpen(open === item.key ? null : item.key)}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="border border-gray-200 rounded-lg bg-white p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-semibold text-gray-900">Lines that do not move</h4>
          </div>
          <ul className="mt-2 space-y-2">
            {GUARDRAILS.map((g) => (
              <li key={g.title}>
                <p className="text-sm font-medium text-gray-800">{g.title}</p>
                <p className="text-sm text-gray-600">{g.body}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="border border-gray-200 rounded-lg bg-white p-4">
          <h4 className="text-sm font-semibold text-gray-900">When the answer is not yet</h4>
          <ul className="mt-2 space-y-2">
            {WHEN_NOT_NOW.map((g) => (
              <li key={g.title}>
                <p className="text-sm font-medium text-gray-800">{g.title}</p>
                <p className="text-sm text-gray-600">{g.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}