import React, { useEffect } from "react";
import LandingNav from "@/components/landing/LandingNav";
import IndustryHero from "@/components/landing/IndustryHero";
import LandingProblem from "@/components/landing/LandingProblem";
import LandingBuyerNeeds from "@/components/landing/LandingBuyerNeeds";
import LandingExplainer from "@/components/landing/LandingExplainer";
import LandingObjectionStrip from "@/components/landing/LandingObjectionStrip";
import LandingInteractivePreview from "@/components/landing/LandingInteractivePreview";
import LandingFitSection from "@/components/landing/LandingFitSection";
import Landing90Days from "@/components/landing/Landing90Days";
import LandingBeyond from "@/components/landing/LandingBeyond";
import IndustryFinalCTA from "@/components/landing/IndustryFinalCTA";
import LandingFAQ from "@/components/landing/LandingFAQ";
import IndustryFooter from "@/components/landing/IndustryFooter";
import { getIndustryConfig } from "@/components/landing/industryConfig";

export default function LandingBPO() {
  const cfg = getIndustryConfig("bpo");

  useEffect(() => {
    document.title = cfg.pageTitle;
    window.scrollTo(0, 0);
  }, [cfg.pageTitle]);

  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav />
      <IndustryHero industry="bpo" />
      <LandingProblem industry="bpo" />
      <LandingBuyerNeeds industry="bpo" />
      <LandingExplainer industry="bpo" />
      <LandingObjectionStrip industry="bpo" />
      <LandingInteractivePreview industry="bpo" />
      <LandingFitSection industry="bpo" />
      <Landing90Days industry="bpo" />
      <LandingBeyond industry="bpo" />
      <IndustryFinalCTA industry="bpo" />
      <LandingFAQ industry="bpo" />
      <IndustryFooter />
    </div>
  );
}