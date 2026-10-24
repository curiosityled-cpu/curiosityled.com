import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, User } from "lucide-react";
import LeaderNoteComposer from "./LeaderNoteComposer";
import CheckInSessionCard from "./CheckInSessionCard";

/**
 * Individual check-ins for the people in the current drill-down scope
 * (a leader's directs and roll-ups), with the leader's own notes.
 */
export default function IndividualCheckIns({ members = [], range = { days: 90 } }) {
  const [selectedEmail, setSelectedEmail] = useState("");

  const { data: viewer } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  // Default to the first person who isn't the viewer
  useEffect(() => {
    if (members.length === 0) return;
    if (selectedEmail && members.some((m) => m.email === selectedEmail)) return;
    const viewerEmail = (viewer?.email || "").toLowerCase();
    const first = members.find((m) => (m.email || "").toLowerCase() !== viewerEmail) || members[0];
    if (first) setSelectedEmail(first.email);
  }, [members, viewer, selectedEmail]);

  const { data: personData, isLoading, error } = useQuery({
    queryKey: ["person-check-ins", selectedEmail, JSON.stringify(range)],
    enabled: !!selectedEmail,
    queryFn: async () => {
      const res = await base44.functions.invoke("getPersonCheckIns", {
        user_email: selectedEmail,
        ...range,
      });
      return res?.data || res;
    },
  });

  const { data: notes = [], refetch: refetchNotes } = useQuery({
    queryKey: ["leader-notes", selectedEmail],
    enabled: !!selectedEmail,
    queryFn: async () => {
      const res = await base44.entities.CheckInLeaderNote.filter(
        { subject_email: selectedEmail },
        "-created_date",
        100
      );
      return Array.isArray(res) ? res : res?.items || [];
    },
  });

  if (members.length === 0) return null;

  const person = personData?.person;
  const subject = person || { email: selectedEmail, name: selectedEmail };
  const personNote = notes.find((n) => n.scope === "person");
  const noteForSession = (session) =>
    notes.find(
      (n) =>
        n.scope === "check_in" &&
        n.check_in_date === session.date &&
        (n.check_in_type || "") === (session.type || "")
    );

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Individual check-ins</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Directs and roll-ups in this view. Notes stay private to you until you share them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-gray-400" />
          <Select value={selectedEmail} onValueChange={setSelectedEmail}>
            <SelectTrigger className="h-8 w-[240px] text-xs">
              <SelectValue placeholder="Choose a person…" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.email} value={m.email} className="text-xs">
                  {m.name || m.email}
                  {(m.email || "").toLowerCase() === (viewer?.email || "").toLowerCase() ? " (you)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" />
        </div>
      ) : error ? (
        <Card className="border border-amber-100 bg-amber-50 rounded-xl">
          <CardContent className="p-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <p className="text-sm text-amber-800">{error.message || "Could not load these check-ins."}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <LeaderNoteComposer
            note={personNote}
            scope="person"
            subject={subject}
            viewer={viewer}
            onSaved={refetchNotes}
            placeholder={`Running note about ${(subject.name || "").split(" ")[0] || "this person"}…`}
          />

          {(personData?.sessions || []).length === 0 ? (
            <Card className="border border-dashed border-gray-200 rounded-xl">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-gray-600">No check-ins from {subject.name || "this person"} in this period.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(personData.sessions || []).map((session) => (
                <CheckInSessionCard
                  key={session.id || `${session.date}-${session.type}`}
                  session={session}
                  measures={personData?.measures || []}
                  note={noteForSession(session)}
                  subject={subject}
                  viewer={viewer}
                  onSaved={refetchNotes}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}