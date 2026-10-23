import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MessageSquarePlus } from "lucide-react";
import LeaderNoteComposer from "./LeaderNoteComposer";

const formatDay = (date) => {
  if (!date) return "";
  const parsed = new Date(`${date}T00:00:00`);
  if (isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

/** One individual check-in, with the leader's note attached to that day. */
export default function CheckInSessionCard({ session, measures = [], note, subject, viewer, onSaved }) {
  const [showComposer, setShowComposer] = useState(false);
  const shownMeasures = measures.filter((m) => session.scores?.[m.key] != null || session.notes?.[m.key]);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{formatDay(session.date)}</span>
          {session.type && (
            <Badge variant="outline" className="text-[10px] capitalize">{session.type}</Badge>
          )}
        </div>
        {note ? (
          <span className="text-[11px] text-purple-700 flex items-center gap-1">
            <Star className="w-3 h-3" /> Note added
            {note.shared_with_subject && <span className="text-gray-400">· shared</span>}
          </span>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-gray-500"
            onClick={() => setShowComposer(true)}
          >
            <MessageSquarePlus className="w-3.5 h-3.5 mr-1" /> Add note
          </Button>
        )}
      </div>

      {shownMeasures.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {shownMeasures.map((m) => (
            <div key={m.key} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-700">
                  {m.emoji ? `${m.emoji} ` : ""}{m.label}
                </span>
                {session.scores?.[m.key] != null && (
                  <span className="text-xs font-semibold text-gray-900">{session.scores[m.key]}/5</span>
                )}
              </div>
              {session.notes?.[m.key] && (
                <p className="text-xs text-gray-600 mt-1 italic">"{session.notes[m.key]}"</p>
              )}
            </div>
          ))}
        </div>
      )}

      {session.custom?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {session.custom.map((c) => (
            <span key={c.key} className="text-[11px] bg-slate-100 text-slate-700 rounded px-2 py-0.5">
              {c.label}: <span className="font-semibold">{c.value}{c.unit ? ` ${c.unit}` : ""}</span>
            </span>
          ))}
        </div>
      )}

      {session.big3?.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Big 3</p>
          <ul className="space-y-0.5">
            {session.big3.map((p, i) => (
              <li key={i} className="text-xs text-gray-700 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                <span className="truncate">{p.title}</span>
                {p.status && <span className="text-[10px] text-gray-400 capitalize">{p.status.replace(/_/g, " ")}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {session.observation && (
        <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
          {session.observation}
        </p>
      )}

      {note || showComposer ? (
        <LeaderNoteComposer
          note={note}
          scope="check_in"
          subject={subject}
          checkInDate={session.date}
          checkInType={session.type}
          viewer={viewer}
          onSaved={onSaved}
          placeholder={`Note on the ${formatDay(session.date)} check-in…`}
        />
      ) : null}
    </div>
  );
}