import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import BrandLogo from "@/components/landing/BrandLogo";

const INDUSTRY_LINKS = [
  { to: "/healthcare", label: "Healthcare" },
  { to: "/bpo", label: "BPO & Operations" },
  { to: "/coaching", label: "Coaching" },
];

const NAV_LINKS = [
  { to: "/#outcomes", label: "Outcomes", anchor: "outcomes" },
  { to: "/pricing", label: "Pricing" },
  { to: "/compare", label: "Why us" },
];

export default function LandingNav({ hideCtas = false }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [industryOpen, setIndustryOpen] = useState(false);
  const industryRef = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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

  const handleLogin = () => {
    base44.auth.redirectToLogin("/");
  };

  const handleAnchor = (e, id) => {
    e.preventDefault();
    setOpen(false);
    setIndustryOpen(false);
    if (pathname !== "/") {
      navigate("/");
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 300);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
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
              onClick={link.anchor ? (e) => handleAnchor(e, link.anchor) : undefined}
              className={`text-sm transition-colors hover:text-gray-900 ${
                pathname === link.to ? "font-semibold text-gray-900" : "font-medium text-gray-600"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="relative" ref={industryRef}>
            <button
              onClick={() => setIndustryOpen((v) => !v)}
              aria-expanded={industryOpen}
              aria-haspopup="true"
              className={`flex items-center gap-1 text-sm transition-colors hover:text-gray-900 ${
                industryActive || industryOpen ? "font-semibold text-gray-900" : "font-medium text-gray-600"
              }`}
            >
              Industry
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${industryOpen ? "rotate-180" : ""}`}
              />
            </button>
            {industryOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-56 rounded-xl border border-gray-100 bg-white p-2 shadow-lg">
                {INDUSTRY_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                      pathname === link.to
                        ? "bg-gray-50 font-semibold text-gray-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/blog"
            className={`text-sm transition-colors hover:text-gray-900 ${
              pathname === "/blog" ? "font-semibold text-gray-900" : "font-medium text-gray-600"
            }`}
          >
            Journal
          </Link>
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
                onClick={link.anchor ? (e) => handleAnchor(e, link.anchor) : undefined}
                className={`py-2.5 text-[15px] ${
                  pathname === link.to ? "font-semibold text-gray-900" : "font-medium text-gray-600"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <p className="pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Industry
            </p>
            {INDUSTRY_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`py-2.5 pl-3 text-[15px] ${
                  pathname === link.to ? "font-semibold text-gray-900" : "font-medium text-gray-600"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <Link
              to="/blog"
              className={`py-2.5 text-[15px] ${
                pathname === "/blog" ? "font-semibold text-gray-900" : "font-medium text-gray-600"
              }`}
            >
              Journal
            </Link>
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