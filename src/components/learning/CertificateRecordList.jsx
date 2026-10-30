import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award, BadgeCheck, Download, Loader2, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { downloadCertificate } from "@/components/learning/certificate/downloadCertificate";

const ADMIN_ROLES = [
  "Admin Level 1",
  "Admin Level 2",
  "Super Administrator",
  "Partner Business Administrator",
  "Platform Admin",
];

/**
 * The certificates on one learner's record. A certificate can be withdrawn, and a
 * withdrawal is a reasoned, timestamped act — the certificate itself stays on record.
 */
export default function CertificateRecordList({ certificates, onChanged }) {
  const { user } = useAuth();
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const role = user?.app_role || user?.data?.app_role || user?.role;
  const canRevoke = ADMIN_ROLES.includes(role);

  // A staff member can retrieve a copy on the learner's behalf.
  const download = async (certificate) => {
    setDownloadingId(certificate.id);
    try {
      const learnerName =
        certificate.metadata?.learner_name || certificate.user_email || "Learner";
      await downloadCertificate(certificate, learnerName);
    } catch (error) {
      console.error("Certificate download failed:", error);
      toast.error("Could not download the certificate. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const revoke = async () => {
    if (!reason.trim()) {
      toast.error("A reason is required");
      return;
    }
    setSaving(true);
    try {
      await base44.functions.invoke("learningRecordCommand", {
        action: "revoke_certificate",
        course_id: target.metadata?.course_id,
        certificate_id: target.id,
        reason: reason.trim(),
      });
      toast.success("Certificate revoked");
      setTarget(null);
      setReason("");
      onChanged?.();
    } catch (error) {
      toast.error(error.message || "The certificate could not be revoked");
    } finally {
      setSaving(false);
    }
  };

  if (!certificates?.length) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Certificates</p>

      {certificates.map((certificate) => {
        const revoked = certificate.status === "revoked";
        return (
          <div
            key={certificate.id}
            className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 ${
              revoked ? "border-red-100 bg-red-50/60" : "border-gray-100"
            }`}
          >
            {revoked ? (
              <ShieldX className="w-4 h-4 text-red-500 flex-shrink-0" />
            ) : (
              <Award className="w-4 h-4 text-amber-500 flex-shrink-0" />
            )}
            <span className="text-xs font-medium text-gray-900">{certificate.title}</span>
            <span className="text-[11px] text-gray-400">
              issued {format(new Date(certificate.issued_date), "MMM d, yyyy")}
            </span>
            {revoked ? (
              <span className="text-[11px] text-red-700">
                · revoked {certificate.revoked_at ? format(new Date(certificate.revoked_at), "MMM d, yyyy") : ""}
                {certificate.revocation_reason ? ` — ${certificate.revocation_reason}` : ""}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                <BadgeCheck className="w-3 h-3" /> valid
              </span>
            )}
            <div className="ml-auto flex items-center gap-1">
              {!revoked && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] text-gray-600"
                  disabled={downloadingId === certificate.id}
                  onClick={() => download(certificate)}
                >
                  {downloadingId === certificate.id ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 mr-1" />
                  )}
                  Download
                </Button>
              )}
              {!revoked && canRevoke && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] text-gray-600"
                  onClick={() => {
                    setTarget(certificate);
                    setReason("");
                  }}
                >
                  Revoke
                </Button>
              )}
            </div>
          </div>
        );
      })}

      <Dialog open={Boolean(target)} onOpenChange={(open) => { if (!open) setTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Revoke certificate</DialogTitle>
            <DialogDescription className="text-xs">
              Verification will report this certificate as revoked. It stays on the learner's record with
              your reason and the date.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-xl border border-gray-100 px-3 py-2">
              <p className="text-xs font-medium text-gray-900">{target?.title}</p>
              <p className="font-mono text-[10px] text-gray-400">{target?.verification_code}</p>
            </div>
            <div>
              <Label className="text-xs">Reason</Label>
              <Input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Issued in error"
                className="mt-1 h-9 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setTarget(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" onClick={revoke} disabled={saving}>
                {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Revoke
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}