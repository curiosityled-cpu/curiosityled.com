import React from "react";
import { Link, useLocation } from "react-router-dom";

const industries = [
  { label: "Overview", path: "/LandingPage" },
  { label: "BPO & Operations", path: "/landing-bpo" },
  { label: "Healthcare", path: "/landing-healthcare" },
  { label: "Coaching & Consulting", path: "/landing-coaching" },
];

export default function IndustryNav() {
  const location = useLocation();
  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/LandingPage" className="flex items-center gap-2">
          <img
            src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/5761758bf_CuriosityLegLogo.png"
            alt="Curiosity Led"
            className="w-8 h-8 object-contain"
          />
          <span className="font-semibold text-slate-900 text-sm">Curiosity Led</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {industries.map((item) => {
            const active = location.pathname === item.path || (item.path === "/LandingPage" && location.pathname === "/");
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <a
          href="mailto:hello@curiosityled.com"
          className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          Book a Demo
        </a>
      </div>
      {/* Mobile industry nav */}
      <div className="md:hidden flex gap-2 px-4 pb-2 overflow-x-auto">
        {industries.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                active ? "bg-slate-900 text-white" : "text-slate-500 bg-slate-100 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}