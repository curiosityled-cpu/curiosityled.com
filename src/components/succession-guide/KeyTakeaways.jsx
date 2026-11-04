import React from "react";
import { Check } from "lucide-react";
import { KEY_TAKEAWAYS } from "./guideContent";

export default function KeyTakeaways() {
  return (
    <section className="max-w-6xl mx-auto px-6">
      <div className="rounded-2xl border border-[#E6E1D7] bg-white p-7 md:p-9">
        <h2 className="font-serif text-[1.35rem] tracking-[-0.01em] text-[#151515] mb-5">Key takeaways</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3.5">
          {KEY_TAKEAWAYS.map((item) => (
            <li key={item} className="flex gap-3 text-[14.5px] leading-relaxed text-[#4A4540]">
              <Check className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: "#0202ff" }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}