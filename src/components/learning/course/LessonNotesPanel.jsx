import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bookmark, Loader2, Plus, StickyNote, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const clock = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

const shortDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

/**
 * The learner's own margin: notes on a resource and bookmarks that hold a place
 * in it, kept on their progress record so they follow them across devices.
 */
export default function LessonNotesPanel({ resourceId, lessonTitle, playerApi }) {
  const { user } = useAuth();
  const email = user?.email || user?.data?.email;

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!resourceId || !email) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const rows = await base44.entities.LearnerProgress.filter({
        user_email: email,
        learning_resource_id: resourceId,
      }).catch(() => []);
      if (!cancelled) {
        setRecord(rows?.[0] || null);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [resourceId, email]);

  const save = useCallback(
    async (patch) => {
      setBusy(true);
      try {
        const saved = record?.id
          ? await base44.entities.LearnerProgress.update(record.id, patch)
          : await base44.entities.LearnerProgress.create({
              user_email: email,
              learning_resource_id: resourceId,
              status: "in_progress",
              client_id: user?.data?.client_id || undefined,
              ...patch,
            });
        setRecord(saved?.id ? saved : { ...(record || {}), ...patch });
        return true;
      } catch (error) {
        console.error("Notes save error:", error);
        toast.error("Could not save that. Please try again.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [record, email, resourceId, user]
  );

  const notes = record?.notes || [];
  const bookmarks = record?.bookmarks || [];

  const addNote = async () => {
    const content = note.trim();
    if (!content) return;
    const ok = await save({
      notes: [...notes, { timestamp: new Date().toISOString(), content }],
    });
    if (ok) setNote("");
  };

  const addBookmark = async () => {
    const seconds = playerApi?.current?.time?.();
    const at = Number.isFinite(seconds) && seconds > 0 ? seconds : null;
    const ok = await save({
      bookmarks: [
        ...bookmarks,
        {
          timestamp: new Date().toISOString(),
          context: lessonTitle || "Lesson",
          ...(at !== null ? { resource_timestamp: at } : {}),
        },
      ],
    });
    if (ok) toast.success(at !== null ? `Bookmarked at ${clock(at)}` : "Lesson bookmarked");
  };

  if (!resourceId || !email) return null;

  return (
    <div className="rounded-2xl border border-border bg-muted/30">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
          Your notes
        </p>
        <button
          type="button"
          onClick={addBookmark}
          disabled={busy || loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <Bookmark className="h-3 w-3" />
          Bookmark this
        </button>
      </div>

      <div className="space-y-3 px-4 py-3">
        {loading ? (
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading your notes…
          </p>
        ) : (
          <>
            {bookmarks.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {bookmarks.map((bookmark, index) => (
                  <li key={`bm-${index}`}>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-foreground">
                      <button
                        type="button"
                        onClick={() =>
                          bookmark.resource_timestamp != null &&
                          playerApi?.current?.seek?.(bookmark.resource_timestamp)
                        }
                        className={bookmark.resource_timestamp != null ? "hover:underline" : "cursor-default"}
                      >
                        <Bookmark className="mr-1 inline h-2.5 w-2.5 text-[#0202ff]" />
                        {bookmark.resource_timestamp != null
                          ? clock(bookmark.resource_timestamp)
                          : shortDate(bookmark.timestamp)}
                      </button>
                      <button
                        type="button"
                        onClick={() => save({ bookmarks: bookmarks.filter((_, i) => i !== index) })}
                        disabled={busy}
                        aria-label="Remove bookmark"
                        className="text-muted-foreground hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {notes.length > 0 ? (
              <ul className="space-y-1.5">
                {notes.map((entry, index) => (
                  <li
                    key={`note-${index}`}
                    className="flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-2"
                  >
                    <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
                      {entry.content}
                    </p>
                    <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                      {shortDate(entry.timestamp)}
                    </span>
                    <button
                      type="button"
                      onClick={() => save({ notes: notes.filter((_, i) => i !== index) })}
                      disabled={busy}
                      aria-label="Delete note"
                      className="flex-shrink-0 text-muted-foreground hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nothing noted yet. Write down what you want to remember or try.
              </p>
            )}

            <div className="flex items-start gap-2">
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                placeholder="Add a note for yourself…"
                className="min-w-0 flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0202ff]/40"
              />
              <button
                type="button"
                onClick={addNote}
                disabled={busy || !note.trim()}
                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-[#0202ff] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0101dd] disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}