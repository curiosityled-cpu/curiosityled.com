/**
 * CheckInNotesPanel — the notes about one person's individual check-ins, shown
 * at the bottom of the Check-In tab for whoever is selected there. A leader
 * reviews and writes their own notes about that person; a person sees the notes
 * a leader has shared with them. Access rules decide what each viewer can see.
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import LeaderNoteComposer from "@/components/checkin/insights/LeaderNoteComposer";

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
            <span className="text-[11px] text-gray-400">
              shared {formatSharedAt(note.shared_at)}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.note}</p>
    </div>
  );
}

export default function CheckInNotesPanel({ viewer, subject }) {
  const subjectEmail = subject?.email;
  const viewerEmail = (viewer?.email || "").toLowerCase();
  const isSelf = (subjectEmail || "").toLowerCase() === viewerEmail;
  const firstName = (subject?.name || subjectEmail || "them").split(" ")[0].split("@")[0];

  const { data: notes = [], refetch } = useQuery({
    queryKey: ["checkin-notes", subjectEmail],
    enabled: !!subjectEmail,
    queryFn: async () => {
      const rows = await base44.entities.CheckInLeaderNote.filter(
        { subject_email: subjectEmail },
        "-created_date",
        50
      );
      return Array.isArray(rows) ? rows : rows?.items || [];
    },
    staleTime: 30 * 1000,
  });

  const personNotes = notes.filter((n) => n.scope !== "check_in");
  const dayNotes = [...notes.filter((n) => n.scope === "check_in")].sort((a, b) =>
    (b.check_in_date || "").localeCompare(a.check_in_date || "")
  );
  const myPersonNote = personNotes.find(
    (n) => (n.leader_email || "").toLowerCase() === viewerEmail
  );
  const dayNoteMeta = (note) => (
    <Badge variant="outline" className="text-[11px] font-normal text-purple-700 border-purple-200">
      {note.check_in_type
        ? `${note.check_in_type[0].toUpperCase()}${note.check_in_type.slice(1)} check-in`
        : "Check-in"}
      {note.check_in_date ? ` · ${formatDay(note.check_in_date)}` : ""}
    </Badge>
  );

  // Nothing to show the person on their own check-ins until a leader shares a note
  if (isSelf && notes.length === 0) return null;

  return (
    <Card className="shadow-sm border border-purple-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="w-5 h-5 text-purple-600" />
          {isSelf ? "Notes about your check-ins" : `Your notes about ${firstName}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isSelf ? (
          personNotes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              meta={
                <Badge
                  variant="outline"
                  className="text-[11px] font-normal text-purple-700 border-purple-200"
                >
                  Shared with you
                </Badge>
              }
            />
          ))
        ) : (
          <LeaderNoteComposer
            note={myPersonNote}
            scope="person"
            subject={subject}
            viewer={viewer}
            onSaved={refetch}
            placeholder={`A running note about ${firstName}…`}
          />
        )}
        {dayNotes.map((note) => (
          <NoteRow key={note.id} note={note} meta={dayNoteMeta(note)} />
        ))}
      </CardContent>
    </Card>
  );
}