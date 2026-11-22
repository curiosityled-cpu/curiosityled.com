import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle2, Loader2, Lock, Mail } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const SIZE_OPTIONS = [
  "1–50",
  "51–200",
  "201–1,000",
  "1,001–5,000",
  "5,001–10,000",
  "10,000+",
  "Other",
];

const labelClass = "block text-[12px] font-semibold text-[#3D3934] mb-1.5";
const fieldClass = "h-11 rounded-xl border-[#DED8CC] bg-white";

export default function FieldGuideModal({ open, onOpenChange, sourcePage }) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    company_name: "",
    employee_count: "",
    other_count: "",
    consent: false,
  });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const updateField = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const name = form.full_name.trim();
    const email = form.email.trim();
    const company = form.company_name.trim();
    const count =
      form.employee_count === "Other"
        ? form.other_count.trim()
        : form.employee_count.trim();

    if (name.length < 2) return setError("Please enter your full name.");
    if (!EMAIL_RE.test(email)) return setError("Please enter a valid email address.");
    if (company.length < 2) return setError("Please enter your company name.");
    if (!count) return setError("Please tell us roughly how many employees you have.");
    if (!form.consent) return setError("Please tick the consent box so we can email you the guide.");

    setStatus("sending");
    try {
      const response = await base44.functions.invoke("captureFieldGuideLead", {
        full_name: name,
        email,
        company_name: company,
        employee_count: count,
        consent: true,
        source_page: sourcePage || window.location.pathname,
      });
      if (!response?.data?.success) {
        throw new Error(response?.data?.error || "We could not save your details.");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(
        err?.response?.data?.error || err?.message || "Something went wrong. Please try again."
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-[#E6E1D7] bg-white p-6 sm:p-7">
        {status === "success" ? (
          <div>
            <CheckCircle2 className="w-9 h-9 mb-4" style={{ color: "#0202ff" }} />
            <DialogTitle className="font-serif text-[1.45rem] leading-snug text-[#151515]">
              Check your inbox
            </DialogTitle>
            <DialogDescription className="mt-3 text-[14px] leading-relaxed text-[#5B5651]">
              We emailed the field guide to <span className="font-medium text-[#151515]">{form.email}</span>.
              It should arrive in a minute or two — check your spam folder if it does not.
            </DialogDescription>
            <Button
              onClick={() => onOpenChange(false)}
              className="mt-6 w-full h-11 rounded-xl text-[14px] font-semibold"
              style={{ backgroundColor: "#0202ff", color: "#ffffff" }}
            >
              Back to the article
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <p
                className="text-[10.5px] font-bold uppercase tracking-[0.18em]"
                style={{ color: "#0202ff" }}
              >
                Free field guide
              </p>
              <DialogTitle className="mt-2 font-serif text-[1.45rem] leading-tight text-[#151515]">
                Get the Difficult Conversations Field Guide
              </DialogTitle>
              <DialogDescription className="mt-2 text-[13.5px] leading-relaxed text-[#6B6560]">
                Scripts, recovery moves and an escalation checklist. We email you the PDF link.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="guide-name" className={labelClass}>
                  Full name
                </label>
                <Input
                  id="guide-name"
                  value={form.full_name}
                  onChange={updateField("full_name")}
                  placeholder="Alex Morgan"
                  autoComplete="name"
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="guide-email" className={labelClass}>
                  Work email
                </label>
                <Input
                  id="guide-email"
                  type="email"
                  value={form.email}
                  onChange={updateField("email")}
                  placeholder="alex@company.com"
                  autoComplete="email"
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="guide-company" className={labelClass}>
                  Company
                </label>
                <Input
                  id="guide-company"
                  value={form.company_name}
                  onChange={updateField("company_name")}
                  placeholder="Company name"
                  autoComplete="organization"
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="guide-size" className={labelClass}>
                  Number of employees
                </label>
                <select
                  id="guide-size"
                  value={form.employee_count}
                  onChange={updateField("employee_count")}
                  className={`${fieldClass} w-full px-3 text-[14px] text-[#151515] outline-none focus:ring-2 focus:ring-[#0202ff]/25`}
                >
                  <option value="">Select a range</option>
                  {SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {form.employee_count === "Other" && (
                  <Input
                    value={form.other_count}
                    onChange={updateField("other_count")}
                    placeholder="Enter your employee count"
                    inputMode="numeric"
                    className={`${fieldClass} mt-2`}
                  />
                )}
              </div>

              <div className="flex items-start gap-3 pt-1">
                <Checkbox
                  id="guide-consent"
                  checked={form.consent}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, consent: checked === true }))
                  }
                  className="mt-0.5"
                />
                <label
                  htmlFor="guide-consent"
                  className="text-[12px] leading-relaxed text-[#5B5651] cursor-pointer"
                >
                  Email me the guide and occasional leadership insights. I can unsubscribe at any
                  time. See the{" "}
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
                    Sending your guide
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Email me the guide
                  </>
                )}
              </Button>

              <p className="flex items-center justify-center gap-1.5 text-[11.5px] text-[#8A847D]">
                <Lock className="w-3 h-3" />
                Your details stay private. No spam, ever.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}