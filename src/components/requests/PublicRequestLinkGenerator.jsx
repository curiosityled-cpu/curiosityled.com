import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Link as LinkIcon, QrCode, Copy, ExternalLink, Loader2, AlertCircle } from "lucide-react";

export default function PublicRequestLinkGenerator({ clientId, isAdmin }) {
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [customMessage, setCustomMessage] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(365);

  // Use fallback "Curiosity Led" client ID for admins testing without a client_id
  const effectiveClientId = clientId || (isAdmin ? "curiosity_led_testing" : null);

  const generateLink = async () => {
    if (!effectiveClientId) {
      toast.error('Missing client ID. Please make sure you are logged in.');
      return;
    }

    setGenerating(true);
    try {
      console.log('Generating link for client:', effectiveClientId);
      const { data } = await base44.functions.invoke('generatePublicRequestLink', {
        client_id: effectiveClientId,
        custom_message: customMessage || undefined,
        expires_in_days: expiresInDays
      });

      console.log('Link generated successfully:', data);
      setGeneratedLink(data);
      toast.success('Public submission link generated!');
    } catch (error) {
      console.error('Error generating link:', error);
      toast.error(`Failed to generate link: ${error.message || 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const downloadQRCode = () => {
    if (!generatedLink) return;

    // Generate QR code using a library or API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(generatedLink.public_url)}`;
    
    // Download the QR code
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = 'request-submission-qr.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('QR code downloaded');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="w-5 h-5" />
          Generate Public Request Submission Link
        </CardTitle>
        <p className="text-sm text-gray-600">
          Create a shareable link for unauthenticated users to submit requests
        </p>
        {!clientId && isAdmin && (
          <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Testing Mode:</strong> Using default "Curiosity Led" client ID for testing purposes
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="custom_message">Custom Message (Optional)</Label>
          <Textarea
            id="custom_message"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Add a custom message that will appear on the submission form..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="expires_in">Link Expiration (Days)</Label>
          <Input
            id="expires_in"
            type="number"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
            min={1}
            max={730}
          />
          <p className="text-xs text-gray-500 mt-1">
            Default: 365 days. Maximum: 730 days (2 years)
          </p>
        </div>

        <Button
          onClick={generateLink}
          disabled={generating}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <LinkIcon className="w-4 h-4 mr-2" />
              Generate Link
            </>
          )}
        </Button>

        {generatedLink && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label className="text-sm font-semibold mb-2 block">Generated Link</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedLink.public_url}
                  readOnly
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(generatedLink.public_url)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(generatedLink.public_url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Expires: {new Date(generatedLink.expires_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={downloadQRCode}
              >
                <QrCode className="w-4 h-4 mr-2" />
                Download QR Code
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2">Share Instructions</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Share this link in emails, presentations, or documents</li>
                <li>• Display the QR code on slides or posters</li>
                <li>• Recipients can submit requests without logging in</li>
                <li>• All submissions will be tagged to your organization</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}