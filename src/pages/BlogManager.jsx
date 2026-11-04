import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useAuth } from "@/components/useAuth";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import PostEditorDialog from "@/components/blog/PostEditorDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPostDate, postUrl } from "@/lib/blog";
import {
  PenLine,
  Plus,
  ExternalLink,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

const ALLOWED_ROLES = [
  "Platform Admin",
  "Super Administrator",
  "Admin Level 1",
  "Admin Level 2",
];

const FILTERS = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Drafts" },
];

export default function BlogManager() {
  const { user, appRole, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const allowed =
    !authLoading &&
    (user?.role === "admin" || ALLOWED_ROLES.includes(appRole));

  const load = async () => {
    setLoading(true);
    try {
      const page = await base44.entities.BlogPost.filter(
        {},
        { sort: "-created_date", limit: 100 }
      );
      setPosts(page?.items ?? []);
    } catch (e) {
      toast.error("The articles could not be loaded");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) load();
  }, [allowed]);

  const counts = useMemo(() => {
    return {
      all: posts.length,
      published: posts.filter((post) => post.status === "published").length,
      draft: posts.filter((post) => post.status === "draft").length,
    };
  }, [posts]);

  const visible = useMemo(
    () => (filter === "all" ? posts : posts.filter((post) => post.status === filter)),
    [posts, filter]
  );

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (post) => {
    setEditing(post);
    setEditorOpen(true);
  };

  const togglePublish = async (post) => {
    const next = post.status === "published" ? "draft" : "published";
    setBusyId(post.id);
    try {
      await base44.entities.BlogPost.update(post.id, {
        status: next,
        published_date:
          next === "published"
            ? post.published_date || new Date().toISOString()
            : post.published_date,
      });
      toast.success(next === "published" ? "Article published" : "Article unpublished");
      await load();
    } catch (e) {
      toast.error(e?.message || "That change could not be saved");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    try {
      await base44.entities.BlogPost.delete(pendingDelete.id);
      toast.success("Article deleted");
      setPendingDelete(null);
      await load();
    } catch (e) {
      toast.error(e?.message || "The article could not be deleted");
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading) {
    return (
      <MVPPageLayout title="Blog">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading
        </div>
      </MVPPageLayout>
    );
  }

  if (!allowed) {
    return (
      <MVPPageLayout title="Blog">
        <div className="rounded-xl border border-border bg-card px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-foreground">
            Administrator access required
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Publishing and editing articles is limited to organisation administrators.
          </p>
        </div>
      </MVPPageLayout>
    );
  }

  return (
    <MVPPageLayout
      title="Blog"
      subtitle="Articles published on the public journal at /blog. HeyCatch can file articles directly through the publishing endpoint."
      action={
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          New article
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors ${
              filter === item.id
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
            <span className="ml-1.5 opacity-60">{counts[item.id]}</span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center gap-2 px-6 py-10 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading articles
          </div>
        ) : visible.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <PenLine className="w-7 h-7 mx-auto text-muted-foreground/60" />
            <p className="mt-3 text-[15px] font-semibold text-foreground">
              No articles yet
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Write the first one, or let HeyCatch file it through the publishing endpoint.
            </p>
            <Button onClick={openNew} variant="outline" className="mt-5 gap-2">
              <Plus className="w-4 h-4" />
              Write an article
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((post) => (
              <li
                key={post.id}
                className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-[15px] font-semibold text-foreground">
                      {post.title}
                    </h3>
                    <Badge
                      variant="outline"
                      className={
                        post.status === "published"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : post.status === "archived"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-border bg-muted text-muted-foreground"
                      }
                    >
                      {post.status}
                    </Badge>
                    {post.source === "heycatch" && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-violet-200 bg-violet-50 text-violet-700"
                      >
                        <Sparkles className="w-3 h-3" />
                        HeyCatch
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 truncate text-[12.5px] text-muted-foreground">
                    /blog/{post.slug}
                    {post.category ? ` · ${post.category}` : ""}
                    {post.published_date ? ` · ${formatPostDate(post.published_date)}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePublish(post)}
                    disabled={busyId === post.id}
                    className="gap-1.5"
                  >
                    {busyId === post.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : post.status === "published" ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                    {post.status === "published" ? "Unpublish" : "Publish"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(post)}>
                    Edit
                  </Button>
                  {post.status === "published" && (
                    <Link
                      to={postUrl(post.slug)}
                      target="_blank"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground"
                      title="Open the public page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingDelete(post)}
                    className="text-muted-foreground hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PostEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        post={editing}
        onSaved={load}
      />

      <ConfirmDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete this article?"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" will be removed from the blog permanently.`
            : ""
        }
        confirmText="Delete"
      />
    </MVPPageLayout>
  );
}