import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Compass, Dumbbell } from "lucide-react";

const AREAS = [
  { label: "My Journey", to: "/develop/journey", icon: Compass, match: ["/develop/journey", "/my-development"] },
  { label: "Practice", to: "/practice", icon: Dumbbell, match: ["/practice"] },
];

/**
 * Sits at the top of each Develop area: a way back to the hub and a switcher
 * between the two areas, so Practice reads as a section of Develop rather than
 * a separate destination.
 */
export default function DevelopAreaHeader() {
  const { pathname } = useLocation();
  const activeTo = AREAS.find((area) => area.match.some((path) => pathname.startsWith(path)))?.to;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Link
        to="/develop"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Develop
      </Link>

      <nav className="inline-flex w-fit rounded-xl border border-border bg-card p-1">
        {AREAS.map((area) => {
          const Icon = area.icon;
          const isActive = activeTo === area.to;
          return (
            <Link
              key={area.to}
              to={area.to}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-[#0202ff] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {area.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}