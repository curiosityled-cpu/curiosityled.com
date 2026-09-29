import React from "react";
import { motion } from "framer-motion";
import { MessageSquareText, Video, FileText, CheckCircle2, Trophy, ArrowRight } from "lucide-react";

const features = [
  { icon: Video, title: "Media-embedded steps", body: "Video, articles, and PDFs woven into the conversation — not separate tabs." },
  { icon: CheckCircle2, title: "Knowledge checks inline", body: "Quizzes and assessments inside the flow, with results that write back to the platform." },
  { icon: Trophy, title: "Gamification built in", body: "Completion awards points, checks badges, and tracks progress per step." },
  { icon: FileText, title: "Prerequisite chaining", body: "Modules unlock when prerequisites are met — build a real curriculum." },
];

export default function LandingConversationalLearning() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-purple-100 bg-purple-50">
              <MessageSquareText className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Conversational Learning</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0a0a0a] mb-5 leading-tight">
              Not a better video.<br />A different relationship with the material.
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-8">
              Conversational learning is to eLearning what coaching is to training. Managers learn through dialogue — with a built-in AI coach, with media, and with knowledge checks — that produces a transcript of their actual thinking. That's behavioral data. That's evidence.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={i}
                    className="flex gap-3"
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "#f3e8ff" }}>
                      <Icon className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#0a0a0a] mb-0.5">{f.title}</div>
                      <div className="text-xs text-gray-500 leading-relaxed">{f.body}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Build it. Launch it in chat. Track it.</div>
              <p className="text-sm text-gray-600 leading-relaxed">
                L&D builds modules from internal expertise. Managers complete them through Teams or Slack — turn by turn, no login required. Progress, scores, and evidence write back automatically.
              </p>
            </div>
          </motion.div>

          {/* Right: Chat mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative"
          >
            <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-white">
              {/* Chat header */}
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center">
                  <MessageSquareText className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">Delegation in Practice</div>
                  <div className="text-[10px] text-gray-500">Conversational Learning Module · Step 3 of 7</div>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-purple-600" style={{ width: "43%" }} />
                  </div>
                  <span className="text-[10px] font-semibold text-gray-500">43%</span>
                </div>
              </div>

              {/* Chat body */}
              <div className="p-4 space-y-3 bg-white min-h-[360px]">
                {/* AI coach message */}
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[10px] font-bold">CL</span>
                  </div>
                  <div className="flex-1">
                    <div className="rounded-xl rounded-tl-sm bg-gray-50 border border-gray-100 p-3 text-sm text-gray-700 leading-relaxed">
                      Let's look at a real scenario. You have a direct report who's capable but keeps waiting for your sign-off. What's your first move?
                    </div>
                  </div>
                </div>

                {/* User response */}
                <div className="flex gap-2.5 justify-end">
                  <div className="flex-1 max-w-[80%]">
                    <div className="rounded-xl rounded-tr-sm p-3 text-sm text-white leading-relaxed" style={{ backgroundColor: "#0202ff" }}>
                      I'd set up a weekly check-in so they can walk me through what they're doing.
                    </div>
                  </div>
                </div>

                {/* AI coach follow-up + media */}
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[10px] font-bold">CL</span>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="rounded-xl rounded-tl-sm bg-gray-50 border border-gray-100 p-3 text-sm text-gray-700 leading-relaxed">
                      That keeps you in the loop — but does it build their confidence to decide without you? Watch this 90-second clip, then let's compare.
                    </div>
                    {/* Embedded media */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Video className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-800">The Delegation Trap — 90 sec</div>
                        <div className="text-[10px] text-gray-500">Watch, then return to the conversation</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with gamification */}
              <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px] font-medium text-gray-600">+25 points on completion</span>
                </div>
                <div className="text-[10px] text-gray-400">Evidence writes to Leadership Index</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}