import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Trophy, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { formatDate } from "@/lib/learning";

/** Earned certificates, kept small so the learning path stays the focus. */
export default function AchievementsStrip() {
  const { user } = useAuth();
  const email = user?.email || user?.data?.email;
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!email) {
      setLoading(false);
      return undefined;
    }
    base44.entities.LearningCertificate
      .filter({ user_email: email }, "-issued_date", 3)
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

  if (loading || certificates.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-semibold text-foreground">Achievements</h2>
        </div>
        <Link
          to="/Achievements"
          className="inline-flex items-center gap-1 text-xs font-medium text-[#0202ff] hover:underline"
        >
          All achievements <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {certificates.map((cert) => (
          <div
            key={cert.id}
            className="flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50/60 p-3"
          >
            <Award className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">{cert.title}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {cert.status === "revoked" ? "Revoked" : formatDate(cert.issued_date)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}