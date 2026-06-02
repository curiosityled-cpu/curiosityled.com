/**
 * SwipeableSections — Mobile-optimised tab + swipe navigation between two columns.
 * On mobile: renders as tab pills + touch-swipeable panes.
 * On desktop: falls through to normal two-column grid (handled by parent).
 */
import React, { useState, useRef } from "react";

export default function SwipeableSections({ sections = [] }) {
  const [active, setActive] = useState(0);
  const startX = useRef(null);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (startX.current === null) return;
    const diff = startX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && active < sections.length - 1) setActive(a => a + 1);
      if (diff < 0 && active > 0) setActive(a => a - 1);
    }
    startX.current = null;
  };

  return (
    <div className="md:hidden">
      {/* Tab pills */}
      <div className="flex gap-2 mb-4">
        {sections.map((s, i) => (
          <button
            key={s.label}
            onClick={() => setActive(i)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
              active === i
                ? 'bg-[#0202ff] text-white border-[#0202ff]'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Swipeable content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="overflow-hidden"
      >
        {sections[active]?.content}
      </div>

      {/* Dot indicators */}
      {sections.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {sections.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`rounded-full transition-all ${
                active === i ? 'w-4 h-1.5 bg-[#0202ff]' : 'w-1.5 h-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}