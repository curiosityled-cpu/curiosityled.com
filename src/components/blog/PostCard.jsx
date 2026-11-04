import React from "react";
import { Link } from "react-router-dom";
import { formatPostDate, postUrl } from "@/lib/blog";

function Cover({ post, className }) {
  if (post.cover_image_url) {
    return (
      <img
        src={post.cover_image_url}
        alt=""
        loading="lazy"
        className={`h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] ${className || ""}`}
      />
    );
  }
  return (
    <div
      className="h-full w-full flex items-end p-6"
      style={{
        background:
          "linear-gradient(135deg, #EFEBE3 0%, #E4E1F8 55%, #D9D6FF 100%)",
      }}
    >
      <span className="font-serif text-[2rem] leading-none text-[#0F0F1A]/25">
        {(post.category || "Journal").slice(0, 1)}
      </span>
    </div>
  );
}

export function FeaturedPostCard({ post }) {
  return (
    <Link
      to={postUrl(post.slug)}
      className="group grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-0 overflow-hidden rounded-[22px] border border-[#E6E1D7] bg-white transition-shadow duration-300 hover:shadow-[0_24px_60px_-32px_rgba(15,15,26,0.35)]"
    >
      <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[340px] overflow-hidden bg-[#EFEBE3]">
        <Cover post={post} />
      </div>
      <div className="flex flex-col justify-center gap-4 p-8 md:p-11">
        <div className="flex items-center gap-3">
          <span
            className="text-[10.5px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "#0202ff" }}
          >
            {post.category || "Leadership"}
          </span>
          <span className="h-px w-6 bg-[#D8D2C6]" />
          <span className="text-[11.5px] text-[#8A847D]">Featured</span>
        </div>
        <h2 className="font-serif text-[1.85rem] md:text-[2.25rem] leading-[1.14] tracking-[-0.015em] text-[#151515]">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="text-[15px] leading-relaxed text-[#5B5651] max-w-lg">
            {post.excerpt}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-[#8A847D]">
          {post.author_name && <span className="text-[#3D3934]">{post.author_name}</span>}
          {post.author_name && <span className="text-[#C9C3B8]">·</span>}
          <span>{formatPostDate(post.published_date)}</span>
          <span className="text-[#C9C3B8]">·</span>
          <span>{post.reading_minutes || 5} min read</span>
        </div>
      </div>
    </Link>
  );
}

export default function PostCard({ post }) {
  return (
    <Link to={postUrl(post.slug)} className="group flex flex-col">
      <div className="aspect-[16/10] overflow-hidden rounded-[14px] bg-[#EFEBE3]">
        <Cover post={post} />
      </div>
      <div className="mt-5 flex items-center gap-2.5">
        <span
          className="text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: "#0202ff" }}
        >
          {post.category || "Leadership"}
        </span>
        <span className="text-[11.5px] text-[#A9A29A]">
          {post.reading_minutes || 5} min
        </span>
      </div>
      <h3 className="mt-2.5 font-serif text-[1.3rem] leading-[1.25] tracking-[-0.01em] text-[#151515] transition-colors group-hover:text-[#0202ff]">
        {post.title}
      </h3>
      {post.excerpt && (
        <p className="mt-2.5 text-[14px] leading-relaxed text-[#5B5651] line-clamp-2">
          {post.excerpt}
        </p>
      )}
      <p className="mt-3.5 text-[12px] text-[#8A847D]">
        {formatPostDate(post.published_date)}
      </p>
    </Link>
  );
}