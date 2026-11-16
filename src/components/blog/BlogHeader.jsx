import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import BrandLogo from "@/components/landing/BrandLogo";

const LINKS = [
  { to: "/", label: "Product" },
  { to: "/blog", label: "Journal" },
  { to: "/healthcare", label: "Healthcare" },
  { to: "/bpo", label: "BPO & Operations" },
  { to: "/coaching", label: "Coaching" },
];

export default function BlogHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

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
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm transition-colors hover:text-[#151515] ${
                pathname === link.to ? "font-semibold text-[#151515]" : "text-[#6B6560]"
              }`}
            >
              {link.label}
            </Link>
          ))}
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
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`block py-2.5 text-[15px] ${
                pathname === link.to ? "font-semibold text-[#151515]" : "text-[#6B6560]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}