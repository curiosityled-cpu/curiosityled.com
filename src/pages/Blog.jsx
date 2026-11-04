import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { setPageSEO } from "@/lib/seo";
import { ArrowRight } from "lucide-react";
import BlogHeader from "@/components/blog/BlogHeader";
import PostCard, { FeaturedPostCard } from "@/components/blog/PostCard";
import LandingFooter from "@/components/landing/LandingFooter";

function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[16/10] rounded-[14px] bg-[#EFEBE3]" />
      <div className="mt-5 h-2.5 w-20 rounded bg-[#E6E1D7]" />
      <div className="mt-3 h-4 w-4/5 rounded bg-[#E6E1D7]" />
      <div className="mt-2 h-4 w-3/5 rounded bg-[#E6E1D7]" />
    </div>
  );
}

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");

  useEffect(() => {
    setPageSEO(
      "The Journal — Curiosity Led",
      "Field notes on leadership, learning and building capability that survives contact with the work."
    );
  }, []);

  useEffect(() => {
    let active = true;
    base44.entities.BlogPost.filter(
      { status: "published" },
      { sort: "-published_date", limit: 60 }
    )
      .then((page) => {
        if (active) setPosts(page?.items ?? []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const found = new Set();
    posts.forEach((post) => {
      if (post.category) found.add(post.category);
    });
    return ["All", ...Array.from(found)];
  }, [posts]);

  const featured = useMemo(
    () => posts.find((post) => post.featured) || posts[0] || null,
    [posts]
  );

  const list = useMemo(() => {
    const rest = posts.filter((post) => post.id !== featured?.id);
    return category === "All"
      ? rest
      : rest.filter((post) => post.category === category);
  }, [posts, featured, category]);

  const showFeatured =
    featured && (category === "All" || featured.category === category);

  return (
    <div className="min-h-screen bg-[#FBFAF7] text-[#151515] antialiased">
      <BlogHeader />

      {/* Masthead */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-40 right-0 h-[420px] w-[420px] rounded-full opacity-70 blur-[2px]"
          style={{
            background:
              "radial-gradient(circle, rgba(217,214,255,0.75) 0%, rgba(251,250,247,0) 70%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-12 md:pt-24">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.24em] mb-5"
            style={{ color: "#0202ff" }}
          >
            The Journal
          </p>
          <h1 className="font-serif text-[2.5rem] leading-[1.06] tracking-[-0.02em] md:text-[3.6rem] max-w-3xl">
            Notes on leadership that survives contact with the work.
          </h1>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6">
        <div className="border-t border-[#E6E1D7]" />
      </div>

      {/* Featured */}
      {(showFeatured || loading) && (
        <section className="max-w-6xl mx-auto px-6 pt-12">
          {loading ? (
            <div className="animate-pulse rounded-[22px] border border-[#E6E1D7] bg-white">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="aspect-[16/10] rounded-t-[22px] bg-[#EFEBE3] lg:rounded-l-[22px] lg:rounded-tr-none" />
                <div className="space-y-4 p-10">
                  <div className="h-2.5 w-24 rounded bg-[#E6E1D7]" />
                  <div className="h-6 w-full rounded bg-[#E6E1D7]" />
                  <div className="h-6 w-4/5 rounded bg-[#E6E1D7]" />
                  <div className="h-3 w-2/3 rounded bg-[#E6E1D7]" />
                </div>
              </div>
            </div>
          ) : (
            <FeaturedPostCard post={featured} />
          )}
        </section>
      )}

      {/* Filters */}
      <section className="max-w-6xl mx-auto px-6 pt-14">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#8A847D]">
            All articles
          </h2>
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors ${
                    category === item
                      ? "border-[#151515] bg-[#151515] text-white"
                      : "border-[#E0DACE] bg-white text-[#5B5651] hover:border-[#151515]/40 hover:text-[#151515]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-6 pt-8 pb-16">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {[0, 1, 2].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : list.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {list.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : !featured ? (
          <div className="rounded-[20px] border border-dashed border-[#DED8CC] bg-white/60 px-8 py-16 text-center">
            <p className="font-serif text-[1.5rem] text-[#151515]">
              The first articles are being written.
            </p>
            <p className="mt-3 text-[14.5px] text-[#6B6560]">
              New pieces go up here as they are published. In the meantime, the platform is
              the fastest way to see how this works in practice.
            </p>
            <a
              href="https://cal.com/curiosityled/bookdemo"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#0202ff" }}
            >
              Book a walkthrough
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <p className="text-[14.5px] text-[#6B6560]">
            {category === "All"
              ? "More articles are on the way."
              : `Nothing filed under ${category} yet.`}
          </p>
        )}
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-[24px] bg-[#0F0F1A] px-8 py-12 md:px-14 md:py-14 grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-8">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/45 mb-3">
              The platform
            </p>
            <h2 className="font-serif text-[1.9rem] leading-tight text-white md:text-[2.3rem] max-w-xl">
              See what your leaders actually do, not what they say they do.
            </h2>
            <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-white/60">
              Leadership intelligence that runs inside the flow of work — check-ins,
              development and succession in one place.
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