import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function LogoUploader({ logoUrl, faviconUrl, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(logoUrl);
  const [faviconPreview, setFaviconPreview] = useState(faviconUrl);

  React.useEffect(() => { setLogoPreview(logoUrl); }, [logoUrl]);
  React.useEffect(() => { setFaviconPreview(faviconUrl); }, [faviconUrl]);

  const handleUpload = async (file, type) => {
    if (!file) return;

    const maxSize = type === 'logo' ? 2 * 1024 * 1024 : 500 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Max size: ${type === 'logo' ? '2MB' : '500KB'}`);
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      if (type === 'logo') {
        setLogoPreview(file_url);
        onChange('logo_url', file_url);
      } else {
        setFaviconPreview(file_url);
        onChange('favicon_url', file_url);
      }
      
      toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>Platform Logo</Label>
        <p className="text-sm text-gray-500 mb-2">
          Recommended: 200x60px, PNG or SVG, max 2MB
        </p>
        
        {logoPreview && (
          <div className="mb-3 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
            <img src={logoPreview} alt="Logo Preview" className="h-12 max-w-[200px] object-contain" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLogoPreview(null);
                onChange('logo_url', '');
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <Input
          type="file"
          accept=".png,.jpg,.jpeg,.svg"
          onChange={(e) => handleUpload(e.target.files[0], 'logo')}
          disabled={uploading}
        />
      </div>

      <div>
        <Label>Favicon</Label>
        <p className="text-sm text-gray-500 mb-2">
          Recommended: 32x32px or 64x64px, .ico or .png, max 500KB
        </p>
        
        {faviconPreview && (
          <div className="mb-3 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
            <img src={faviconPreview} alt="Favicon Preview" className="h-8 w-8 object-contain" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFaviconPreview(null);
                onChange('favicon_url', '');
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <Input
          type="file"
          accept=".ico,.png"
          onChange={(e) => handleUpload(e.target.files[0], 'favicon')}
          disabled={uploading}
        />
      </div>
    </div>
  );
}