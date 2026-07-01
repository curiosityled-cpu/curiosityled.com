import React from "react";
import { Monitor, Shield, Lock, Zap } from "lucide-react";

const items = [
  { icon: Monitor, text: "Microsoft Teams Native" },
  { icon: Shield, text: "Support-First Design — Not Surveillance" },
  { icon: Lock, text: "Private by Default — Individual Data Never Shared" },
  { icon: Zap, text: "Works in the Flow of Work — No Portal Switching" },
];

export default function IndustryTrustStrip() {
  return (
    <div className="bg-[#0f0f1a] border-y border-white/10 py-4 px-6">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <React.Fragment key={i}>
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#6366f1] flex-shrink-0" />
                <span className="text-xs text-gray-300 font-medium whitespace-nowrap">{item.text}</span>
              </div>
              {i < items.length - 1 && (
                <div className="hidden md:block w-px h-4 bg-white/20" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}