import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function NameStage({ onComplete, progress, onProgress }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    onProgress?.(8);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!firstName.trim()) return;
    onComplete({ firstName: firstName.trim(), lastName: lastName.trim() });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto px-6"
    >
      <div className="flex items-center justify-between mb-6">
        <p
          className="text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color: "#0202ff" }}
        >
          Before we start
        </p>
        <p className="text-xs text-gray-400">{Math.round(progress)}% · 01 / 06</p>
      </div>

      <div className="w-full h-1 bg-gray-100 rounded-full mb-10">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: "#0202ff" }}
        />
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight mb-4 text-[#0a0a0a]">
        First — What Should I Call You?
      </h1>
      <p className="text-base text-gray-600 mb-8">
        I'll use your name to personalize the questions and build your report as we go.
      </p>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 rounded-lg border border-gray-200 text-[#0a0a0a] focus:outline-none focus:border-[#0202ff] focus:ring-2 focus:ring-[#0202ff]/10 transition-all"
              style={{ backgroundColor: "#F2F5FF" }}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 text-[#0a0a0a] focus:outline-none focus:border-[#0202ff] focus:ring-2 focus:ring-[#0202ff]/10 transition-all"
              style={{ backgroundColor: "#F2F5FF" }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!firstName.trim()}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold text-white text-base transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
          style={{ backgroundColor: "#0202ff" }}
        >
          Start My Assessment
          <ArrowRight className="w-5 h-5" />
        </button>

        <p className="text-center text-xs text-gray-500 mt-4">
          24 Questions · About 3 Minutes · Straight Answers
        </p>
      </form>
    </motion.div>
  );
}