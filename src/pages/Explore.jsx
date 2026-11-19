import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { STEPS } from "@/lib/exploreDemoContent";
import DemoShell from "@/components/explore/DemoShell";
import StepLeadership from "@/components/explore/StepLeadership";
import StepAtreus from "@/components/explore/StepAtreus";
import StepCheckIn from "@/components/explore/StepCheckIn";
import StepOrg from "@/components/explore/StepOrg";

export default function Explore() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    document.title = "Experience Curiosity Led — interactive demo";
    base44.analytics.track({ eventName: "explore_demo_view", properties: { entry: "direct" } });
    return () => { document.title = "Curiosity Led"; };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    base44.analytics.track({
      eventName: "explore_demo_step",
      properties: { step: STEPS[step]?.id || "unknown" },
    });
  }, [step]);

  const go = (next) => setStep(Math.max(0, Math.min(STEPS.length - 1, next)));

  return (
    <DemoShell step={step} onStep={go}>
      {step === 0 && (
        <StepLeadership
          onComplete={(scores) => {
            setProfile(scores);
            go(1);
          }}
        />
      )}
      {step === 1 && <StepAtreus profile={profile} onNext={() => go(2)} />}
      {step === 2 && <StepCheckIn onNext={() => go(3)} />}
      {step === 3 && (
        <StepOrg
          profile={profile}
          onRestart={() => {
            setProfile(null);
            go(0);
          }}
        />
      )}
    </DemoShell>
  );
}