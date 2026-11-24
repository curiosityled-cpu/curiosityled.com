import React from "react";
import { GraduationCap } from "lucide-react";
import ShelfCarousel from "@/components/journey-home/ShelfCarousel";
import LearningShelfCard from "./LearningShelfCard";
import useLearnerActions from "@/hooks/useLearnerActions";

/** Assigned courses, resources and conversations as a shelf. */
export default function LearningShelf({ items, loading, onChanged }) {
  const { open, markComplete, busyId } = useLearnerActions({ onChanged });

  if (loading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="h-56 w-[280px] flex-shrink-0 animate-pulse rounded-2xl border border-border bg-card"
          />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <GraduationCap className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
        <p className="font-medium text-foreground">Nothing assigned right now</p>
        <p className="mt-1 text-sm text-muted-foreground">
          When your program team assigns a course, resource or conversation it lands here.
        </p>
      </div>
    );
  }

  return (
    <ShelfCarousel
      items={items}
      renderItem={(item) => (
        <LearningShelfCard
          item={item}
          onOpen={open}
          onMarkComplete={markComplete}
          busy={busyId === item.id}
        />
      )}
    />
  );
}