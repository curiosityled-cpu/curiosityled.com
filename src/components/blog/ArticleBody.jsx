import React from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";

function MarkdownLink({ href, children }) {
  if (href && href.startsWith("/")) {
    return (
      <Link
        to={href}
        className="underline decoration-[#0202ff]/35 underline-offset-[3px] transition-colors hover:decoration-[#0202ff]"
      >
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-[#0202ff]/35 underline-offset-[3px] transition-colors hover:decoration-[#0202ff]"
    >
      {children}
    </a>
  );
}

const COMPONENTS = {
  h2: ({ children }) => (
    <h2 className="mt-12 mb-3 font-serif text-[1.6rem] leading-[1.2] tracking-[-0.015em] text-[#151515]">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-9 mb-2 font-serif text-[1.25rem] leading-[1.3] tracking-[-0.01em] text-[#151515]">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-7 mb-2 text-[14px] font-bold uppercase tracking-[0.12em] text-[#3D3934]">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mt-4 text-[17px] leading-[1.78] text-[#3D3934]">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mt-4 space-y-2 pl-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 list-decimal space-y-2 pl-5 text-[17px] leading-[1.75] text-[#3D3934]">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="relative pl-5 text-[17px] leading-[1.75] text-[#3D3934] before:absolute before:left-0 before:top-[0.68em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-[#0202ff]/50">
      {children}
    </li>
  ),
  a: ({ href, children }) => <MarkdownLink href={href}>{children}</MarkdownLink>,
  strong: ({ children }) => (
    <strong className="font-semibold text-[#151515]">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-8 border-l-2 pl-6 border-[#0202ff]/30 text-[18.5px] font-serif leading-[1.6] text-[#151515]">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-[#E6E1D7]" />,
  img: ({ src, alt }) => (
    <figure className="my-8">
      <img src={src} alt={alt || ""} loading="lazy" className="w-full rounded-[14px]" />
      {alt ? (
        <figcaption className="mt-2.5 text-[12.5px] text-[#8A847D]">{alt}</figcaption>
      ) : null}
    </figure>
  ),
  code: ({ children }) => (
    <code className="rounded bg-[#EFEBE3] px-1.5 py-0.5 text-[0.9em] text-[#151515]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-6 overflow-x-auto rounded-xl bg-[#0F0F1A] p-5 text-[13.5px] leading-relaxed text-white/90">
      {children}
    </pre>
  ),
};

export default function ArticleBody({ content }) {
  return (
    <div className="[&>*:first-child]:mt-0">
      <ReactMarkdown components={COMPONENTS}>{content || ""}</ReactMarkdown>
    </div>
  );
}