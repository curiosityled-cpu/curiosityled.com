import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Shield } from "lucide-react";

export default function DiagnosticHeader({ onBack, showBack }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <img
              src="https://raw.githubusercontent.com/curiosityled-cpu/curiosityled.com/main/public/CuriosityLedLogoBBW%20(1).png"
              alt="Curiosity Led"
              className="h-10 object-contain"
            />
          )}
        </div>
        <div className="flex items-center gap-1.5" style={{ color: "#0202ff" }}>
          <Shield className="w-4 h-4" />
          <span className="text-xs font-medium">Private Assessment</span>
        </div>
      </div>
    </header>
  );
}