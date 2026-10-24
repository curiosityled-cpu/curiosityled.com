import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import LeaderNoteComposer from "./LeaderNoteComposer";
import CheckInSessionCard from "./CheckInSessionCard";

/**
 * One person's daily check-ins and the viewer's notes about them: the running
 * note plus a note on each check-in. Shown at the bottom of the Check-In tab
 * for whoever is selected there.
 */
export default function IndividualCheckIns({ subject, viewer, range = { days: 90 } }) {
  const email = subject?.email;

  const { data: personData, isLoading, error } = useQuery({
    queryKey: ["person-check-ins", email, JSON.stringify(range)],
    enabled: !!email,
    queryFn: async () => {
      const res = await base44.functions.invoke("getPersonCheckIns", {
        user_email: email,
        ...range,
      });
      return res?.data || res;
    },
  });

  const { data: notes = [], refetch: refetchNotes } = useQuery({
    queryKey: ["leader-notes", email],
    enabled: !!email,
    queryFn: async () => {
      const res = await base44.entities.CheckInLeaderNote.filter(
        { subject_email: email },
        "-created_date",
        100
      );
      return Array.isArray(res) ? res : res?.items || [];
    },
  });

  if (!email) return null;

  const person = personData?.person || subject;
  const personName = person?.name || email;
  const personNote = notes.find((n) => n.scope === "person");
  const firstName = (personName || "").split(" ")[0] || "this person";
  const noteForSession = (session) =>
    notes.find(
      (n) =>
        n.scope === "check_in" &&
        n.check_in_date === session.date &&
        (n.check_in_type || "") === (session.type || "")
    );

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Individual check-ins</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {personName} — notes stay private to you until you share them.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" />
        </div>
      ) : error ? (
        <Card className="border border-amber-100 bg-amber-50 rounded-xl">
          <CardContent className="p-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <p className="text-sm text-amber-800">
              {error.message || "Could not load these check-ins."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <LeaderNoteComposer
            note={personNote}
            scope="person"
            subject={person}
            viewer={viewer}
            onSaved={refetchNotes}
            placeholder={`Running note about ${firstName}…`}
          />

          {(personData?.sessions || []).length === 0 ? (
            <Card className="border border-dashed border-gray-200 rounded-xl">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-gray-600">
                  No check-ins from {personName} in this period.
                </p>
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
                  subject={person}
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