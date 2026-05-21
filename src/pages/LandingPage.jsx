import React, { useState, useEffect } from "react";
import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import LandingProblem from "@/components/landing/LandingProblem";
import LandingBuyerNeeds from "@/components/landing/LandingBuyerNeeds";
import LandingExplainer from "@/components/landing/LandingExplainer";
import LandingObjectionStrip from "@/components/landing/LandingObjectionStrip";
import LandingInteractivePreview from "@/components/landing/LandingInteractivePreview";
import LandingFitSection from "@/components/landing/LandingFitSection";
import Landing90Days from "@/components/landing/Landing90Days";
import LandingBeyond from "@/components/landing/LandingBeyond";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  useEffect(() => {
    document.title = "Curiosity Led";
    return () => { document.title = "Curiosity Led"; };
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav />
      <LandingHero />
      <LandingProblem />
      <LandingBuyerNeeds />
      <LandingExplainer />
      <LandingObjectionStrip />
      <LandingInteractivePreview />
      <LandingFitSection />
      <Landing90Days />
      <LandingBeyond />
      <LandingFinalCTA />
      <LandingFooter />
    </div>
  );
}