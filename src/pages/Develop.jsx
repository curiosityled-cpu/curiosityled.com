import React from "react";
import { useSearchParams } from "react-router-dom";
import { Compass, Dumbbell } from "lucide-react";
import MyDevelopment from "@/pages/MyDevelopment";
import ManagerPractice from "@/pages/ManagerPractice";

/**
 * Develop — one destination for the learner's growth, with two sections:
 *   My development  the longer arc (journeys, courses, experiences, certificates)
 *   Practice        the daily reps (workouts, coaching flows, sessions)
 *
 * Each section keeps its own hero and content, so neither surface is diluted.
 * The active section lives in the URL (?section=practice) so it is linkable
 * and survives a refresh.
 */
const SECTIONS = [
  {
    key: "development",
    label: "My development",
    icon: Compass,
    hint: "Journeys, courses and experiences",
  },
  {
    key: "practice",
    label: "Practice",
    icon: Dumbbell,
    hint: "Workouts, coaching flows and sessions",
  },
];

export default function Develop() {
  const [params, setParams] = useSearchParams();
  const activeKey = params.get("section") === "practice" ? "practice" : "development";
  const active = SECTIONS.find((section) => section.key === activeKey);

  const select = (key) => {
    if (key === activeKey) return;
    setParams(key === "practice" ? { section: "practice" } : {}, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      {/* Section switcher — sits above both surfaces, matching the app's pill language */}
      <div className="sticky top-14 sm:top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <nav
            className="inline-flex items-center rounded-full border border-border bg-muted/50 p-1"
            aria-label="Develop sections"
          >
            {SECTIONS.map(({ key, label, icon: Icon }) => {
              const isActive = key === activeKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => select(key)}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-[#0202ff] text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </nav>
          <p className="ml-auto hidden text-xs text-muted-foreground sm:block">{active.hint}</p>
        </div>
      </div>

      {activeKey === "practice" ? <ManagerPractice /> : <MyDevelopment />}
    </div>
  );
}