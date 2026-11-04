import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { DEFAULT_CATEGORY, estimateReadingMinutes, slugify } from "@/lib/blog";

const BLANK = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  category: DEFAULT_CATEGORY,
  tags: "",
  author_name: "",
  author_role: "",
  author_avatar_url: "",
  meta_title: "",
  meta_description: "",
  featured: false,
  published: false,
};

function toForm(post) {
  if (!post) return { ...BLANK };
  return {
    title: post.title || "",
    slug: post.slug || "",
    excerpt: post.excerpt || "",
    content: post.content || "",
    cover_image_url: post.cover_image_url || "",
    category: post.category || DEFAULT_CATEGORY,
    tags: (post.tags || []).join(", "),
    author_name: post.author_name || "",
    author_role: post.author_role || "",
    author_avatar_url: post.author_avatar_url || "",
    meta_title: post.meta_title || "",
    meta_description: post.meta_description || "",
    featured: !!post.featured,
    published: post.status === "published",
  };
}

export default function PostEditorDialog({ open, onOpenChange, post, onSaved }) {
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(toForm(post));
      setError("");
    }
  }, [open, post]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError("A headline and an article body are required.");
      return;
    }

    setSaving(true);
    setError("");

    const status = form.published ? "published" : "draft";
    const payload = {
      title: form.title.trim(),
      slug: slugify(form.slug || form.title),
      excerpt: form.excerpt.trim(),
      content: form.content,
      cover_image_url: form.cover_image_url.trim(),
      category: form.category.trim() || DEFAULT_CATEGORY,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      author_name: form.author_name.trim(),
      author_role: form.author_role.trim(),
      author_avatar_url: form.author_avatar_url.trim(),
      meta_title: form.meta_title.trim(),
      meta_description: form.meta_description.trim(),
      featured: form.featured,
      status,
      reading_minutes: estimateReadingMinutes(form.content),
      published_date:
        status === "published"
          ? post?.published_date || new Date().toISOString()
          : post?.published_date || null,
    };

    try {
      if (post?.id) {
        await base44.entities.BlogPost.update(post.id, payload);
        toast.success("Article updated");
      } else {
        await base44.entities.BlogPost.create({ ...payload, source: "manual" });
        toast.success(status === "published" ? "Article published" : "Draft saved");
      }
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (e) {
      setError(e?.message || "The article could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post ? "Edit article" : "New article"}</DialogTitle>
          <DialogDescription>
            Write in Markdown. Headings, lists, quotes, links and images render on the
            public page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="post-title">Headline</Label>
            <Input
              id="post-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Leading through ambiguity without slowing down"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="post-slug">URL slug</Label>
              <Input
                id="post-slug"
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder={form.title ? slugify(form.title) : "auto from headline"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="post-category">Category</Label>
              <Input
                id="post-category"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder={DEFAULT_CATEGORY}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="post-excerpt">Summary</Label>
            <Textarea
              id="post-excerpt"
              value={form.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
              rows={2}
              maxLength={400}
              placeholder="One or two sentences shown on the index and in search results."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="post-body">Article</Label>
            <Textarea
              id="post-body"
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              rows={14}
              className="font-mono text-[13px] leading-relaxed"
              placeholder={"## A section heading\n\nYour opening paragraph.\n\n- A point\n- Another point"}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="post-cover">Cover image URL</Label>
            <Input
              id="post-cover"
              value={form.cover_image_url}
              onChange={(e) => set("cover_image_url", e.target.value)}
              placeholder="https://…"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="post-author">Author</Label>
              <Input
                id="post-author"
                value={form.author_name}
                onChange={(e) => set("author_name", e.target.value)}
                placeholder="Emilio Osoria"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="post-role">Author title</Label>
              <Input
                id="post-role"
                value={form.author_role}
                onChange={(e) => set("author_role", e.target.value)}
                placeholder="Founder"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="post-avatar">Author photo URL</Label>
              <Input
                id="post-avatar"
                value={form.author_avatar_url}
                onChange={(e) => set("author_avatar_url", e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="post-tags">Tags</Label>
            <Input
              id="post-tags"
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="management, feedback, succession"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="post-meta-title">Search title</Label>
              <Input
                id="post-meta-title"
                value={form.meta_title}
                onChange={(e) => set("meta_title", e.target.value)}
                placeholder="Defaults to the headline"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="post-meta-desc">Search description</Label>
              <Input
                id="post-meta-desc"
                value={form.meta_description}
                onChange={(e) => set("meta_description", e.target.value)}
                placeholder="Defaults to the summary"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-8 rounded-xl border border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Switch
                id="post-featured"
                checked={form.featured}
                onCheckedChange={(value) => set("featured", value)}
              />
              <Label htmlFor="post-featured" className="text-[13px]">
                Feature on the index
              </Label>
            </div>
            <div className="flex items-center gap-2.5">
              <Switch
                id="post-published"
                checked={form.published}
                onCheckedChange={(value) => set("published", value)}
              />
              <Label htmlFor="post-published" className="text-[13px]">
                Published
              </Label>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving
              </>
            ) : form.published ? (
              "Publish"
            ) : (
              "Save draft"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}