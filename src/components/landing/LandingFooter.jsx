import React from "react";

export default function LandingFooter() {
  return (
    <footer className="bg-[#1a1a2e] py-10 border-t border-white/10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center">
          <img
            src="https://raw.githubusercontent.com/curiosityled-cpu/curiosityled.com/main/public/CuriosityLedLogoWBB.png"
            alt="Curiosity Led"
            className="h-10 object-contain"
          />
        </div>
        <p className="text-gray-300 text-xs text-center">
          © {new Date().getFullYear()} Curiosity Led.
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://eosoria.wixstudio.com/mysite"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            curiosityled.com
          </a>
          <a
            href="https://cal.com/curiosityled/bookdemo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-blue-300 hover:text-blue-200 transition-colors"
          >
            Book a demo →
          </a>
        </div>
      </div>
    </footer>
  );
}