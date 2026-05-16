import React from "react";

const items = [
  "Built for healthcare leadership transitions",
  "Designed around real manager moments",
  "One defensible leadership story",
];

export default function LandingProofStrip() {
  return (
    <section
      id="home-proof-strip"
      className="border-t border-b border-gray-100 bg-white py-5"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10">
          {items.map((item, i) => (
            <React.Fragment key={item}>
              <span className="text-sm font-medium text-gray-700 text-center">{item}</span>
              {i < items.length - 1 && (
                <span className="hidden sm:block w-px h-4 bg-gray-200" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}