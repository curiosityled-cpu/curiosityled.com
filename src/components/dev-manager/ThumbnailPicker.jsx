import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Upload, Sparkles, Link2, Loader2, ImageIcon, X
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * ThumbnailPicker — lets the user set a course thumbnail via:
 *   1. File upload (stored publicly so the catalog can render it)
 *   2. AI generation from a text prompt
 *   3. Pasting a URL
 *
 * Props:
 *   value    — current thumbnail URL string
 *   onChange — callback receiving the new URL string
 */
export default function ThumbnailPicker({ value, onChange }) {
  const [mode, setMode] = useState(value ? "preview" : "url"); // "preview" | "url" | "upload" | "ai"
  const [busy, setBusy] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setBusy(true);
    try {
      const res = await base44.integrations.Core.UploadPublicFile({ file });
      onChange(res.file_url);
      setMode("preview");
      toast.success("Thumbnail uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload thumbnail");
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Describe the image you want to generate");
      return;
    }
    setBusy(true);
    try {
      const res = await base44.integrations.Core.GenerateImage({
        prompt: `Course thumbnail image. ${aiPrompt}. Clean, professional, wide landscape composition suitable for a course card.`,
      });
      onChange(res.url);
      setMode("preview");
      toast.success("Thumbnail generated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate thumbnail");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Thumbnail</Label>

      {/* Preview */}
      {value && mode === "preview" && (
        <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          <img src={value} alt="Thumbnail preview" className="w-full h-32 object-cover" />
          <button
            type="button"
            onClick={() => { onChange(""); setMode("url"); }}
            className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mode tabs */}
      {(!value || mode !== "preview") && (
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant={mode === "upload" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs flex-1"
            onClick={() => setMode("upload")}
          >
            <Upload className="w-3.5 h-3.5 mr-1" /> Upload
          </Button>
          <Button
            type="button"
            variant={mode === "ai" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs flex-1"
            onClick={() => setMode("ai")}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" /> AI
          </Button>
          <Button
            type="button"
            variant={mode === "url" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs flex-1"
            onClick={() => setMode("url")}
          >
            <Link2 className="w-3.5 h-3.5 mr-1" /> URL
          </Button>
        </div>
      )}

      {/* Upload mode */}
      {mode === "upload" && (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg py-6 px-4 cursor-pointer hover:border-[#0202ff]/40 hover:bg-gray-50 transition-colors">
          {busy ? (
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          ) : (
            <>
              <ImageIcon className="w-7 h-7 text-gray-300 mb-1.5" />
              <span className="text-xs text-gray-500">Click to choose an image</span>
              <span className="text-[10px] text-gray-400 mt-0.5">PNG, JPG, WebP</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      )}

      {/* AI mode */}
      {mode === "ai" && (
        <div className="space-y-2">
          <Input
            placeholder="Describe the image (e.g. mountain sunrise, abstract leadership, team collaboration)"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="h-9 text-sm"
            disabled={busy}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleGenerate(); } }}
          />
          <Button
            type="button"
            size="sm"
            className="w-full h-8 text-xs bg-[#0202ff] hover:bg-[#0101dd] text-white"
            onClick={handleGenerate}
            disabled={busy}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
            {busy ? "Generating…" : "Generate Image"}
          </Button>
        </div>
      )}

      {/* URL mode */}
      {mode === "url" && (
        <Input
          placeholder="https://..."
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 text-sm"
        />
      )}
    </div>
  );
}