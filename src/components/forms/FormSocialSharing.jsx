import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Mail, MessageCircle, Linkedin, Facebook, Twitter } from "lucide-react";
import { toast } from "sonner";

export default function FormSocialSharing({ form, publicUrl }) {
  const shareMessage = `Check out this form: ${form.title}`;

  const shareViaEmail = () => {
    const subject = encodeURIComponent(form.title);
    const body = encodeURIComponent(`${form.description || ''}\n\n${publicUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const shareViaLinkedIn = () => {
    const url = encodeURIComponent(publicUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  const shareViaFacebook = () => {
    const url = encodeURIComponent(publicUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const shareViaTwitter = () => {
    const text = encodeURIComponent(shareMessage);
    const url = encodeURIComponent(publicUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`${shareMessage}\n${publicUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareViaNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: form.title,
          text: shareMessage,
          url: publicUrl
        });
        toast.success("Shared successfully");
      } catch (error) {
        if (error.name !== 'AbortError') {
          toast.error("Sharing failed");
        }
      }
    } else {
      toast.error("Sharing not supported on this device");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          Social Sharing
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Share your form across social platforms
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!publicUrl ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Enable public access first to share this form
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={shareViaEmail}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Email
              </Button>

              <Button
                onClick={shareViaLinkedIn}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Linkedin className="w-4 h-4" />
                LinkedIn
              </Button>

              <Button
                onClick={shareViaFacebook}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Facebook className="w-4 h-4" />
                Facebook
              </Button>

              <Button
                onClick={shareViaTwitter}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Twitter className="w-4 h-4" />
                Twitter
              </Button>

              <Button
                onClick={shareViaWhatsApp}
                variant="outline"
                className="flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>

              <Button
                onClick={shareViaNative}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                More...
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}