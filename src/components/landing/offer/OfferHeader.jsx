import React from "react";
import { ShieldCheck } from "lucide-react";

export default function OfferHeader() {
  return (
    <header className="w-full bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="px-2 py-1 rounded text-xs font-bold tracking-wider"
            style={{ backgroundColor: "#0202ff" }}
          >
            CL
          </span>
          <div className="leading-tight">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-white">CURIOSITY LED</p>
            <p className="text-[10px] tracking-[0.15em] text-gray-400">LEADERSHIP REBOOT DIAGNOSTIC</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-gray-300" />
          <span className="text-xs tracking-wide text-gray-300">Private Assessment</span>
        </div>
      </div>
    </header>
  );
}