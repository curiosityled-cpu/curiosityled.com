import React from "react";
import { Link } from "react-router-dom";
import { GUIDE_SECTIONS } from "./guideContent";

function Parts({ parts }) {
  return parts.map((part, index) => {
    if (typeof part === "string") return <React.Fragment key={index}>{part}</React.Fragment>;
    if (part.href.startsWith("/")) {
      return (
        <Link key={index} to={part.href} className="underline decoration-[#0202ff]/40 underline-offset-2 hover:decoration-[#0202ff]">
          {part.text}
        </Link>
      );
    }
    return (
      <a
        key={index}
        href={part.href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-[#0202ff]/40 underline-offset-2 hover:decoration-[#0202ff]"
      >
        {part.text}
      </a>
    );
  });
}

function Block({ block }) {
  if (block.type === "h3") {
    return <h3 className="font-serif text-[1.3rem] tracking-[-0.01em] text-[#151515] mt-9 mb-3">{block.text}</h3>;
  }
  if (block.type === "sub") {
    return (
      <div className="mt-8">
        <h3 className="text-[15px] font-bold text-[#151515] mb-2">{block.title}</h3>
        <p className="text-[16.5px] leading-[1.75] text-[#3D3934]">
          <Parts parts={block.parts} />
        </p>
      </div>
    );
  }
  return (
    <p className="text-[16.5px] leading-[1.78] text-[#3D3934] mt-4">
      <Parts parts={block.parts} />
    </p>
  );
}

export default function GuideArticle() {
  return (
    <article className="max-w-[46rem]">
      <p className="text-[17.5px] leading-[1.75] text-[#3D3934]">
        A good template for succession planning captures five things per critical role: the role, incumbent risk,
        candidate readiness with behavioral evidence, development actions, and a review date. Below is a
        fill-in-the-blank version where every section ships with a completed worked example, so you can copy a filled-in
        template and defend your bench strength to the board.
      </p>

      <nav className="mt-10 mb-12 rounded-2xl border border-[#E6E1D7] bg-white/70 p-6">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#8A847D] mb-3">Table of contents</p>
        <ol className="space-y-2">
          {GUIDE_SECTIONS.map((section, index) => (
            <li key={section.id} className="flex gap-3 text-[13.5px] leading-relaxed">
              <span className="text-[#B3ACA3] tabular-nums">{String(index + 1).padStart(2, "0")}</span>
              <a href={`#${section.id}`} className="text-[#3D3934] hover:text-[#0202ff] transition-colors">
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {GUIDE_SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-24 mb-14">
          <h2 className="font-serif text-[1.75rem] leading-tight tracking-[-0.015em] text-[#151515] md:text-[2rem]">
            {section.title}
          </h2>
          <div className="mt-2 h-px w-14" style={{ backgroundColor: "#0202ff" }} />
          {section.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </section>
      ))}
    </article>
  );
}