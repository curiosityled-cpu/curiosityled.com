import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogin = () => {
    base44.auth.redirectToLogin("/");
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white border-b border-gray-100 shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <img
            src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/7f8bef2bf_CuriosityLedLogoBBW1.png"
            alt="Curiosity Led"
            className="h-10 object-contain"
          />
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleLogin}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2"
          >
            Log in
          </button>
          <a
            href="https://cal.com/curiosityled/discoverycall"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all hover:opacity-90"
            style={{ backgroundColor: "#0202ff" }}
          >
            Book a demo
          </a>
        </div>
      </div>
    </nav>
  );
}