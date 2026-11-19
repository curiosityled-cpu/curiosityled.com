import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Home,
  Users,
  Dumbbell,
  FolderOpen,
  Brain,
  Target,
  Layers,
  BarChart2,
  UserCog,
  Check,
} from "lucide-react";
import { STEPS } from "@/lib/exploreDemoContent";

const WORDMARK_LIGHT =
  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/a426953be_CuriosityLedLogoBBW.png";

const NAV = [
  { label: "Lead", icon: Home },
  { label: "Team", icon: Users },
  { label: "Practice", icon: Dumbbell },
];

const ADMIN_CHILDREN = [
  { label: "Leadership Intelligence", icon: Brain },
  { label: "Development Manager", icon: Users },
  { label: "Performance Manager", icon: Target },
  { label: "Talent Manager", icon: Layers },
  { label: "Report Manager", icon: BarChart2 },
  { label: "User Management", icon: UserCog },
];

// Which nav entry lights up on each demo step, mirroring the real app's active state
const ACTIVE_BY_STEP = ["Practice", "Lead", "Lead", "Practice", "Leadership Intelligence"];

function NavRow({ item, active }) {
  const Icon = item.icon;
  const [hover, setHover] = useState(false);
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg font-medium px-3 py-2.5 text-sm ${
        active ? "bg-[#0202ff] text-white shadow-sm" : ""
      }`}
      style={
        active
          ? undefined
          : {
              color: "hsl(var(--muted-foreground))",
              background: hover ? "hsl(var(--muted))" : "",
            }
      }
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {active && <ChevronRight className="w-3 h-3" />}
    </div>
  );
}

export default function DemoShell({ step, onStep, children }) {
  const [groupOpen, setGroupOpen] = useState(true);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar — the app shell */}
      <aside
        className="hidden sm:flex flex-col w-64 fixed inset-y-0 left-0 z-20"
        style={{ background: "hsl(var(--sidebar-background))", borderRight: "1px solid hsl(var(--sidebar-border))" }}
      >
        <div
          className="flex items-center justify-between px-4 min-h-[6rem] py-3"
          style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}
        >
          <img src={WORDMARK_LIGHT} alt="Curiosity Led" className="w-full h-auto object-contain object-left" />
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => (
            <NavRow key={item.label} item={item} active={ACTIVE_BY_STEP[step] === item.label} />
          ))}

          <div className="pt-2">
            <button
              onClick={() => setGroupOpen((v) => !v)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              <FolderOpen className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">Administration</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${groupOpen ? "rotate-180" : ""}`} />
            </button>
            {groupOpen && (
              <div className="mt-0.5 ml-3 pl-3 border-l border-border space-y-0.5">
                {ADMIN_CHILDREN.map((child) => {
                  const Icon = child.icon;
                  const active = ACTIVE_BY_STEP[step] === child.label;
                  return (
                    <div
                      key={child.label}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                        active ? "bg-[#0202ff] text-white shadow-sm" : ""
                      }`}
                      style={active ? undefined : { color: "hsl(var(--muted-foreground))" }}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{child.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="p-2" style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}>
          <div className="flex items-center gap-1 px-2 py-2 rounded-lg">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "hsl(var(--primary)/0.15)" }}
            >
              <span className="text-xs font-bold" style={{ color: "hsl(var(--ring))" }}>
                A
              </span>
            </div>
            <div className="flex-1 min-w-0 px-1">
              <p className="text-xs font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                Alex Rivera
              </p>
              <p className="text-[10px] truncate" style={{ color: "hsl(var(--muted-foreground))" }}>
                Demo account
              </p>
            </div>
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(var(--muted-foreground))" }} />
          </div>
        </div>
      </aside>

      {/* Mobile header — the app shell */}
      <header
        className="sm:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14"
        style={{ background: "hsl(var(--card))", borderBottom: "1px solid hsl(var(--sidebar-border))" }}
      >
        <div className="flex items-center gap-2">
          <img
            src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/5761758bf_CuriosityLegLogo.png"
            alt="Curiosity Led"
            className="w-7 h-7 object-contain"
          />
          <span className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>
            Curiosity Led
          </span>
        </div>
        <span className="text-[11px] font-semibold text-gray-500">
          Step {step + 1}/{STEPS.length}
        </span>
      </header>

      <main className="flex-1 min-w-0 overflow-hidden sm:ml-64 pt-14 sm:pt-0 min-h-screen">
        {/* Demo strip — sits above the page exactly like the app's own banners */}
        <div className="border-b border-gray-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider text-[9px] font-bold flex-shrink-0">
                Demo
              </span>
              <span className="text-[11px] text-gray-500 truncate hidden sm:inline">
                Sample data — nothing here is saved
              </span>
            </div>

            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <button
                    key={s.id}
                    onClick={() => onStep(i)}
                    title={s.label}
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                      active ? "bg-[#0202ff] text-white" : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                        done
                          ? "bg-emerald-500 text-white"
                          : active
                          ? "bg-white/20 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {done ? <Check className="w-2 h-2" /> : i + 1}
                    </span>
                    <span className="hidden lg:inline">{s.short}</span>
                  </button>
                );
              })}
            </div>

            <Link to="/" className="text-xs font-semibold text-gray-500 hover:text-gray-900 whitespace-nowrap">
              Exit
            </Link>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}