import { base44 } from "@/api/base44Client";

export const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,video/x-m4v,video/ogg,video/*";
export const DOCUMENT_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.md,.rtf,.odt,.ods,.odp";

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv|avi|mkv)\b/i;
const DOC_EXT = /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|csv|md|rtf|odt|ods|odp)\b/i;

export function isVideoFile(file) {
  if (!file) return false;
  return file.type?.startsWith("video/") || VIDEO_EXT.test(file.name || "");
}

export function isDocumentFile(file) {
  if (!file || isVideoFile(file)) return false;
  if (DOC_EXT.test(file.name || "")) return true;
  // MIME-only fallback for files without a recognizable extension
  return !!(
    file.type &&
    !file.type.startsWith("video/") &&
    !file.type.startsWith("image/") &&
    !file.type.startsWith("audio/")
  );
}

export function formatFileSize(bytes) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[unit]}`;
}

/** The file attached to a resource, if any (falls back to the legacy document_url field). */
export function getResourceFileUri(resource) {
  return resource?.uploaded_file_uri || resource?.document_url || null;
}

/** Whether the attached file is a video (played inline) or a document. */
export function getResourceMediaKind(resource) {
  if (!resource) return null;
  if (resource.media_kind) return resource.media_kind;
  const uri = getResourceFileUri(resource);
  if (!uri) return null;
  if (VIDEO_EXT.test(uri)) return "video";
  if (resource.type === "video") return "video";
  return "document";
}

/**
 * Resolves any stored file reference to a usable URL: a plain https URL is
 * returned as-is, a private storage URI gets a short-lived signed URL.
 */
export async function resolveFileUri(uri) {
  if (!uri) return null;
  if (/^https?:\/\//i.test(uri)) return uri;

  try {
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: uri,
      expires_in: 3600,
    });
    return signed_url || null;
  } catch (error) {
    console.error("Failed to create signed URL:", error);
    return null;
  }
}

/**
 * Resolves a usable URL for a resource's attached file.
 * Public files already have a permanent URL; private files get a short-lived signed URL.
 */
export async function resolveResourceFileUrl(resource) {
  const uri = getResourceFileUri(resource);
  if (!uri) return null;

  const isPublic =
    resource?.storage_visibility === "public" ||
    (!resource?.storage_visibility && /^https?:\/\//i.test(uri));
  if (isPublic) return uri;

  return resolveFileUri(uri);
}