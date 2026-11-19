import React from "react";
import DemoLeadPage from "@/components/explore/DemoLeadPage";

export default function StepCheckIn({ onNext }) {
  return <DemoLeadPage onContinue={onNext} continueLabel="Now start the training" />;
}