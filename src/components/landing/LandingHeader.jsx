import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const DEMO_URL = "https://cal.com/curiosityled/discoverycall";

export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogin = () => {
    base44.auth.redirectToLogin("/");
  };

  return (
    <header
      id="site-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white border-b border-black/8 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <div className="flex items-center gap-3">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be036d547_CuriosityLedIcon_20241030_085533_0000.png"
            alt="Curiosity Led"
            className="w-8 h-8 object-contain"
          />
          <span className="text-[15px] font-semibold tracking-tight text-gray-900">
            Curiosity Led
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogin}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
          >
            Log in
          </button>
          <a
            href={DEMO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-semibold bg-[#0202FF] text-white hover:bg-[#0000dd] transition-colors"
          >
            Book a demo
          </a>
        </div>
      </div>
    </header>
  );
}