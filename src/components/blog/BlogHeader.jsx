import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import BrandLogo from "@/components/landing/BrandLogo";

const INDUSTRY_LINKS = [
  { to: "/healthcare", label: "Healthcare" },
  { to: "/bpo", label: "BPO & Operations" },
  { to: "/coaching", label: "Coaching" },
];

export default function BlogHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [industryOpen, setIndustryOpen] = useState(false);
  const industryRef = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setIndustryOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e) => {
      if (industryRef.current && !industryRef.current.contains(e.target)) setIndustryOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const industryActive = INDUSTRY_LINKS.some((l) => l.to === pathname);
  const linkClass = (active) =>
    `text-sm transition-colors hover:text-[#151515] ${active ? "font-semibold text-[#151515]" : "text-[#6B6560]"}`;

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled || open
          ? "bg-[#FBFAF7]/95 backdrop-blur border-b border-[#E6E1D7]"
          : "bg-[#FBFAF7] border-b border-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center">
          <BrandLogo />
        </Link>

        <nav className="hidden sm:flex items-center gap-7">
          <Link to="/" className={linkClass(pathname === "/")}>
            Product
          </Link>

          <div className="relative" ref={industryRef}>
            <button
              onClick={() => setIndustryOpen((v) => !v)}
              aria-expanded={industryOpen}
              aria-haspopup="true"
              className={`flex items-center gap-1 ${linkClass(industryActive || industryOpen)}`}
            >
              Industry
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${industryOpen ? "rotate-180" : ""}`}
              />
            </button>
            {industryOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-56 rounded-xl border border-[#E6E1D7] bg-white p-2 shadow-lg">
                {INDUSTRY_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                      pathname === link.to
                        ? "bg-[#F4F1EA] font-semibold text-[#151515]"
                        : "text-[#6B6560] hover:bg-[#F4F1EA] hover:text-[#151515]"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link to="/blog" className={linkClass(pathname === "/blog")}>
            Journal
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

        <div className="flex items-center gap-2 sm:hidden">
          <a
            href="https://cal.com/curiosityled/bookdemo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-white px-3 py-2 rounded-lg"
            style={{ backgroundColor: "#0202ff" }}
          >
            Demo
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="p-2 text-[#151515]"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="sm:hidden border-t border-[#E6E1D7] bg-[#FBFAF7] px-6 pb-5 pt-2">
          <Link
            to="/"
            className={`block py-2.5 text-[15px] ${
              pathname === "/" ? "font-semibold text-[#151515]" : "text-[#6B6560]"
            }`}
          >
            Product
          </Link>
          <p className="pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#A8A199]">
            Industry
          </p>
          {INDUSTRY_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`block py-2.5 pl-3 text-[15px] ${
                pathname === link.to ? "font-semibold text-[#151515]" : "text-[#6B6560]"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/blog"
            className={`block py-2.5 text-[15px] ${
              pathname === "/blog" ? "font-semibold text-[#151515]" : "text-[#6B6560]"
            }`}
          >
            Journal
          </Link>
        </div>
      )}
    </header>
  );
}