import React, { useState } from "react";
import { Layers, Plus } from "lucide-react";
import JourneyCard from "@/components/journey-home/JourneyCard";
import { DevSection, DevEmpty, SectionButton, SectionLink } from "./DevSection";

const PREVIEW_COUNT = 3;

/** My journeys — three previews, with View all expanding in place. */
export default function JourneyPreviewRow({ items, onOpen, onEdit, onDelete, canManage, onNewJourney }) {
  const [expanded, setExpanded] = useState(false);
  const manage = (item, handler) => (canManage && !canManage(item) ? undefined : handler);
  const shown = expanded ? items : items.slice(0, PREVIEW_COUNT);

  return (
    <DevSection
      title="My journeys"
      subtitle="Multi-step paths — resume where you left off."
      actions={
        <>
          {items.length > PREVIEW_COUNT && (
            <SectionLink onClick={() => setExpanded((prev) => !prev)}>
              {expanded ? "Show fewer" : `View all ${items.length}`}
            </SectionLink>
          )}
          <SectionButton onClick={onNewJourney}>
            <Plus className="h-3.5 w-3.5" /> New journey
          </SectionButton>
        </>
      }
    >
      {items.length === 0 ? (
        <DevEmpty
          icon={Layers}
          title="No journeys yet"
          text="Journeys combine coaching, projects and learning into one path. Create one, or wait for your program team to assign one."
          action={
            <SectionButton onClick={onNewJourney}>
              <Plus className="h-3.5 w-3.5" /> New journey
            </SectionButton>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((item) => (
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
    </DevSection>
  );
}