import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { setPageSEO } from "@/lib/seo";
import { formatPostDate, postUrl } from "@/lib/blog";
import { ArrowLeft, ArrowRight, Check, Linkedin, Link2 } from "lucide-react";
import BlogHeader from "@/components/blog/BlogHeader";
import ArticleBody from "@/components/blog/ArticleBody";
import PostCard from "@/components/blog/PostCard";
import LandingFooter from "@/components/landing/LandingFooter";

function Byline({ post }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-[#8A847D]">
      {post.author_avatar_url ? (
        <img
          src={post.author_avatar_url}
          alt=""
          className="h-9 w-9 rounded-full object-cover border border-[#E6E1D7]"
        />
      ) : null}
      {post.author_name && (
        <span className="font-medium text-[#151515]">{post.author_name}</span>
      )}
      <span className="h-3 w-px bg-[#D8D2C6]" />
      <span>{formatPostDate(post.published_date)}</span>
      <span className="h-3 w-px bg-[#D8D2C6]" />
      <span>{post.reading_minutes || 5} min read</span>
    </div>
  );
}

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);

    base44.entities.BlogPost.filter({ slug, status: "published" }, { limit: 1 })
      .then(async (page) => {
        const found = page?.items?.[0] || null;
        if (!active) return;
        setPost(found);

        if (found) {
          setPageSEO(
            found.meta_title || found.title,
            found.meta_description || found.excerpt || ""
          );
          if (found.category) {
            const more = await base44.entities.BlogPost.filter(
              { status: "published", category: found.category },
              { sort: "-published_date", limit: 4 }
            );
            if (active) {
              setRelated((more?.items || []).filter((item) => item.id !== found.id).slice(0, 3));
            }
          }
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  // Tell crawlers a missing article is genuinely a 404 once loading has finished.
  useEffect(() => {
    if (loading || post) return undefined;
    const meta = document.createElement("meta");
    meta.setAttribute("name", "prerender-status-code");
    meta.setAttribute("content", "404");
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [loading, post]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setCopied(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFAF7]">
        <BlogHeader />
        <div className="max-w-6xl mx-auto px-6 pt-16 animate-pulse space-y-5">
          <div className="h-3 w-24 rounded bg-[#E6E1D7]" />
          <div className="h-10 w-4/5 rounded bg-[#E6E1D7]" />
          <div className="h-10 w-3/5 rounded bg-[#E6E1D7]" />
          <div className="mt-10 aspect-[16/8] rounded-[18px] bg-[#EFEBE3]" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#FBFAF7] text-[#151515]">
        <BlogHeader />
        <div className="max-w-2xl mx-auto px-6 py-28 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: "#0202ff" }}>
            Not found
          </p>
          <h1 className="mt-4 font-serif text-[2.2rem] leading-tight">
            That article isn’t here.
          </h1>
          <p className="mt-4 text-[15px] text-[#6B6560]">
            It may have been renamed or unpublished. The rest of the journal is below.
          </p>
          <Link
            to="/blog"
            className="mt-7 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-[14px] font-semibold text-white"
            style={{ backgroundColor: "#0202ff" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to the journal
          </Link>
        </div>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFAF7] text-[#151515] antialiased">
      <BlogHeader />

      <article className="max-w-6xl mx-auto px-6 pt-12 md:pt-16">
        <div className="max-w-[46rem] mx-auto">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-[12.5px] text-[#8A847D] transition-colors hover:text-[#151515]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            The Journal
          </Link>

          <p
            className="mt-8 text-[11px] font-bold uppercase tracking-[0.22em]"
            style={{ color: "#0202ff" }}
          >
            {post.category || "Leadership"}
          </p>

          <h1 className="mt-4 font-serif text-[2.15rem] leading-[1.1] tracking-[-0.02em] md:text-[3rem]">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mt-5 text-[1.0625rem] leading-relaxed text-[#5B5651]">
              {post.excerpt}
            </p>
          )}

          <div className="mt-7 pb-7 border-b border-[#E6E1D7]">
            <Byline post={post} />
          </div>
        </div>

        {post.cover_image_url && (
          <div className="mt-9 overflow-hidden rounded-[18px] bg-[#EFEBE3]">
            <img
              src={post.cover_image_url}
              alt=""
              className="w-full max-h-[520px] object-cover"
            />
          </div>
        )}

        <div className="mt-12 max-w-[46rem] mx-auto">
          <ArticleBody content={post.content} />

          {post.tags?.length > 0 && (
            <div className="mt-12 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#E0DACE] bg-white px-3 py-1 text-[11.5px] text-[#6B6560]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[#E6E1D7] pt-7">
            <div className="flex items-center gap-3">
              {post.author_avatar_url ? (
                <img
                  src={post.author_avatar_url}
                  alt=""
                  className="h-11 w-11 rounded-full object-cover border border-[#E6E1D7]"
                />
              ) : null}
              <div>
                <p className="text-[13.5px] font-semibold text-[#151515]">
                  {post.author_name || "Curiosity Led"}
                </p>
                <p className="text-[12px] text-[#8A847D]">
                  {post.author_role || "Curiosity Led"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E0DACE] bg-white px-3 py-2 text-[12px] text-[#3D3934] transition-colors hover:border-[#151515]/40"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E0DACE] bg-white px-3 py-2 text-[12px] text-[#3D3934] transition-colors hover:border-[#151515]/40"
              >
                <Linkedin className="w-3.5 h-3.5" />
                Share
              </a>
            </div>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 mt-20">
          <div className="border-t border-[#E6E1D7] pt-10">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#8A847D]">
              More on {post.category}
            </h2>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
              {related.map((item) => (
                <PostCard key={item.id} post={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="max-w-6xl mx-auto px-6 mt-20 pb-20">
        <div className="rounded-[24px] bg-[#0F0F1A] px-8 py-12 md:px-14 md:py-14 grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-8">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/45 mb-3">
              Keep going
            </p>
            <h2 className="font-serif text-[1.9rem] leading-tight text-white md:text-[2.3rem] max-w-xl">
              Turn the idea into something your managers actually do.
            </h2>
            <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-white/60">
              See how Curiosity Led puts check-ins, development and succession inside the
              flow of work.
            </p>
          </div>
          <a
            href="https://cal.com/curiosityled/bookdemo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-6 py-3.5 text-[14.5px] font-semibold text-[#0F0F1A] transition-transform hover:-translate-y-0.5"
          >
            Book a demo
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}