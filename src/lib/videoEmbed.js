/**
 * Helpers for playing externally hosted lesson videos inside an embedded frame.
 */

/** Turns a share link into an embeddable player URL, or null when it can't be embedded. */
export function toEmbedUrl(url) {
  if (!url || !/^https?:\/\//i.test(String(url).trim())) return null;
  try {
    const parsed = new URL(String(url).trim());
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host.endsWith("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) return parsed.href;
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host.endsWith("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (host.includes("drive.google.com")) {
      const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
      return match ? `https://drive.google.com/file/d/${match[1]}/preview` : null;
    }
    if (host.includes("loom.com")) {
      const match = parsed.pathname.match(/\/(?:share|embed)\/([^/]+)/);
      return match ? `https://www.loom.com/embed/${match[1]}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * The embeddable player URL for a resource: taken from its embed code when it
 * holds one, otherwise from its link.
 */
export function getResourceVideoEmbed(resource) {
  if (!resource) return null;
  const fromCode =
    String(resource.embed_code || "").match(/src=["']([^"']+)["']/i)?.[1] || null;
  return toEmbedUrl(fromCode) || toEmbedUrl(resource.url) || null;
}