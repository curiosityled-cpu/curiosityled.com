import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import ArticleNav from "@/components/succession-guide/ArticleNav";
import GuideHero from "@/components/succession-guide/GuideHero";
import KeyTakeaways from "@/components/succession-guide/KeyTakeaways";
import GuideArticle from "@/components/succession-guide/GuideArticle";
import GuideFaq from "@/components/succession-guide/GuideFaq";
import WorkbookForm from "@/components/succession-guide/WorkbookForm";
import LandingFooter from "@/components/landing/LandingFooter";

export default function SuccessionTemplateGuide() {
  return (
    <div className="min-h-screen bg-[#FBFAF7] text-[#151515] antialiased">
      <ArticleNav />
      <GuideHero />
      <KeyTakeaways />

      <div className="max-w-6xl mx-auto px-6 mt-14">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_368px] gap-12 lg:gap-14">
          <div className="order-2 lg:order-1 min-w-0">
            <GuideArticle />
          </div>
          <aside className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-24">
              <WorkbookForm />
              <p className="mt-4 text-[12px] leading-relaxed text-[#8A847D] px-1">
                Built from the seven-section template we use with operations and HR leaders. Delivered as a PDF.
              </p>
            </div>
          </aside>
        </div>
      </div>

      <section className="max-w-6xl mx-auto px-6 mt-20">
        <div className="rounded-[24px] bg-[#0F0F1A] px-8 py-12 md:px-14 md:py-14 grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-8">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/45 mb-3">The workbook</p>
            <h2 className="font-serif text-[1.9rem] leading-tight text-white md:text-[2.4rem] max-w-xl">
              Copy a filled-in template. Defend the bench behind every critical role.
            </h2>
            <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-white/60">
              Seven sections per role, worked examples, and a readiness scale that cites behavior instead of tenure.
            </p>
          </div>
          <a
            href="#workbook-form"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-6 py-3.5 text-[14.5px] font-semibold text-[#0F0F1A] transition-transform hover:-translate-y-0.5"
          >
            Download the PDF
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 mt-20">
        <GuideFaq />
      </div>

      <section className="max-w-6xl mx-auto px-6 mt-16 pb-20">
        <div className="border-t border-[#E6E1D7] pt-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <p className="text-[14px] leading-relaxed text-[#6B6560] max-w-xl">
            Want to try the fill-in-the-blank guide for yourself?{" "}
            <a href="#workbook-form" className="font-semibold" style={{ color: "#0202ff" }}>
              Download it here.
            </a>
          </p>
          <Link to="/" className="text-[13px] font-medium text-[#3D3934] hover:text-[#0202ff] transition-colors">
            Explore the Curiosity Led platform →
          </Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}