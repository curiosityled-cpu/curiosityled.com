import React from "react";
import { Download } from "lucide-react";

export default function FieldGuideCta({ onOpen }) {
  return (
    <div className="mt-12 rounded-[18px] border border-[#E6E1D7] bg-white p-7 md:p-8">
      <p
        className="text-[10.5px] font-bold uppercase tracking-[0.18em]"
        style={{ color: "#0202ff" }}
      >
        Free field guide
      </p>
      <h2 className="mt-3 font-serif text-[1.5rem] leading-tight text-[#151515]">
        Difficult Conversations Field Guide
      </h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-[#5B5651]">
        Six scripted openers, a three-step recovery move for defensiveness, the four gates for
        escalating to HR, and a follow-up template. Emailed to you as a PDF.
      </p>
      <button
        onClick={onOpen}
        className="mt-5 inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-[14.5px] font-semibold text-white transition-transform hover:-translate-y-0.5"
        style={{ backgroundColor: "#0202ff" }}
      >
        <Download className="w-4 h-4" />
        Download the Field Guide
      </button>
    </div>
  );
}