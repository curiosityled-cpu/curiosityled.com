import React, { useState } from "react";
import { Layers, Plus } from "lucide-react";
import JourneyCard from "@/components/journey-home/JourneyCard";
import { EmptyNote, PrimaryButton, SectionHeading, TextButton } from "./ui";

const PREVIEW_COUNT = 3;

/** Journeys: three relevant previews, then everything on request. */
export default function JourneySection({
  items = [],
  loading,
  onOpen,
  onEdit,
  onDelete,
  canManage,
  onNew,
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, PREVIEW_COUNT);

  const manage = (item, handler) => (canManage && !canManage(item) ? undefined : handler);

  return (
    <section className="mx-4 mt-10 sm:mx-6 sm:ml-12 lg:ml-16">
      <SectionHeading
        eyebrow="Journeys"
        title="My journeys"
        subtitle="Multi-step paths that combine learning, practice and experience."
      >
        {items.length > PREVIEW_COUNT && (
          <TextButton onClick={() => setShowAll((prev) => !prev)}>
            {showAll ? "Show fewer" : `View all ${items.length}`}
          </TextButton>
        )}
        <PrimaryButton onClick={onNew} size="sm">
          <Plus className="h-3.5 w-3.5" /> New journey
        </PrimaryButton>
      </SectionHeading>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              className="h-[260px] animate-pulse rounded-2xl border border-[var(--pf-border)] bg-[var(--pf-surface)]"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyNote
          icon={Layers}
          title="No journeys yet"
          text="A journey strings coaching, projects and learning into one path. Create one, or wait for your programme team to assign one."
          action={<PrimaryButton onClick={onNew}>Create a journey</PrimaryButton>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <JourneyCard
              key={item.id}
              item={item}
              onOpen={onOpen}
              onEdit={manage(item, onEdit)}
              onDelete={manage(item, onDelete)}
            />
          ))}
        </div>
      )}
    </section>
  );
}