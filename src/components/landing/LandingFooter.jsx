import React from "react";
import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingFooter() {
  return (
    <footer className="bg-[#0f0f1a] border-t border-white/10 py-14 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <img
                src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/afe1cf141_CuriosityLedLogoWBB.png"
                alt="Curiosity Led"
                className="h-10 object-contain"
              />
            </div>
            <p className="text-gray-400 text-xs leading-relaxed max-w-[220px]">
              Leadership intelligence, built for the flow of work. Microsoft native. Support first. Designed for operational leaders.
            </p>
            <Link to="/LandingPage" className="text-gray-400 text-xs hover:text-white transition-colors mt-3">
              → Visit main site
            </Link>
          </div>

          {/* Industries */}
          <div>
            <p className="text-white text-xs font-semibold uppercase tracking-widest mb-4">Industries</p>
            <ul className="space-y-2">
              <li><Link to="/bpo" className="text-gray-400 text-xs hover:text-white transition-colors">BPO &amp; Operations</Link></li>
              <li><Link to="/healthcare" className="text-gray-400 text-xs hover:text-white transition-colors">Healthcare</Link></li>
              <li><Link to="/coaching" className="text-gray-400 text-xs hover:text-white transition-colors">Coaching &amp; Consulting</Link></li>
            </ul>
          </div>

          {/* Security */}
          <div>
            <p className="text-white text-xs font-semibold uppercase tracking-widest mb-4">Security &amp; Privacy</p>
            <ul className="space-y-2">
              {[
                "Individual data stays private",
                "Managers own their own data",
                "No surveillance — support only",
                "Microsoft-compliant data handling",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-gray-400 text-xs">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <p className="text-gray-500 text-xs">© {new Date().getFullYear()} Curiosity Led. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/PrivacyPolicy" className="text-gray-400 text-xs hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/TermsOfService" className="text-gray-400 text-xs hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
          <a
            href="mailto:team@curiosityled.com"
            className="text-gray-400 text-xs hover:text-white transition-colors"
          >
            team@curiosityled.com
          </a>
        </div>
      </div>
    </footer>
  );
}