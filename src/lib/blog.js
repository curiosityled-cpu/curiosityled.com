/**
 * Shared blog helpers. Kept in one place so the editor, the publishing endpoint
 * and the public pages agree on slugs, reading time and dates.
 */

export const BLOG_AUTHOR = {
  name: "Emilio Osoria",
  role: "Founder, Curiosity Led",
  avatar:
    "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/f336eb700_g6u1oy.jpg",
};

export const DEFAULT_CATEGORY = "Leadership";

export function slugify(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/['’"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export function estimateReadingMinutes(markdown) {
  const words = (markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 210));
}

export function formatPostDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function postUrl(slug) {
  return `/blog/${slug}`;
}