import React from "react";
import { Award, ExternalLink, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/learning";

/** Shown inside the player once the learner completes a course. */
export default function CourseCelebration({ course, certificate, issuing, onBack }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-white border border-emerald-100 flex items-center justify-center mb-3">
        <Award className="w-7 h-7 text-emerald-600" />
      </div>
      <h3 className="text-xl font-semibold text-foreground">Course complete</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        You finished every lesson in {course?.title}. Nice work.
      </p>

      {issuing && <p className="mt-4 text-sm text-muted-foreground">Preparing your certificate…</p>}

      {certificate && (
        <div className="mt-5 mx-auto max-w-md rounded-xl border border-border bg-card p-4 text-left shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{certificate.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Issued {formatDate(certificate.issued_date)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground break-all">
                Verification code: {certificate.verification_code}
              </p>
            </div>
          </div>
        </div>
      )}

      {!certificate && !issuing && (
        <p className="mt-4 text-xs text-muted-foreground">
          Your completion is recorded. The certificate could not be issued automatically.
        </p>
      )}

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Back to my development
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}