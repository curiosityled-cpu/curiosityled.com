import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  TrendingUp,
  Dumbbell,
  Users,
  Brain,
  Settings,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────
// SCREENSHOT SLOTS
// To add a real screenshot, drop the uploaded image URL into the `image` field
// for that slot below. Until then a labeled placeholder is shown.
// ──────────────────────────────────────────────────────────────────────────
const SCREENSHOTS = [
  {
    key: "manager-lead",
    title: "Manager — Lead Page",
    tagline: "The manager moment, lightweight and practical",
    description:
      "Daily check-in, top priorities, and KPI / goal tracking — the in-the-flow-of-work experience that proves the manager moment is lightweight and practical.",
    icon: Calendar,
    route: "/today",
    image: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/491f81f72_generated_image.png",
  },
  {
    key: "manager-patterns",
    title: "Manager — Patterns Page",
    tagline: "One hero pattern, signals, linked KPI, recommended next action",
    description:
      "A prioritized hero pattern with evidence/signals, a linked KPI or trend, and a recommended next action. Watch items carry statuses like Emerging, Active, and Persistent.",
    icon: TrendingUp,
    route: "/patterns",
    image: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/db6caac00_generated_image.png",
  },
  {
    key: "manager-practice",
    title: "Manager — Practice / Coaching Flow",
    tagline: "Scenario-based walkthrough: prepare for a difficult conversation",
    description:
      "A scenario-based coaching flow — \"prepare for a difficult conversation,\" \"1:1 prep,\" or \"work through it.\" Critical for the scenario-based walkthrough.",
    icon: Dumbbell,
    route: "/practice",
    image: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/e57532116_generated_image.png",
  },
  {
    key: "hrbp-dashboard",
    title: "HRBP Dashboard",
    tagline: "Manager risk/pattern status, trends, recommended actions",
    description:
      "A manager list or unit view showing manager risk/pattern status, trends, recommended actions, and team-level signal. (If not yet live, a labeled illustrative mockup can stand in.)",
    icon: Users,
    route: "/Portfolio",
    image: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/35cfc906f_generated_image.png",
  },
  {
    key: "leadership-intelligence-hub",
    title: "Leadership Intelligence Hub / Executive Dashboard",
    tagline: "Aggregate patterns, not confidential individual details",
    description:
      "Leadership health, risk, bench strength/readiness, intervention activity/effectiveness, trend filters, and facility/function drill-down. Supports the executive message that leaders see aggregate patterns, not confidential individual details.",
    icon: Brain,
    route: "/LeadershipIntelligenceHub",
    image: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/cc3504759_generated_image.png",
  },
  {
    key: "admin-talent-specialist",
    title: "Admin / Talent Specialist View",
    tagline: "Operationally real — provisioning, configuration, analytics",
    description:
      "User provisioning, assessment configuration, learning journey administration, report scheduling, competency configuration, or adoption analytics. Demonstrates the platform is operationally real.",
    icon: Settings,
    route: "/UserManagement",
    image: "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/ee7b57f3b_generated_image.png",
  },
];

export default function TestLanding() {
  const [slots, setSlots] = useState(SCREENSHOTS);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <img
              src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/5761758bf_CuriosityLegLogo.png"
              alt="Curiosity Led"
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-2xl font-bold tracking-tight">Curiosity Led — Pitch Deck Screenshots</h1>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-1 border border-amber-200">
              Illustrative mockups
            </span>
            <span className="text-xs text-muted-foreground">Designed future-state — not live product screenshots</span>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">
            A reference page displaying the essential product screenshots for the pitch deck.
            Each card shows the page, what it demonstrates, and where to find it in the app.
          </p>
        </div>
      </header>

      {/* Screenshot Grid */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {slots.map((slot) => {
            const Icon = slot.icon;
            return (
              <Card key={slot.key} className="overflow-hidden flex flex-col">
                {/* Image area */}
                <div className="relative aspect-[16/10] bg-slate-100 flex items-center justify-center">
                  {slot.image ? (
                    <img
                      src={slot.image}
                      alt={slot.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center px-6">
                      <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-3">
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">Screenshot pending</p>
                      <p className="text-xs text-slate-400 mt-0.5">Upload to chat to wire it in</p>
                    </div>
                  )}
                </div>

                {/* Content */}
                <CardContent className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4.5 h-4.5 text-slate-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold leading-tight">{slot.title}</h2>
                      <p className="text-xs text-[#0202ff] font-medium mt-0.5">{slot.tagline}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {slot.description}
                  </p>
                  <div className="mt-4 pt-3 border-t flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Route: <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{slot.route}</code>
                    </span>
                    <Button asChild variant="ghost" size="sm">
                      <Link to={slot.route} target="_blank">
                        Open page <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="mt-10 text-center">
          <p className="text-xs text-muted-foreground">
            6 essential screenshots · Curiosity Led Leadership Development Platform
          </p>
        </div>
      </main>
    </div>
  );
}