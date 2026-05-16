import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import LandingProofStrip from "@/components/landing/LandingProofStrip";
import LandingProblem from "@/components/landing/LandingProblem";
import LandingPersonas from "@/components/landing/LandingPersonas";
import LandingShift from "@/components/landing/LandingShift";
import LandingHowItWorks from "@/components/landing/LandingHowItWorks";
import LandingOutcomes from "@/components/landing/LandingOutcomes";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingLeadershipHub from "@/components/landing/LandingLeadershipHub";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingProofStrip />
        <LandingProblem />
        <LandingPersonas />
        <LandingShift />
        <LandingHowItWorks />
        <LandingOutcomes />
        <LandingFAQ />
        <LandingLeadershipHub />
        <LandingFinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}