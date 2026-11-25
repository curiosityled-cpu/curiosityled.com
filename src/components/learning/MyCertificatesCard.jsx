import React, { useEffect, useState } from "react";
import { Award, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { downloadCertificate } from "@/components/learning/certificate/downloadCertificate";

/** The learner's certificates, kept as one compact card beside their badges. */
export default function MyCertificatesCard() {
  const { user } = useAuth();
  const email = user?.email || user?.data?.email;
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!email) {
      setLoading(false);
      return undefined;
    }
    base44.entities.LearningCertificate
      .filter({ user_email: email }, "-issued_date")
      .then((rows) => {
        if (!cancelled) setCertificates(Array.isArray(rows) ? rows : rows?.items || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [email]);

  const handleDownload = async (cert) => {
    if (cert.status === "revoked") {
      toast.error("A revoked certificate cannot be downloaded.");
      return;
    }
    setDownloadingId(cert.id);
    try {
      const learnerName = cert.metadata?.learner_name || user?.full_name || email;
      await downloadCertificate(cert, learnerName);
    } catch {
      toast.error("Could not download the certificate. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section className="flex flex-col rounded-[14px] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-4 shadow-[0_4px_12px_rgba(23,40,50,0.06)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
            <Award className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-sm font-bold text-[var(--pf-text)]">Certificates</h3>
        </div>
        <span className="text-[11px] font-semibold text-[var(--pf-muted)]">
          {certificates.length} earned
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--pf-accent)]" />
        </div>
      ) : certificates.length === 0 ? (
        <p className="py-4 text-[12px] leading-[1.5] text-[var(--pf-muted)]">
          No certificates yet. Complete a program, journey or assessment to earn one.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {certificates.map((cert) => (
            <li
              key={cert.id}
              className="flex items-start gap-2.5 rounded-xl border border-[var(--pf-soft-border)] bg-[var(--pf-soft)] px-3 py-2.5"
            >
              <Award className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-300" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-bold text-[var(--pf-text)]">
                  {cert.title}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--pf-muted)]">
                  {cert.status === "revoked"
                    ? "Revoked"
                    : new Date(cert.issued_date).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDownload(cert)}
                disabled={downloadingId === cert.id || cert.status === "revoked"}
                title={cert.status === "revoked" ? "Revoked" : "Download certificate"}
                className="mt-0.5 rounded-md p-1 text-[var(--pf-muted)] transition-colors hover:text-[var(--pf-text)] disabled:opacity-40"
              >
                {downloadingId === cert.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}