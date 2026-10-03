import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Sparkles, Link2, Loader2, ImageIcon, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const ACTIVE = "bg-[#11111b] text-white border-[#11111b]";
const INACTIVE = "bg-white text-black border-gray-300 hover:bg-gray-50";

/**
 * ThumbnailPicker — reusable thumbnail/cover image selector with three modes:
 *   Upload  — file upload (stored publicly so catalog cards can render it)
 *   AI      — generate from a text prompt
 *   URL     — paste an image URL
 *
 * Props:
 *   value    — current thumbnail URL string
 *   onChange — callback receiving the new URL string
 *   label    — optional label override (default "Thumbnail")
 */
export default function ThumbnailPicker({ value, onChange, label = "Thumbnail" }) {
  const [mode, setMode] = useState("url");
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
      {/* Label */}
      <label className="text-sm font-semibold text-black">{label}</label>

      {/* Preview (when a thumbnail is set) */}
      {value && (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          <img src={value} alt="Thumbnail preview" className="w-full h-32 object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Button group */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`flex-1 h-9 text-sm font-medium border ${mode === "upload" ? ACTIVE : INACTIVE}`}
          onClick={() => setMode("upload")}
        >
          <Upload className="w-4 h-4 mr-1.5" /> Upload
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`flex-1 h-9 text-sm font-medium border ${mode === "ai" ? ACTIVE : INACTIVE}`}
          onClick={() => setMode("ai")}
        >
          <Sparkles className="w-4 h-4 mr-1.5" /> AI
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`flex-1 h-9 text-sm font-medium border ${mode === "url" ? ACTIVE : INACTIVE}`}
          onClick={() => setMode("url")}
        >
          <Link2 className="w-4 h-4 mr-1.5" /> URL
        </Button>
      </div>

      {/* Content area — always visible below buttons */}
      {mode === "upload" && (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg py-6 px-4 cursor-pointer hover:border-[#11111b]/40 hover:bg-gray-50 transition-colors">
          {busy ? (
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          ) : (
            <>
              <ImageIcon className="w-7 h-7 text-gray-300 mb-1.5" />
              <span className="text-sm text-gray-500">Click to choose an image</span>
              <span className="text-xs text-gray-400 mt-0.5">PNG, JPG, WebP</span>
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

      {mode === "ai" && (
        <div className="space-y-2">
          <Input
            placeholder="Describe the image (e.g. mountain sunrise, abstract leadership)"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="h-9 text-sm"
            disabled={busy}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleGenerate(); } }}
          />
          <Button
            type="button"
            size="sm"
            className="w-full h-9 text-sm bg-[#11111b] hover:bg-[#11111b]/90 text-white"
            onClick={handleGenerate}
            disabled={busy}
          >
            {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
            {busy ? "Generating…" : "Generate Image"}
          </Button>
        </div>
      )}

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