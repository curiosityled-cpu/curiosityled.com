/**
 * SharedLeaderNotes — the notes a leader has shared with the signed-in person,
 * shown on their own check-in views: the running note about them, plus notes
 * attached to a specific check-in day. Access rules only ever return notes
 * whose author chose to share them with this person.
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";

const formatDay = (value) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

const formatSharedAt = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

function NoteRow({ note, meta }) {
  return (
    <div className="rounded-lg border border-purple-100 bg-white p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
        <p className="text-xs font-semibold text-purple-700">
          {note.leader_name || note.leader_email}
        </p>
        <div className="flex items-center gap-2">
          {meta}
          {note.shared_at && (
            <span className="text-[11px] text-gray-400">shared {formatSharedAt(note.shared_at)}</span>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.note}</p>
    </div>
  );
}

export default function SharedLeaderNotes({ userEmail }) {
  const { data: notes = [] } = useQuery({
    queryKey: ["shared-leader-notes", userEmail],
    enabled: !!userEmail,
    queryFn: async () => {
      const rows = await base44.entities.CheckInLeaderNote.filter(
        { subject_email: userEmail, shared_with_subject: true },
        "-created_date",
        50
      );
      return Array.isArray(rows) ? rows : rows?.items || [];
    },
    staleTime: 60 * 1000,
  });

  if (!notes.length) return null;

  const personNotes = notes.filter((n) => n.scope !== "check_in");
  const checkInNotes = [...notes.filter((n) => n.scope === "check_in")].sort((a, b) =>
    (b.check_in_date || "").localeCompare(a.check_in_date || "")
  );

  return (
    <Card className="shadow-sm border border-purple-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="w-5 h-5 text-purple-600" />
          Notes your leader shared with you
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {personNotes.map((note) => (
          <NoteRow key={note.id} note={note} />
        ))}
        {checkInNotes.map((note) => (
          <NoteRow
            key={note.id}
            note={note}
            meta={
              <Badge
                variant="outline"
                className="text-[11px] font-normal text-purple-700 border-purple-200"
              >
                {note.check_in_type
                  ? `${note.check_in_type[0].toUpperCase()}${note.check_in_type.slice(1)} check-in`
                  : "Check-in"}
                {note.check_in_date ? ` · ${formatDay(note.check_in_date)}` : ""}
              </Badge>
            }
          />
        ))}
      </CardContent>
    </Card>
  );
}