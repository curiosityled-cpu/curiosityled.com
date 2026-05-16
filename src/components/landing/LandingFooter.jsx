import React from "react";

export default function LandingFooter() {
  return (
    <footer className="bg-[#0f1030] py-10 border-t border-white/10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be036d547_CuriosityLedIcon_20241030_085533_0000.png"
            alt="Curiosity Led"
            className="w-7 h-7 object-contain"
          />
          <span className="text-white font-bold text-sm">Curiosity Led</span>
        </div>
        <p className="text-gray-300 text-xs text-center">
          © {new Date().getFullYear()} Curiosity Led. Built for healthcare organizations developing newly promoted and newly hired leaders.
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
            href="https://cal.com/curiosityled/discoverycall"
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