/**
 * SwipeableSections — Mobile-only swipeable tab container for Patterns page.
 * On mobile, renders children as swipeable pages with tab indicators.
 * On desktop, renders nothing (layout handled by the page grid).
 */
import React, { useState, useRef } from "react";

export default function SwipeableSections({ sections }) {
  const [active, setActive] = useState(0);
  const startX = useRef(null);

  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) < 40) return;
    if (dx < 0 && active < sections.length - 1) setActive(a => a + 1);
    if (dx > 0 && active > 0) setActive(a => a - 1);
    startX.current = null;
  };

  return (
    <div className="md:hidden">
      {/* Tab pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {sections.map((s, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
              active === i
                ? 'bg-[#0202ff] text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Swipeable content */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="overflow-hidden"
      >
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {sections.map((s, i) => (
            <div key={i} className="w-full flex-shrink-0 space-y-4">
              {s.content}
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-4">
        {sections.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`h-1.5 rounded-full transition-all ${
              active === i ? 'w-6 bg-[#0202ff]' : 'w-1.5 bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}