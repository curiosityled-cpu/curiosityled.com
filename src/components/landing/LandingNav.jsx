import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import BrandLogo from "@/components/landing/BrandLogo";

const NAV_LINKS = [
  { to: "/", label: "Product" },
  { to: "/compare", label: "Why us" },
  { to: "/healthcare", label: "Healthcare" },
  { to: "/bpo", label: "BPO & Operations" },
  { to: "/coaching", label: "Coaching" },
  { to: "/blog", label: "Journal" },
];

export default function LandingNav({ hideCtas = false }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const handleLogin = () => {
    base44.auth.redirectToLogin("/");
  };

  const goToFaq = () => {
    setOpen(false);
    const el = document.getElementById("faq");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      return;
    }
    navigate("/");
    setTimeout(() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" }), 250);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || open ? "bg-white border-b border-gray-100 shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
          <BrandLogo />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm transition-colors hover:text-gray-900 ${
                pathname === link.to ? "font-semibold text-gray-900" : "font-medium text-gray-600"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={goToFaq}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            FAQ
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!hideCtas && (
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={handleLogin}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2"
              >
                Log in
              </button>
              <a
                href="https://cal.com/curiosityled/bookdemo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all hover:opacity-90"
                style={{ backgroundColor: "#0202ff" }}
              >
                Book a demo
              </a>
            </div>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="md:hidden p-2 text-gray-700"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu — every link stays reachable on small screens */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-6 pb-5 pt-2">
          <div className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`py-2.5 text-[15px] ${
                  pathname === link.to ? "font-semibold text-gray-900" : "font-medium text-gray-600"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <button onClick={goToFaq} className="py-2.5 text-left text-[15px] font-medium text-gray-600">
              FAQ
            </button>
            {!hideCtas && (
              <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
                <button
                  onClick={handleLogin}
                  className="py-2 text-left text-[15px] font-medium text-gray-600"
                >
                  Log in
                </button>
                <a
                  href="https://cal.com/curiosityled/bookdemo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-white"
                  style={{ backgroundColor: "#0202ff" }}
                >
                  Book a demo
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}