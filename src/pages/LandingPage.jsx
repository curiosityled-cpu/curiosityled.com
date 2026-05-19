import React, { useState, useEffect } from "react";
import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import LandingProblem from "@/components/landing/LandingProblem";
import LandingShift from "@/components/landing/LandingShift";
import LandingExplainer from "@/components/landing/LandingExplainer";
import Landing90Days from "@/components/landing/Landing90Days";
import LandingFAQ from "@/components/landing/LandingFAQ";
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
      <LandingShift />
      <LandingExplainer />
      <Landing90Days />
      <LandingFAQ />
      <LandingBeyond />
      <LandingFinalCTA />
      <LandingFooter />
    </div>
  );
}