/**
 * CompetencyLearningSection
 * Shows LinkedIn Learning courses grouped by competency.
 * Fetches LearningResource records tagged with linkedin provider.
 * Visible in both My Leadership and Insights pages.
 */
import React, { useState, useEffect } from "react";
import { BookOpen, Linkedin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import LinkedInLearningCard from "./LinkedInLearningCard";

// All 6 assessment competencies + extra leadership competencies
const COMPETENCY_ORDER = [
  "Situational Intelligence",
  "Decision Making",
  "Communication",
  "Resource Management",
  "Stakeholder Management",
  "Performance Management",
  "Emotional Intelligence",
  "Strategic Thinking",
  "Adaptability",
  "Team Leadership",
  "Delegation",
  "Developing Others",
];

export default function CompetencyLearningSection({ user, assessmentScores }) {
  const [coursesByCompetency, setCoursesByCompetency] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const resources = await base44.entities.LearningResource.filter({
        provider: "LinkedIn Learning",
        is_active: true,
      });
      // Group by first competency tag
      const grouped = {};
      resources.forEach(r => {
        const comp = r.competencies?.[0];
        if (!comp) return;
        if (!grouped[comp]) grouped[comp] = [];
        grouped[comp].push(r);
      });
      setCoursesByCompetency(grouped);
    } catch (e) {
      console.warn("[CompetencyLearningSection] load error:", e.message);
    } finally {
      setLoading(false);
    }
  };

  // Sort: assessment competencies with lowest scores first (if scores provided), then the rest
  const sortedCompetencies = Object.keys(coursesByCompetency).sort((a, b) => {
    const compKeyMap = {
      "Situational Intelligence": "si_pct",
      "Decision Making": "dm_pct",
      "Communication": "comm_pct",
      "Resource Management": "rm_pct",
      "Stakeholder Management": "sm_pct",
      "Performance Management": "pm_pct",
    };
    const aScore = assessmentScores?.[compKeyMap[a]] ?? 999;
    const bScore = assessmentScores?.[compKeyMap[b]] ?? 999;
    // Put assessment comps with real scores first (lowest score first = highest priority)
    if (aScore !== 999 && bScore !== 999) return aScore - bScore;
    if (aScore !== 999) return -1;
    if (bScore !== 999) return 1;
    return COMPETENCY_ORDER.indexOf(a) - COMPETENCY_ORDER.indexOf(b);
  });

  if (loading) return null;
  if (!sortedCompetencies.length) return null;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#0077b5]/10 rounded-lg">
            <Linkedin className="w-5 h-5 text-[#0077b5]" />
          </div>
          <div>
            <CardTitle>LinkedIn Learning Courses</CardTitle>
            <p className="text-sm text-gray-500 mt-0.5">
              Curated courses for each competency. Requires a LinkedIn Learning license.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedCompetencies.map((comp, i) => (
          <LinkedInLearningCard
            key={comp}
            courses={coursesByCompetency[comp]}
            userEmail={user?.email}
            competencyName={comp}
            defaultOpen={i === 0}
          />
        ))}
      </CardContent>
    </Card>
  );
}