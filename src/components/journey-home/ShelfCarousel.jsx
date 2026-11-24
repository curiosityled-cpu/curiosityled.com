import React, { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Generic horizontal shelf: a snap carousel by default, switchable to a grid
 * when the learner wants to compare everything at once.
 */
export default function ShelfCarousel({ items, renderItem }) {
  const scrollerRef = useRef(null);
  const [expanded, setExpanded] = useState(false);

  const scroll = (direction) => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * 300, behavior: "smooth" });
  };

  if (!items.length) return null;

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-xs font-medium text-[#0202ff] hover:underline"
        >
          {expanded ? "Show carousel" : `View all ${items.length}`}
        </button>
      </div>

      {expanded ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id}>{renderItem(item)}</div>
          ))}
        </div>
      ) : (
        <div className="relative">
          <div
            ref={scrollerRef}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item) => (
              <div key={item.id} className="w-[280px] flex-shrink-0 snap-start">
                {renderItem(item)}
              </div>
            ))}
          </div>

          {items.length > 2 && (
            <>
              <button
                type="button"
                onClick={() => scroll(-1)}
                aria-label="Previous"
                className="absolute -left-3 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-colors hover:bg-muted md:flex"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
                aria-label="More"
                className="absolute -right-3 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-colors hover:bg-muted md:flex"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}