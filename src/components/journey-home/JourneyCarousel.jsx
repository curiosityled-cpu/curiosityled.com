import React from "react";
import JourneyCard from "./JourneyCard";
import ShelfCarousel from "./ShelfCarousel";

/** Journey shelf: a carousel of journey cards, expandable to a grid. */
export default function JourneyCarousel({ items, onOpen, onEdit, onDelete, canManage }) {
  // Editing is only offered on journeys this learner owns.
  const manage = (item, handler) => (canManage && !canManage(item) ? undefined : handler);

  return (
    <ShelfCarousel
      items={items}
      renderItem={(item) => (
        <JourneyCard
          item={item}
          onOpen={onOpen}
          onEdit={manage(item, onEdit)}
          onDelete={manage(item, onDelete)}
        />
      )}
    />
  );
}