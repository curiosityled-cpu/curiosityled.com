import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Download, Loader2, Lock } from "lucide-react";
import { startWorkbookDownload } from "@/lib/workbook";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function WorkbookForm() {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", consent: false });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const updateField = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleConsent = (checked) => {
    setForm((prev) => ({ ...prev, consent: checked === true }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const name = form.full_name.trim();
    const email = form.email.trim();
    const phoneDigits = form.phone.replace(/[^\d]/g, "");

    if (name.length < 2) return setError("Please enter your full name.");
    if (!EMAIL_RE.test(email)) return setError("Please enter a valid email address.");
    if (phoneDigits.length < 10 || phoneDigits.length > 15) return setError("Please enter a valid phone number.");
    if (!form.consent) return setError("Please tick the consent box so we can send you the workbook.");

    setStatus("sending");
    try {
      const response = await base44.functions.invoke("captureWorkbookLead", {
        full_name: name,
        email,
        phone: form.phone.trim(),
        consent: true,
        source_page: window.location.pathname,
      });
      if (!response?.data?.success) throw new Error(response?.data?.error || "We could not save your details.");
      setEmailSent(Boolean(response.data.email_sent));
      setStatus("success");
      startWorkbookDownload();
    } catch (err) {
      setStatus("error");
      setError(err?.response?.data?.error || err?.message || "Something went wrong. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div id="workbook-form" className="rounded-2xl border border-[#E6E1D7] bg-white p-7 scroll-mt-24">
        <CheckCircle2 className="w-9 h-9 mb-4" style={{ color: "#0202ff" }} />
        <h2 className="font-serif text-[1.4rem] leading-snug text-[#151515]">Your workbook is downloading</h2>
        <p className="mt-3 text-[14px] leading-relaxed text-[#5B5651]">
          If the download did not start automatically, use the button below.
        </p>
        <Button
          onClick={startWorkbookDownload}
          className="mt-5 w-full h-11 rounded-xl text-[14px] font-semibold"
          style={{ backgroundColor: "#0202ff", color: "#ffffff" }}
        >
          <Download className="w-4 h-4 mr-2" />
          Download the PDF
        </Button>
        <p className="mt-4 text-[12.5px] leading-relaxed text-[#7A746E]">
          {emailSent
            ? "We also emailed a copy with the download link to " + form.email + "."
            : "Keep this page handy — you can download the workbook again at any time."}
        </p>
      </div>
    );
  }

  return (
    <div id="workbook-form" className="rounded-2xl border border-[#E6E1D7] bg-white p-7 scroll-mt-24">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: "#0202ff" }}>
        Free workbook
      </p>
      <h2 className="font-serif text-[1.55rem] leading-tight tracking-[-0.01em] text-[#151515]">
        Get the fill-in-the-blank template
      </h2>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-[#6B6560]">
        Seven sections per critical role, with a completed worked example you can copy and defend.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="lead-name" className="block text-[12px] font-semibold text-[#3D3934] mb-1.5">
            Full name
          </label>
          <Input
            id="lead-name"
            value={form.full_name}
            onChange={updateField("full_name")}
            placeholder="Alex Morgan"
            autoComplete="name"
            className="h-11 rounded-xl border-[#DED8CC] bg-white"
          />
        </div>
        <div>
          <label htmlFor="lead-email" className="block text-[12px] font-semibold text-[#3D3934] mb-1.5">
            Work email
          </label>
          <Input
            id="lead-email"
            type="email"
            value={form.email}
            onChange={updateField("email")}
            placeholder="alex@company.com"
            autoComplete="email"
            className="h-11 rounded-xl border-[#DED8CC] bg-white"
          />
        </div>
        <div>
          <label htmlFor="lead-phone" className="block text-[12px] font-semibold text-[#3D3934] mb-1.5">
            Phone
          </label>
          <Input
            id="lead-phone"
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={updateField("phone")}
            placeholder="(555) 015-2288"
            autoComplete="tel"
            className="h-11 rounded-xl border-[#DED8CC] bg-white"
          />
        </div>

        <div className="flex items-start gap-3 pt-1">
          <Checkbox id="lead-consent" checked={form.consent} onCheckedChange={toggleConsent} className="mt-0.5" />
          <label htmlFor="lead-consent" className="text-[12px] leading-relaxed text-[#5B5651] cursor-pointer">
            I agree to receive the workbook and occasional leadership insights from Curiosity Led. I can unsubscribe at
            any time. See the{" "}
            <Link to="/PrivacyPolicy" className="underline underline-offset-2 hover:text-[#151515]">
              privacy policy
            </Link>
            .
          </label>
        </div>

        {error && (
          <p className="text-[12.5px] text-red-600 leading-relaxed" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={status === "sending"}
          className="w-full h-11 rounded-xl text-[14px] font-semibold"
          style={{ backgroundColor: "#0202ff", color: "#ffffff" }}
        >
          {status === "sending" ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Preparing your workbook
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download the workbook
            </>
          )}
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-[11.5px] text-[#8A847D]">
          <Lock className="w-3 h-3" />
          Your details stay private. No spam, ever.
        </p>
      </form>
    </div>
  );
}