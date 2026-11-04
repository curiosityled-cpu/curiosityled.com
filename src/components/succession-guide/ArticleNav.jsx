import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function ArticleNav() {
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
        scrolled ? "bg-[#FBFAF7]/95 backdrop-blur border-b border-[#E6E1D7]" : "bg-transparent border-b border-transparent"
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
        <div className="hidden sm:flex items-center gap-6">
          <Link to="/" className="text-sm text-[#6B6560] hover:text-[#151515] transition-colors">
            Product
          </Link>
          <Link to="/healthcare" className="text-sm text-[#6B6560] hover:text-[#151515] transition-colors">
            Healthcare
          </Link>
          <a
            href="#workbook-form"
            className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#0202ff" }}
          >
            Get the workbook
          </a>
        </div>
        <a
          href="#workbook-form"
          className="sm:hidden text-xs font-semibold text-white px-3 py-2 rounded-lg"
          style={{ backgroundColor: "#0202ff" }}
        >
          Get it
        </a>
      </div>
    </header>
  );
}