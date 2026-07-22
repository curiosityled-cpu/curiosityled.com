import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, FileText } from "lucide-react";

export default function GeneratingStage({ firstName }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-[60vh] flex flex-col items-center justify-center px-6"
    >
      <div className="relative mb-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: "#0202ff" }}
        >
          <FileText className="w-8 h-8 text-white" />
        </div>
        <div className="absolute -bottom-1 -right-1">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#0202ff" }} />
        </div>
      </div>

      <h1 className="text-xl font-bold text-[#0a0a0a] mb-2 text-center">
        {firstName}, Assembling Your Blueprint…
      </h1>
      <p className="text-sm text-gray-500 text-center max-w-md">
        Scoring your 24 answers across 5 leadership constructs, identifying your top pressure points, and building your 90-day plan.
      </p>

      <div className="mt-8 flex items-center gap-6 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#0202ff" }} />
          Scoring
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          Selecting priorities
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          Building PDF
        </span>
      </div>
    </motion.div>
  );
}