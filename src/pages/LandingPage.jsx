import React, { useState, useEffect } from "react";
import { setPageSEO } from "@/lib/seo";
import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import LandingProblem from "@/components/landing/LandingProblem";
import LandingAssessDevelopProve from "@/components/landing/LandingAssessDevelopProve";
import LandingConversationalLearning from "@/components/landing/LandingConversationalLearning";
import LandingObjectionStrip from "@/components/landing/LandingObjectionStrip";
import LandingBuyerNeeds from "@/components/landing/LandingBuyerNeeds";
import LandingExplainer from "@/components/landing/LandingExplainer";
import LandingInteractivePreview from "@/components/landing/LandingInteractivePreview";
import LandingFitSection from "@/components/landing/LandingFitSection";
import Landing90Days from "@/components/landing/Landing90Days";
import LandingBeyond from "@/components/landing/LandingBeyond";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingPilotStatus from "@/components/landing/LandingPilotStatus";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  useEffect(() => {
    setPageSEO(
      "Curiosity Led — Manager Intelligence That Proves Change",
      "Curiosity Led is the manager intelligence platform that develops manager judgment and proves it changed — inside Teams, Slack, and email."
    );
    return () => { document.title = "Curiosity Led"; };
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav />
      <LandingHero />
      <LandingProblem />
      <LandingAssessDevelopProve />
      <LandingConversationalLearning />
      <LandingObjectionStrip />
      <LandingBuyerNeeds />
      <LandingExplainer />
      <LandingInteractivePreview />
      <LandingFitSection />
      <Landing90Days />
      <LandingBeyond />
      <LandingFinalCTA />
      <LandingPilotStatus />
      <LandingFAQ />
      <LandingFooter />
    </div>
  );
}