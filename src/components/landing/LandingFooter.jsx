import React from "react";
import { base44 } from "@/api/base44Client";

const DEMO_URL = "https://cal.com/curiosityled/discoverycall";

export default function LandingFooter() {
  const handleLogin = () => {
    base44.auth.redirectToLogin("/");
  };

  return (
    <footer id="site-footer" className="bg-white border-t border-gray-100 py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be036d547_CuriosityLedIcon_20241030_085533_0000.png"
            alt="Curiosity Led"
            className="w-6 h-6 object-contain"
          />
          <div>
            <span className="text-sm font-semibold text-gray-900">Curiosity Led</span>
            <p className="text-xs text-gray-400 mt-0.5">Leadership support before problems escalate.</p>
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6">
          <button
            onClick={handleLogin}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Log in
          </button>
          <a
            href={DEMO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[#0202FF] hover:text-[#0000dd] transition-colors"
          >
            Book a demo
          </a>
        </div>

        {/* Copyright */}
        <p className="text-xs text-gray-400">© Curiosity Led</p>
      </div>
    </footer>
  );
}