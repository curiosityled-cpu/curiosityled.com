import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Loader2, Search, ShieldAlert, ShieldCheck } from "lucide-react";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "—";

/**
 * Public certificate verification. Reached from a certificate's verification link,
 * so it must work for someone who has never signed in, and must answer only what the
 * certificate itself already says.
 */
export default function VerifyCertificate() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | found | not_found | error
  const [result, setResult] = useState(null);

  useEffect(() => {
    document.title = "Verify a certificate · Curiosity Led";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => document.head.removeChild(meta);
  }, []);

  const verify = async (value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return;
    setStatus("loading");
    setResult(null);
    try {
      const response = await base44.functions.invoke("verifyLearningCertificate", { code: trimmed });
      const data = response?.data || {};
      if (data.error) {
        setStatus("error");
        return;
      }
      setResult(data);
      setStatus(data.found ? "found" : "not_found");
    } catch (error) {
      console.error("Verification failed", error);
      setStatus("error");
    }
  };

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("code");
    if (initial) {
      setCode(initial);
      verify(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const valid = result?.status !== "revoked";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-2.5">
          <Award className="w-5 h-5 text-[#0202ff]" />
          <span className="text-sm font-semibold tracking-tight text-gray-900">Curiosity Led</span>
          <span className="text-xs text-gray-400">Certificate verification</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-5 py-10 space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Verify a certificate</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter the verification code printed on the certificate. The code is the same one shown on the
            learner's certificate and in their transcript.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <form
            className="flex flex-col sm:flex-row gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              verify(code);
            }}
          >
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="e.g. 3f6a1c0e-4b2d-4f88-9a11-2c7c9d1e5b40"
              className="h-10 font-mono text-xs flex-1"
              autoFocus
            />
            <Button
              type="submit"
              disabled={status === "loading" || !code.trim()}
              className="h-10 bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5"
            >
              {status === "loading" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Verify
            </Button>
          </form>
        </div>

        {status === "loading" && (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" />
          </div>
        )}

        {status === "not_found" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">No certificate matches that code</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">
                Check the code character by character. Certificates issued by another workspace will not
                verify here.
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">Verification could not be completed</p>
              <p className="mt-1 text-xs leading-relaxed text-red-800">Please try again in a moment.</p>
            </div>
          </div>
        )}

        {status === "found" && result && (
          <div
            className={`rounded-2xl border p-5 ${
              valid ? "border-emerald-200 bg-white" : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {valid ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                )}
                <p className={`text-sm font-semibold ${valid ? "text-emerald-900" : "text-red-900"}`}>
                  {valid ? "This certificate is valid" : "This certificate has been revoked"}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                {valid ? "Valid" : "Revoked"}
              </Badge>
            </div>

            <dl className="mt-4 space-y-2.5">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Awarded to</dt>
                <dd className="text-sm font-medium text-gray-900">{result.learner_name || "Name not recorded"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Certificate</dt>
                <dd className="text-sm text-gray-900">{result.title}</dd>
              </div>
              {result.course_title && (
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Course</dt>
                  <dd className="text-sm text-gray-700">{result.course_title}</dd>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Issued</dt>
                  <dd className="text-sm text-gray-700">{formatDate(result.issued_date)}</dd>
                </div>
                {!valid && result.revoked_at && (
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Revoked</dt>
                    <dd className="text-sm text-red-700">{formatDate(result.revoked_at)}</dd>
                  </div>
                )}
              </div>
            </dl>

            <p className="mt-4 pt-3 border-t border-gray-100 font-mono text-[10px] text-gray-400 break-all">
              {result.verification_code}
            </p>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-gray-400">
          Verification confirms the certificate was issued by this workspace and has not been withdrawn. It
          does not display the learner's email address or any other personal data.
        </p>
      </main>
    </div>
  );
}