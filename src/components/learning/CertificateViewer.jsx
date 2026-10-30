import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Download, Share2, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { downloadCertificate } from "@/components/learning/certificate/downloadCertificate";

export default function CertificateViewer() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  const email = user?.email || user?.data?.email;

  useEffect(() => {
    loadCertificates();
  }, [email]);

  const loadCertificates = async () => {
    if (!email) return;

    try {
      const certs = await base44.entities.LearningCertificate.filter({
        user_email: email
      }, "-issued_date");

      setCertificates(Array.isArray(certs) ? certs : certs?.items || []);
    } catch (error) {
      console.error("Error loading certificates:", error);
    } finally {
      setLoading(false);
    }
  };

  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownload = async (cert) => {
    if (cert.status === "revoked") {
      toast.error("A revoked certificate cannot be downloaded.");
      return;
    }
    setDownloadingId(cert.id);
    try {
      const learnerName = cert.metadata?.learner_name || user?.full_name || user?.data?.full_name || email;
      await downloadCertificate(cert, learnerName);
    } catch (error) {
      console.error("Certificate download failed:", error);
      toast.error("Could not download the certificate. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const verifyUrl = (cert) =>
    `${window.location.origin}/verify-certificate?code=${encodeURIComponent(cert.verification_code || "")}`;

  const handleShare = (cert) => {
    navigator.clipboard.writeText(
      `I earned a certificate in ${cert.title}. Verify it here: ${verifyUrl(cert)}`
    );
    toast.success("Certificate verification link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-12 text-center">
          <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            No Certificates Yet
          </h3>
          <p className="text-gray-600">
            Complete learning programs and modules to earn certificates
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end mb-4">
        <Badge variant="outline">{certificates.length} Earned</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {certificates.map((cert, index) => (
          <motion.div
            key={cert.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-amber-50 to-yellow-50 border-l-4 border-l-amber-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Award className="w-12 h-12 text-amber-600" />
                  {cert.status === "revoked" ? (
                    <Badge className="bg-red-600 text-white">revoked</Badge>
                  ) : (
                    <Badge className="bg-amber-600 text-white">
                      {(cert.certificate_type || "certificate").replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg mt-3">{cert.title}</CardTitle>
                <p className="text-sm text-gray-600">{cert.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Issued:</span>
                    <span className="font-medium">
                      {new Date(cert.issued_date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {cert.final_score && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Score:</span>
                      <span className="font-medium">{cert.final_score}%</span>
                    </div>
                  )}

                  {cert.competencies_demonstrated?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Competencies:</p>
                      <div className="flex flex-wrap gap-1">
                        {cert.competencies_demonstrated.map(comp => (
                          <Badge key={comp} variant="outline" className="text-xs">
                            {comp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleDownload(cert)}
                      disabled={downloadingId === cert.id || cert.status === "revoked"}
                      className="flex-1"
                      title={
                        cert.status === "revoked"
                          ? "A revoked certificate cannot be downloaded"
                          : "Download certificate"
                      }
                    >
                      <Download className="w-4 h-4 mr-1" />
                      {cert.status === "revoked"
                        ? "Revoked"
                        : downloadingId === cert.id
                        ? "Preparing..."
                        : "Download"}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleShare(cert)}
                      title="Copy verification link"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(verifyUrl(cert), "_blank")}
                      title="Open verification page"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500 text-center mt-2">
                    Code: {cert.verification_code}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}