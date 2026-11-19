import React, { useEffect } from "react";
import { setPageSEO } from "@/lib/seo";
import LandingNav from "@/components/landing/LandingNav";
import HomeHero from "@/components/landing/HomeHero";
import HomeCost from "@/components/landing/HomeCost";
import HomePlan from "@/components/landing/HomePlan";
import HomeInside from "@/components/landing/HomeInside";
import HomeOutcomes from "@/components/landing/HomeOutcomes";
import LandingFitSection from "@/components/landing/LandingFitSection";
import LandingFounderBlock from "@/components/landing/LandingFounderBlock";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  useEffect(() => {
    setPageSEO(
      "Curiosity Led — Manager development that leaves a record",
      "Curiosity Led helps managers think through the hard moment before they walk into it, and gives HR and owners evidence of what changed — inside Microsoft Teams and email."
    );
    return () => { document.title = "Curiosity Led"; };
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav />
      <HomeHero />
      <HomeCost />
      <HomePlan />
      <HomeInside />
      <HomeOutcomes />
      <LandingFitSection />
      <LandingFounderBlock />
      <LandingFAQ />
      <LandingFinalCTA />
      <LandingFooter />
    </div>
  );
}