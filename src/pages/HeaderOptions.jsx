import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import HeaderShell from "@/components/header-options/HeaderShell";

const CONTENT = {
  date: "Tuesday, November 24",
  greeting: "Time for an evening workout, Emilio.",
  status: "No sessions yet this week — pick a workout and start a streak.",
  streak: 0,
};

const loop = { repeat: Infinity, ease: "easeInOut" };

const OPTIONS = [
  {
    name: "Ember Rise",
    note: "Near-black with warm embers drifting up from the floor.",
    accent: "#ff8a3d",
    layers: (
      <>
        <motion.div
          className="absolute -bottom-24 left-1/4 h-56 w-56 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(255,138,61,0.45), transparent 70%)",
            filter: "blur(18px)",
          }}
          animate={{ opacity: [0.45, 0.9, 0.45], scale: [1, 1.12, 1] }}
          transition={{ duration: 7, ...loop }}
        />
        {[...Array(12)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-[#ffb066]"
            style={{ left: `${(i * 8 + 6) % 100}%`, bottom: -8, width: 3 + (i % 3), height: 3 + (i % 3) }}
            animate={{ y: [0, -150], opacity: [0, 0.75, 0] }}
            transition={{ duration: 5 + (i % 5), repeat: Infinity, delay: i * 0.45, ease: "easeOut" }}
          />
        ))}
      </>
    ),
  },
  {
    name: "Aurora Drift",
    note: "Soft indigo and teal light slowly drifting across the surface.",
    accent: "#7cd4ff",
    layers: (
      <>
        {[
          { c: "rgba(76,102,255,0.55)", x: "-10%", y: "-30%", d: 14 },
          { c: "rgba(64,224,208,0.35)", x: "55%", y: "-10%", d: 18 },
          { c: "rgba(150,86,255,0.4)", x: "20%", y: "40%", d: 22 },
        ].map((orb, i) => (
          <motion.div
            key={i}
            className="absolute h-52 w-52 rounded-full"
            style={{ background: `radial-gradient(circle, ${orb.c}, transparent 70%)`, left: orb.x, top: orb.y, filter: "blur(26px)" }}
            animate={{ x: [0, 40, -20, 0], y: [0, -24, 18, 0] }}
            transition={{ duration: orb.d, ...loop }}
          />
        ))}
      </>
    ),
  },
  {
    name: "Signal Rings",
    note: "Concentric rings pulse outward from the streak counter.",
    accent: "#ffcc00",
    layers: (
      <>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute right-[38px] top-[74px] h-[68px] w-[68px] rounded-full border border-white/30"
            animate={{ scale: [0.7, 2.4], opacity: [0.55, 0] }}
            transition={{ duration: 3.6, repeat: Infinity, delay: i * 1.2, ease: "easeOut" }}
          />
        ))}
        <div
          className="absolute -left-20 -top-24 h-64 w-64 rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, rgba(255,204,0,0.28), transparent 70%)", filter: "blur(24px)" }}
        />
      </>
    ),
  },
  {
    name: "Mesh Bloom",
    note: "Three large colour fields breathe in and out like a mesh gradient.",
    accent: "#ff7ab6",
    layers: (
      <>
        {[
          { c: "rgba(255,90,150,0.45)", x: "8%", y: "20%" },
          { c: "rgba(96,120,255,0.5)", x: "45%", y: "-15%" },
          { c: "rgba(255,180,90,0.35)", x: "70%", y: "35%" },
        ].map((orb, i) => (
          <motion.div
            key={i}
            className="absolute h-64 w-64 rounded-full"
            style={{ background: `radial-gradient(circle, ${orb.c}, transparent 68%)`, left: orb.x, top: orb.y, filter: "blur(30px)" }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.55, 0.9, 0.55] }}
            transition={{ duration: 8 + i * 2, ...loop }}
          />
        ))}
      </>
    ),
  },
  {
    name: "Light Sweep",
    note: "A single beam of light crosses the banner every few seconds.",
    accent: "#9fe8ff",
    layers: (
      <>
        <motion.div
          className="absolute -top-24 h-[260px] w-40"
          style={{
            background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.16), transparent)",
            transform: "rotate(18deg)",
          }}
          animate={{ x: ["-30%", "120%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.6 }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(120% 80% at 20% 0%, rgba(80,120,255,0.22), transparent 60%)" }}
        />
      </>
    ),
  },
  {
    name: "Streak Lines",
    note: "Fast horizontal motion lines suggest movement and momentum.",
    accent: "#7dffb0",
    layers: (
      <>
        {[...Array(9)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-px rounded-full"
            style={{
              top: `${8 + i * 10}%`,
              width: `${20 + (i % 4) * 14}%`,
              background: "linear-gradient(90deg, transparent, rgba(125,255,176,0.55), transparent)",
            }}
            animate={{ x: ["-40%", "140%"], opacity: [0, 0.9, 0] }}
            transition={{ duration: 3.2 + (i % 3), repeat: Infinity, delay: i * 0.35, ease: "easeInOut" }}
          />
        ))}
      </>
    ),
  },
  {
    name: "Particle Field",
    note: "A quiet field of slow, twinkling points.",
    accent: "#cfd8ff",
    layers: (
      <>
        {[...Array(26)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-[3px] w-[3px] rounded-full bg-white"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
            animate={{ opacity: [0.1, 0.7, 0.1], y: [0, -10, 0] }}
            transition={{ duration: 4 + (i % 6), repeat: Infinity, delay: (i % 9) * 0.4, ease: "easeInOut" }}
          />
        ))}
      </>
    ),
  },
  {
    name: "Gradient Shift",
    note: "A wide gradient slowly slides across the whole banner.",
    accent: "#ffb347",
    layers: (
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, #2a1a3f 0%, #43204f 30%, #1b2a4a 60%, #2a1a3f 100%)",
          backgroundSize: "220% 220%",
        }}
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
    ),
  },
  {
    name: "Glass Panels",
    note: "Translucent panels float past at different depths.",
    accent: "#a8b8ff",
    layers: (
      <>
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-2xl border border-white/10 bg-white/[0.06]"
            style={{ left: `${10 + i * 22}%`, top: `${20 + (i % 2) * 30}%`, width: 90 + i * 16, height: 54 + i * 10 }}
            animate={{ y: [0, -18, 0], rotate: [0, i % 2 ? 4 : -4, 0], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 9 + i * 2, ...loop }}
          />
        ))}
      </>
    ),
  },
  {
    name: "Focus Aperture",
    note: "A slowly rotating halo, like a lens finding its focus.",
    accent: "#ffd166",
    layers: (
      <>
        <motion.div
          className="absolute -right-24 -top-28 h-[320px] w-[320px] rounded-full opacity-70"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(255,209,102,0.35), transparent 40%, rgba(120,140,255,0.35) 70%, transparent)",
            filter: "blur(22px)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-0"
          style={{ background: "radial-gradient(60% 60% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)" }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 6, ...loop }}
        />
      </>
    ),
  },
];

export default function HeaderOptions() {
  return (
    <div className="min-h-screen bg-[#08080a] px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-[900px]">
        <Link
          to="/my-development"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to My Development
        </Link>

        <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.02em] text-white">
          Ten animated headers
        </h1>
        <p className="mt-2 max-w-[560px] text-sm leading-relaxed text-white/60">
          Same content in every option — only the surface and the motion change. Pick a number and
          it goes onto My Development.
        </p>

        <div className="mt-8 space-y-8 pb-16">
          {OPTIONS.map((option, index) => (
            <section key={option.name}>
              <div className="mb-2.5 flex items-baseline gap-2">
                <span className="text-xs font-bold text-white/40">{String(index + 1).padStart(2, "0")}</span>
                <h2 className="text-sm font-bold text-white">{option.name}</h2>
                <span className="text-xs text-white/45">{option.note}</span>
              </div>
              <HeaderShell
                accent={option.accent}
                date={CONTENT.date}
                greeting={CONTENT.greeting}
                status={CONTENT.status}
                streak={CONTENT.streak}
              >
                {option.layers}
              </HeaderShell>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}