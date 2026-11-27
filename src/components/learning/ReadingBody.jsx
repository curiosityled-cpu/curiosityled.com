import React from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

const COMPONENTS = {
  h1: ({ children }) => (
    <h2 className="mt-8 text-xl font-bold leading-snug tracking-tight text-foreground">{children}</h2>
  ),
  h2: ({ children }) => (
    <h2 className="mt-8 text-xl font-bold leading-snug tracking-tight text-foreground">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 text-base font-bold leading-snug text-foreground">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mt-4 text-[16.5px] leading-[1.75] text-foreground/90">{children}</p>
  ),
  ul: ({ children }) => <ul className="mt-4 space-y-2 pl-5 list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="mt-4 space-y-2 pl-5 list-decimal">{children}</ol>,
  li: ({ children }) => (
    <li className="text-[16.5px] leading-[1.7] text-foreground/90">{children}</li>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote className="mt-5 border-l-2 border-[#0202ff]/40 pl-4 text-[16px] italic leading-[1.7] text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="mt-8 border-border" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-[#0202ff] underline decoration-[#0202ff]/35 underline-offset-2 hover:decoration-[#0202ff]"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">{children}</code>
  ),
};

/**
 * A lesson's own text, set for reading: one column, a comfortable measure,
 * generous leading. Used wherever authored text stands in for a file.
 */
export default function ReadingBody({ content, className }) {
  if (!content) return null;
  return (
    <div className={cn("max-w-[68ch] [&>*:first-child]:mt-0", className)}>
      <ReactMarkdown components={COMPONENTS}>{content}</ReactMarkdown>
    </div>
  );
}