import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Loader2, X, Lock, Globe, FileText, Video } from "lucide-react";
import {
  VIDEO_ACCEPT,
  DOCUMENT_ACCEPT,
  isVideoFile,
  isDocumentFile,
  formatFileSize,
  resolveResourceFileUrl,
} from "@/lib/resourceFile";

/**
 * File upload control for learning resources.
 * Accepts a video or a document and lets the author choose private (signed URL access)
 * or public (permanent open URL) storage before uploading.
 */
export default function LearningResourceFileUpload({ resourceType, value, onChange }) {
  const [visibility, setVisibility] = useState(value?.visibility || "private");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resolving, setResolving] = useState(false);

  const isVideo = resourceType === "video";
  const accept = isVideo ? VIDEO_ACCEPT : DOCUMENT_ACCEPT;
  const hasFile = !!value?.uri;
  const kind = value?.mediaKind || (isVideo ? "video" : "document");

  useEffect(() => {
    if (!value?.visibility) setVisibility("private");
  }, [value?.visibility]);

  useEffect(() => {
    let cancelled = false;
    if (!value?.uri) {
      setPreviewUrl(null);
      return;
    }
    setResolving(true);
    resolveResourceFileUrl({
      uploaded_file_uri: value.uri,
      storage_visibility: value.visibility,
      media_kind: kind,
      type: resourceType,
    })
      .then((url) => {
        if (!cancelled) setPreviewUrl(url);
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [value?.uri, value?.visibility, kind, resourceType]);

  const handleFile = async (file) => {
    if (!file) return;
    const valid = isVideo ? isVideoFile(file) : isDocumentFile(file);
    if (!valid) {
      toast.error(isVideo ? "Please choose a video file" : "Please choose a document file");
      return;
    }
    setUploading(true);
    try {
      let uri;
      if (visibility === "public") {
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
        uri = file_url;
      } else {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        uri = file_uri;
      }
      onChange({
        uploaded_file_uri: uri,
        uploaded_file_name: file.name,
        uploaded_file_type: file.type || "",
        uploaded_file_size: file.size || 0,
        media_kind: isVideo ? "video" : "document",
        storage_visibility: visibility,
      });
      toast.success("File uploaded");
    } catch (error) {
      console.error("Failed to upload file:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onChange({
      uploaded_file_uri: "",
      uploaded_file_name: "",
      uploaded_file_type: "",
      uploaded_file_size: 0,
      media_kind: "",
    });
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 block">
        {isVideo ? "Upload Video" : "Upload Document"}
      </label>

      {/* Storage choice */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button
            type="button"
            disabled={hasFile}
            onClick={() => setVisibility("private")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all disabled:cursor-not-allowed ${
              visibility === "private" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Private
          </button>
          <button
            type="button"
            disabled={hasFile}
            onClick={() => setVisibility("public")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all disabled:cursor-not-allowed ${
              visibility === "public" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> Public
          </button>
        </div>
        <span className="text-xs text-gray-400">
          {visibility === "private"
            ? "Stored privately. Learners open it through a secure, expiring link."
            : "Permanent public URL anyone with the link can open."}
        </span>
      </div>

      {hasFile ? (
        <div className="border border-gray-200 rounded-lg p-3 space-y-3">
          <div className="flex items-center gap-2">
            {kind === "video" ? (
              <Video className="w-4 h-4 text-gray-400 flex-shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )}
            <span className="text-sm text-gray-700 truncate flex-1">
              {value.name || "Uploaded file"}
            </span>
            {value.size ? (
              <span className="text-xs text-gray-400 flex-shrink-0">{formatFileSize(value.size)}</span>
            ) : null}
            <Badge variant="outline" className="text-[10px] flex-shrink-0">
              {value.visibility === "public" ? "Public" : "Private"}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-red-500 flex-shrink-0"
              onClick={handleRemove}
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {resolving ? (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing preview...
            </div>
          ) : kind === "video" && previewUrl ? (
            <video src={previewUrl} controls className="w-full max-h-64 rounded-lg bg-black" />
          ) : kind === "document" && previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[#0202ff] underline"
            >
              Open file
            </a>
          ) : null}
        </div>
      ) : (
        <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-4 cursor-pointer hover:border-[#0202ff] transition-colors">
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : (
            <Upload className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-sm text-gray-500">
            {uploading
              ? "Uploading..."
              : isVideo
                ? "Click to upload a video (MP4, WebM, MOV)"
                : "Click to upload a document (PDF, Word, PowerPoint, Excel)"}
          </span>
          <input
            type="file"
            className="hidden"
            accept={accept}
            onChange={(e) => handleFile(e.target.files?.[0])}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}