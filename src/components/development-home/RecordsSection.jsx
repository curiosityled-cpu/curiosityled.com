import React from "react";
import AchievementsStrip from "@/components/journey-home/AchievementsStrip";
import CertificateViewer from "@/components/learning/CertificateViewer";
import MyLearningRecord from "@/components/learning/MyLearningRecord";
import DevelopRecord from "@/components/practice-first/DevelopRecord";
import { SectionHeading } from "./ui";

/** Recognition and records, kept quiet at the foot of the page. */
export default function RecordsSection({ email }) {
  return (
    <section className="mx-4 mt-10 sm:mx-6 sm:ml-12 lg:ml-16">
      <SectionHeading
        eyebrow="Records"
        title="Recognition & record"
        subtitle="Certificates, achievements and the full history of what you have completed."
      />

      <AchievementsStrip />

      <div className="mt-4 flex flex-col gap-2.5">
        <DevelopRecord title="My certificates" defaultOpen={false}>
          <CertificateViewer />
        </DevelopRecord>
        <DevelopRecord title="My learning record" defaultOpen={false}>
          <MyLearningRecord email={email} />
        </DevelopRecord>
      </div>
    </section>
  );
}