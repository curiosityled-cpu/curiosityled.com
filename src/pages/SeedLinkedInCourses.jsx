import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, Linkedin } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const COURSES = [
  { title: "Unconscious Bias", provider: "LinkedIn Learning", author: "Stacey Gordon", url: "https://www.linkedin.com/learning/unconscious-bias", competencies: ["Situational Intelligence"], leadership_level: "Mid-Level Manager (managers of managers, experienced team leads, functional leads)", difficulty_level: "intermediate", type: "course", duration_string: "57 min", access: "Subscription", year: 2022, is_active: true, is_premium: true },
  { title: "Developing Your Emotional Intelligence", provider: "LinkedIn Learning", author: "Gemma Leigh Roberts", url: "https://www.linkedin.com/learning/developing-your-emotional-intelligence", competencies: ["Situational Intelligence"], leadership_level: "Individual Contributor to First-Time Manager (entry-level leaders, frontline managers, new supervisors)", difficulty_level: "beginner", type: "course", duration_string: "1h 10m", access: "Subscription", year: 2022, is_active: true, is_premium: true },
  { title: "Situational Leadership Foundations", provider: "LinkedIn Learning", author: "Todd Dewett", url: "https://www.linkedin.com/learning/situational-leadership-foundations", competencies: ["Situational Intelligence"], leadership_level: "Mid-Level Manager (managers of managers, experienced team leads, functional leads)", difficulty_level: "intermediate", type: "course", duration_string: "1h 15m", access: "Subscription", year: 2021, is_active: true, is_premium: true },
  { title: "Making Data-Driven Decisions", provider: "LinkedIn Learning", author: "Barton Poulson", url: "https://www.linkedin.com/learning/making-data-driven-decisions", competencies: ["Decision Making"], leadership_level: "Mid-Level Manager (managers of managers, experienced team leads, functional leads)", difficulty_level: "intermediate", type: "course", duration_string: "1h 22m", access: "Subscription", year: 2023, is_active: true, is_premium: true },
  { title: "Critical Thinking", provider: "LinkedIn Learning", author: "Dave Crenshaw", url: "https://www.linkedin.com/learning/critical-thinking", competencies: ["Decision Making"], leadership_level: "Individual Contributor to First-Time Manager (entry-level leaders, frontline managers, new supervisors)", difficulty_level: "beginner", type: "course", duration_string: "59 min", access: "Subscription", year: 2022, is_active: true, is_premium: true },
  { title: "Decision-Making Under Pressure", provider: "LinkedIn Learning", author: "Dorie Clark", url: "https://www.linkedin.com/learning/decision-making-under-pressure", competencies: ["Decision Making"], leadership_level: "Senior Manager / Business Unit Leader (leads larger teams, cross-functional groups, or business units)", difficulty_level: "advanced", type: "course", duration_string: "45 min", access: "Subscription", year: 2023, is_active: true, is_premium: true },
  { title: "Communication Foundations", provider: "LinkedIn Learning", author: "Brenda Bailey-Hughes", url: "https://www.linkedin.com/learning/communication-foundations-2", competencies: ["Communication"], leadership_level: "Individual Contributor to First-Time Manager (entry-level leaders, frontline managers, new supervisors)", difficulty_level: "beginner", type: "course", duration_string: "1h 10m", access: "Subscription", year: 2022, is_active: true, is_premium: true },
  { title: "Executive Presence on Video Calls", provider: "LinkedIn Learning", author: "Todd Dewett", url: "https://www.linkedin.com/learning/executive-presence-on-video-calls", competencies: ["Communication"], leadership_level: "Mid-Level Manager (managers of managers, experienced team leads, functional leads)", difficulty_level: "intermediate", type: "course", duration_string: "35 min", access: "Subscription", year: 2021, is_active: true, is_premium: true },
  { title: "Communicating with Confidence", provider: "LinkedIn Learning", author: "Jeff Ansell", url: "https://www.linkedin.com/learning/communicating-with-confidence", competencies: ["Communication"], leadership_level: "Individual Contributor to First-Time Manager (entry-level leaders, frontline managers, new supervisors)", difficulty_level: "beginner", type: "course", duration_string: "1h 4m", access: "Subscription", year: 2022, is_active: true, is_premium: true },
  { title: "Time Management Fundamentals", provider: "LinkedIn Learning", author: "Dave Crenshaw", url: "https://www.linkedin.com/learning/time-management-fundamentals", competencies: ["Resource Management"], leadership_level: "Individual Contributor to First-Time Manager (entry-level leaders, frontline managers, new supervisors)", difficulty_level: "beginner", type: "course", duration_string: "2h 51m", access: "Subscription", year: 2022, is_active: true, is_premium: true },
  { title: "Managing Multiple Priorities", provider: "LinkedIn Learning", author: "Natasha Bowman", url: "https://www.linkedin.com/learning/managing-multiple-priorities", competencies: ["Resource Management"], leadership_level: "Mid-Level Manager (managers of managers, experienced team leads, functional leads)", difficulty_level: "intermediate", type: "course", duration_string: "1h 5m", access: "Subscription", year: 2023, is_active: true, is_premium: true },
  { title: "Budget Basics for Non-Finance Managers", provider: "LinkedIn Learning", author: "Mike Figliuolo", url: "https://www.linkedin.com/learning/budget-basics-for-non-finance-managers", competencies: ["Resource Management"], leadership_level: "Mid-Level Manager (managers of managers, experienced team leads, functional leads)", difficulty_level: "intermediate", type: "course", duration_string: "1h 15m", access: "Subscription", year: 2021, is_active: true, is_premium: true },
  { title: "Stakeholder Management", provider: "LinkedIn Learning", author: "Frank Saladis", url: "https://www.linkedin.com/learning/stakeholder-management", competencies: ["Stakeholder Management"], leadership_level: "Mid-Level Manager (managers of managers, experienced team leads, functional leads)", difficulty_level: "intermediate", type: "course", duration_string: "55 min", access: "Subscription", year: 2022, is_active: true, is_premium: true },
  { title: "Influencing Others", provider: "LinkedIn Learning", author: "John Ullmen", url: "https://www.linkedin.com/learning/influencing-others", competencies: ["Stakeholder Management"], leadership_level: "Senior Manager / Business Unit Leader (leads larger teams, cross-functional groups, or business units)", difficulty_level: "intermediate", type: "course", duration_string: "1h 38m", access: "Subscription", year: 2022, is_active: true, is_premium: true },
  { title: "Building Relationships While Working from Home", provider: "LinkedIn Learning", author: "Todd Dewett", url: "https://www.linkedin.com/learning/building-relationships-while-working-from-home", competencies: ["Stakeholder Management"], leadership_level: "Individual Contributor to First-Time Manager (entry-level leaders, frontline managers, new supervisors)", difficulty_level: "beginner", type: "course", duration_string: "28 min", access: "Subscription", year: 2020, is_active: true, is_premium: true },
  { title: "Performance Management: Setting Goals and Managing Performance", provider: "LinkedIn Learning", author: "Todd Dewett", url: "https://www.linkedin.com/learning/performance-management-setting-goals-and-managing-performance", competencies: ["Performance Management"], leadership_level: "Mid-Level Manager (managers of managers, experienced team leads, functional leads)", difficulty_level: "intermediate", type: "course", duration_string: "1h 24m", access: "Subscription", year: 2022, is_active: true, is_premium: true },
  { title: "Giving and Receiving Feedback", provider: "LinkedIn Learning", author: "Gemma Leigh Roberts", url: "https://www.linkedin.com/learning/giving-and-receiving-feedback", competencies: ["Performance Management"], leadership_level: "Individual Contributor to First-Time Manager (entry-level leaders, frontline managers, new supervisors)", difficulty_level: "beginner", type: "course", duration_string: "1h 2m", access: "Subscription", year: 2022, is_active: true, is_premium: true },
  { title: "Coaching and Mentoring", provider: "LinkedIn Learning", author: "Lisa Earle McLeod", url: "https://www.linkedin.com/learning/coaching-and-mentoring", competencies: ["Performance Management"], leadership_level: "Mid-Level Manager (managers of managers, experienced team leads, functional leads)", difficulty_level: "intermediate", type: "course", duration_string: "1h 10m", access: "Subscription", year: 2023, is_active: true, is_premium: true },
  { title: "Empathy for Sales Professionals", provider: "LinkedIn Learning", author: "Brenda Bailey-Hughes", url: "https://www.linkedin.com/learning/empathy-for-sales-professionals", competencies: ["Emotional Intelligence"], leadership_level: "Mid-Level Manager (managers of managers, experienced team leads, functional leads)", difficulty_level: "intermediate", type: "course", duration_string: "47 min", access: "Subscription", year: 2021, is_active: true, is_premium: true },
  { title: "Leading with Emotional Intelligence", provider: "LinkedIn Learning", author: "Britt Andreatta", url: "https://www.linkedin.com/learning/leading-with-emotional-intelligence", competencies: ["Emotional Intelligence"], leadership_level: "Mid-Level Manager (managers of managers, experienced team leads, functional leads)", difficulty_level: "intermediate", type: "course", duration_string: "1h 13m", access: "Subscription", year: 2022, is_active: true, is_premium: true },
  { title: "Strategic Planning Foundations", provider: "LinkedIn Learning", author: "Mike Figliuolo", url: "https://www.linkedin.com/learning/strategic-planning-foundations", competencies: ["Strategic Thinking"], leadership_level: "Senior Manager / Business Unit Leader (leads larger teams, cross-functional groups, or business units)", difficulty_level: "intermediate", type: "course", duration_string: "1h 41m", access: "Subscription", year: 2022, is_active: true, is_premium: true },
  { title: "Business Acumen for Project Managers", provider: "LinkedIn Learning", author: "Bob McGannon", url: "https://www.linkedin.com/learning/business-acumen-for-project-managers", competencies: ["Strategic Thinking"], leadership_level: "Mid-Level Manager (managers of managers, experienced team leads, functional leads)", difficulty_level: "intermediate", type: "course", duration_string: "1h 18m", access: "Subscription", year: 2022, is_active: true, is_premium: true },
  { title: "Embracing Change", provider: "LinkedIn Learning", author: "Todd Dewett", url: "https://www.linkedin.com/learning/embracing-change", competencies: ["Adaptability"], leadership_level: "Individual Contributor to First-Time Manager (entry-level leaders, frontline managers, new supervisors)", difficulty_level: "beginner", type: "course", duration_string: "56 min", access: "Subscription", year: 2021, is_active: true, is_premium: true },
  { title: "Building Resilience", provider: "LinkedIn Learning", author: "Tatiana Kolovou", url: "https://www.linkedin.com/learning/building-resilience", competencies: ["Adaptability"], leadership_level: "Mid-Level Manager (managers of managers, experienced team leads, functional leads)", difficulty_level: "intermediate", type: "course", duration_string: "1h 8m", access: "Subscription", year: 2022, is_active: true, is_premium: true },
  { title: "Team Leadership", provider: "LinkedIn Learning", author: "Britt Andreatta", url: "https://www.linkedin.com/learning/team-leadership", competencies: ["Team Leadership"], leadership_level: "Mid-Level Manager (managers of managers, experienced team leads, functional leads)", difficulty_level: "intermediate", type: "course", duration_string: "1h 26m", access: "Subscription", year: 2022, is_active: true, is_premium: true },
  { title: "Building High-Performance Teams", provider: "LinkedIn Learning", author: "Chris Croft", url: "https://www.linkedin.com/learning/building-high-performance-teams", competencies: ["Team Leadership"], leadership_level: "Senior Manager / Business Unit Leader (leads larger teams, cross-functional groups, or business units)", difficulty_level: "advanced", type: "course", duration_string: "1h 45m", access: "Subscription", year: 2023, is_active: true, is_premium: true },
  { title: "Delegating Tasks", provider: "LinkedIn Learning", author: "Kevin Eikenberry", url: "https://www.linkedin.com/learning/delegating-tasks", competencies: ["Delegation"], leadership_level: "Individual Contributor to First-Time Manager (entry-level leaders, frontline managers, new supervisors)", difficulty_level: "beginner", type: "course", duration_string: "49 min", access: "Subscription", year: 2022, is_active: true, is_premium: true },
  { title: "Delegation and Empowerment", provider: "LinkedIn Learning", author: "Mike Figliuolo", url: "https://www.linkedin.com/learning/delegation-and-empowerment", competencies: ["Delegation"], leadership_level: "Mid-Level Manager (managers of managers, experienced team leads, functional leads)", difficulty_level: "intermediate", type: "course", duration_string: "1h 10m", access: "Subscription", year: 2021, is_active: true, is_premium: true },
  { title: "Coaching Skills for Leaders and Managers", provider: "LinkedIn Learning", author: "Sara Canaday", url: "https://www.linkedin.com/learning/coaching-skills-for-leaders-and-managers", competencies: ["Developing Others"], leadership_level: "Mid-Level Manager (managers of managers, experienced team leads, functional leads)", difficulty_level: "intermediate", type: "course", duration_string: "1h 21m", access: "Subscription", year: 2022, is_active: true, is_premium: true },
  { title: "Developing Employees", provider: "LinkedIn Learning", author: "Todd Dewett", url: "https://www.linkedin.com/learning/developing-employees", competencies: ["Developing Others"], leadership_level: "Individual Contributor to First-Time Manager (entry-level leaders, frontline managers, new supervisors)", difficulty_level: "beginner", type: "course", duration_string: "57 min", access: "Subscription", year: 2021, is_active: true, is_premium: true },
];

export default function SeedLinkedInCourses() {
  const { user } = useAuth();
  const [status, setStatus] = useState("idle"); // idle | running | done | error
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("");

  const runSeed = async () => {
    setStatus("running");
    setCount(0);
    try {
      // Check if already seeded
      const existing = await base44.entities.LearningResource.filter({ provider: "LinkedIn Learning" });
      if (existing.length > 0) {
        setMessage(`Already seeded — ${existing.length} LinkedIn Learning courses exist.`);
        setStatus("done");
        return;
      }
      let created = 0;
      for (const course of COURSES) {
        await base44.entities.LearningResource.create(course);
        created++;
        setCount(created);
      }
      setMessage(`Successfully seeded ${created} LinkedIn Learning courses.`);
      setStatus("done");
    } catch (e) {
      setMessage(`Error: ${e.message}`);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="w-5 h-5 text-[#0077b5]" />
            Seed LinkedIn Learning Courses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            This will create {COURSES.length} LinkedIn Learning courses across 12 competency areas
            into the LearningResource library. Run once only.
          </p>
          {message && (
            <div className={`p-3 rounded-lg text-sm ${status === "done" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {message}
            </div>
          )}
          {status === "running" && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating course {count} of {COURSES.length}...
            </div>
          )}
          {status === "done" && (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              Done!
            </div>
          )}
          <Button
            className="w-full bg-[#0077b5] hover:bg-[#006396] text-white"
            onClick={runSeed}
            disabled={status === "running" || status === "done"}
          >
            {status === "running" ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Seeding...</>
            ) : status === "done" ? (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Seeded</>
            ) : (
              "Run Seed"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}