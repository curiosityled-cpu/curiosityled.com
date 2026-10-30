import React from "react";
import { BookOpen, Lock, Archive } from "lucide-react";
import { STAGES } from "@/components/succession/guided/stageConfig";
import {
  METHOD_PRINCIPLES,
  STAGE_EXIT_CRITERIA,
  GATES,
  EVIDENCE_RULES,
  DECISION_RULES,
  NOT_DONE,
  RECORD_KEPT,
} from "@/components/succession/methodologyContent";

function SectionTitle({ children }) {
  return (
    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
      {children}
    </h4>
  );
}

export default function MethodologyView() {
  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-lg bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-[#0202ff]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              How this method works, and what it refuses to do
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Nine stages, each with an exit condition. Two people are required for any
              decision. Every consequential step lands on a record that is written once and never
              edited. This page is the description of that method as the system actually enforces
              it.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {METHOD_PRINCIPLES.map((p) => (
          <div key={p.title} className="border border-gray-200 rounded-lg bg-white p-4">
            <p className="text-sm font-semibold text-gray-900">{p.title}</p>
            <p className="text-sm text-gray-600 mt-1.5">{p.body}</p>
          </div>
        ))}
      </div>

      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <SectionTitle>The nine stages and their exit conditions</SectionTitle>
        </div>
        <div className="divide-y divide-gray-100">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <div key={stage.key} className="px-4 py-3 flex gap-3">
                <div className="flex flex-col items-center w-6 flex-shrink-0">
                  <span className="text-[11px] font-semibold text-gray-400">{index + 1}</span>
                  {Icon && <Icon className="w-3.5 h-3.5 text-gray-400 mt-0.5" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{stage.label}</p>
                  <p className="text-sm text-gray-600">{stage.description}</p>
                  <p className="text-sm text-gray-800 mt-1.5">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2">
                      Exits when
                    </span>
                    {STAGE_EXIT_CRITERIA[stage.key] || "Exit condition not documented."}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-500" />
          <SectionTitle>Gates the system enforces</SectionTitle>
        </div>
        <div className="divide-y divide-gray-100">
          {GATES.map((gate) => (
            <div key={gate.name} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">{gate.name}</p>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-right">
                  blocks {gate.blocks}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{gate.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="border border-gray-200 rounded-lg bg-white p-4">
          <SectionTitle>Rules of evidence</SectionTitle>
          <ul className="space-y-1.5">
            {EVIDENCE_RULES.map((rule) => (
              <li key={rule} className="text-sm text-gray-600 flex gap-2">
                <span className="text-gray-300">–</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-gray-200 rounded-lg bg-white p-4">
          <SectionTitle>Rules of decision</SectionTitle>
          <ul className="space-y-1.5">
            {DECISION_RULES.map((rule) => (
              <li key={rule} className="text-sm text-gray-600 flex gap-2">
                <span className="text-gray-300">–</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="border border-gray-200 rounded-lg bg-white p-4">
          <SectionTitle>What this method does not do</SectionTitle>
          <ul className="space-y-1.5">
            {NOT_DONE.map((item) => (
              <li key={item} className="text-sm text-gray-600 flex gap-2">
                <span className="text-gray-300">–</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-gray-200 rounded-lg bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Archive className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              What stays on the record
            </h4>
          </div>
          <ul className="space-y-2">
            {RECORD_KEPT.map((item) => (
              <li key={item.title}>
                <p className="text-sm font-medium text-gray-800">{item.title}</p>
                <p className="text-sm text-gray-600">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}