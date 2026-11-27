import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DIRECTIONS } from "@/components/redesign-preview/directions";
import MockFrame from "@/components/redesign-preview/MockFrame";
import HomeEditorial from "@/components/redesign-preview/home/HomeEditorial";
import HomeFocus from "@/components/redesign-preview/home/HomeFocus";
import HomeStudio from "@/components/redesign-preview/home/HomeStudio";
import HomeTrail from "@/components/redesign-preview/home/HomeTrail";
import JourneyEditorial from "@/components/redesign-preview/journey/JourneyEditorial";
import JourneyFocus from "@/components/redesign-preview/journey/JourneyFocus";
import JourneyStudio from "@/components/redesign-preview/journey/JourneyStudio";
import JourneyTrail from "@/components/redesign-preview/journey/JourneyTrail";
import ActivityEditorial from "@/components/redesign-preview/activity/ActivityEditorial";
import ActivityFocus from "@/components/redesign-preview/activity/ActivityFocus";
import ActivityStudio from "@/components/redesign-preview/activity/ActivityStudio";
import ActivityTrail from "@/components/redesign-preview/activity/ActivityTrail";

const SCREENS = [
  { id: "home", label: "Journey Home" },
  { id: "journey", label: "Journey detail" },
  { id: "activity", label: "Learning activity" },
];

const MOCKS = {
  home: { editorial: HomeEditorial, focus: HomeFocus, studio: HomeStudio, trail: HomeTrail },
  journey: {
    editorial: JourneyEditorial,
    focus: JourneyFocus,
    studio: JourneyStudio,
    trail: JourneyTrail,
  },
  activity: {
    editorial: ActivityEditorial,
    focus: ActivityFocus,
    studio: ActivityStudio,
    trail: ActivityTrail,
  },
};

/** Design review page: four directions, each shown on all three learner screens. */
export default function LearningRedesignPreview() {
  const [screen, setScreen] = useState("home");
  const [chosen, setChosen] = useState(null);
  const screenLabel = SCREENS.find((s) => s.id === screen)?.label;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/my-development"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> My development
        </Link>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground">
          Four directions for the learning experience
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Static mockups with sample content — nothing here reads or writes your data. Switch
          screens below; every direction is shown on all three.
        </p>

        {chosen && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <p className="text-xs text-foreground">
              You picked <span className="font-semibold">{DIRECTIONS.find((d) => d.id === chosen)?.name}</span> — tell me in chat and I'll build it out.
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {SCREENS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setScreen(item.id)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors",
                screen === item.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-8">
          {DIRECTIONS.map((direction) => {
            const Mock = MOCKS[screen][direction.id];
            return (
              <section key={direction.id}>
                <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="text-lg font-bold tracking-tight text-foreground">
                    {direction.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">{direction.tone}</p>
                  <button
                    type="button"
                    onClick={() => setChosen(direction.id)}
                    className={cn(
                      "ml-auto rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
                      chosen === direction.id
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {chosen === direction.id ? "Selected" : "Choose this one"}
                  </button>
                </div>
                <MockFrame direction={direction} screen={screenLabel}>
                  <Mock />
                </MockFrame>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}