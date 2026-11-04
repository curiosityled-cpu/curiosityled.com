import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function BlogHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-[#FBFAF7]/95 backdrop-blur border-b border-[#E6E1D7]"
          : "bg-[#FBFAF7] border-b border-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img
            src="https://raw.githubusercontent.com/curiosityled-cpu/curiosityled.com/main/public/CuriosityLedLogoBBW%20(1).png"
            alt="Curiosity Led"
            className="h-9 object-contain"
          />
        </Link>

        <nav className="hidden sm:flex items-center gap-7">
          <Link to="/" className="text-sm text-[#6B6560] hover:text-[#151515] transition-colors">
            Product
          </Link>
          <Link to="/blog" className="text-sm font-semibold text-[#151515]">
            Journal
          </Link>
          <Link to="/healthcare" className="text-sm text-[#6B6560] hover:text-[#151515] transition-colors">
            Healthcare
          </Link>
          <Link to="/bpo" className="text-sm text-[#6B6560] hover:text-[#151515] transition-colors">
            BPO &amp; Operations
          </Link>
        </nav>

        <a
          href="https://cal.com/curiosityled/bookdemo"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex text-sm font-semibold text-white px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0202ff" }}
        >
          Book a demo
        </a>

        <a
          href="https://cal.com/curiosityled/bookdemo"
          target="_blank"
          rel="noopener noreferrer"
          className="sm:hidden text-xs font-semibold text-white px-3 py-2 rounded-lg"
          style={{ backgroundColor: "#0202ff" }}
        >
          Demo
        </a>
      </div>
    </header>
  );
}