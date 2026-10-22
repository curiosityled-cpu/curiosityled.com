import { getResourceFileUri, resolveResourceFileUrl } from "@/lib/resourceFile";

/**
 * Opens a learning resource: external URL when it has one, otherwise its
 * attached file (private files are reached through a short-lived signed URL).
 */
export async function openResource(resource) {
  if (!resource) return false;
  if (resource.url) {
    window.open(resource.url, "_blank", "noopener");
    return true;
  }
  if (!getResourceFileUri(resource)) return false;
  const url = await resolveResourceFileUrl(resource);
  if (!url) return false;
  window.open(url, "_blank", "noopener");
  return true;
}