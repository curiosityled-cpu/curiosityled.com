/**
 * MyCheckins — the person's own daily check-in history.
 *
 * Replaces the old rhythm page. The calendar covers the organization's
 * retroactive lookback window: completed days carry their scores, a missed day
 * offers "Add check-in", and an existing day can be opened and edited. The
 * capture flow is the same one the Check-In tab of Performance Manager uses.
 */
import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useActiveClientId } from "@/components/contexts/ClientContext";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CalendarClock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CheckInCalendar from "@/components/performance-mgmt/oneonone/CheckInCalendar";
import RetroactiveCheckInCard from "@/components/checkin/RetroactiveCheckInCard";

export default function MyCheckins() {
  const { user } = useAuth();
  const activeClientId = useActiveClientId();
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lookback, setLookback] = useState(7);
  const [editor, setEditor] = useState(null); // { kind: "add", date } | { kind: "edit", record }

  const myEmail = (user?.email || "").toLowerCase();
  const myName = user?.data?.display_name || user?.full_name || user?.email || "you";

  const load = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const rows = await base44.entities.DailyCheckIn.filter(
        { user_email: user.email },
        "-check_in_date",
        200
      );
      setCheckIns(rows || []);
    } catch {
      setCheckIns([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    load();
  }, [load]);

  // The org sets how far back a missed day may still be captured.
  useEffect(() => {
    if (!activeClientId) return;
    base44.entities.Client.get(activeClientId)
      .then((client) => {
        const days = client?.settings?.check_in_config?.retroactive_lookback_days;
        if (typeof days === "number") setLookback(days);
      })
      .catch(() => {});
  }, [activeClientId]);

  return (
    <MVPPageLayout
      title="My check-ins"
      subtitle="Your daily check-in history — capture any day you missed."
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" />
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="border border-gray-100 shadow-sm rounded-2xl">
            <CardContent className="p-4 flex items-start gap-3">
              <CalendarClock className="w-4 h-4 text-[#0202ff] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-600 leading-relaxed">
                {lookback > 0
                  ? `Pick a day to see its scores, or capture one you missed — up to ${lookback} day${
                      lookback === 1 ? "" : "s"
                    } back.`
                  : "Capturing past check-ins is turned off for your organization, so only today can be recorded."}
              </p>
            </CardContent>
          </Card>

          <CheckInCalendar
            filter={myEmail}
            checkIns={checkIns}
            teamMembers={[]}
            myEmail={myEmail}
            myName={myName}
            lookback={lookback}
            onAdd={(date) => setEditor({ kind: "add", date })}
            onEdit={(record) => setEditor({ kind: "edit", record })}
          />

          <Dialog open={!!editor} onOpenChange={(open) => !open && setEditor(null)}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader className="sr-only">
                <DialogTitle>
                  {editor?.kind === "edit" ? "Edit check-in" : "Add check-in"}
                </DialogTitle>
              </DialogHeader>
              {editor?.kind === "edit" && (
                <RetroactiveCheckInCard
                  initialDate={editor.record.check_in_date}
                  initialType={editor.record.check_in_type || "morning"}
                  editMode
                  onSaved={() => {
                    setEditor(null);
                    load();
                  }}
                  onCancel={() => setEditor(null)}
                />
              )}
              {editor?.kind === "add" && (
                <RetroactiveCheckInCard
                  initialDate={editor.date}
                  initialType="morning"
                  onSaved={() => {
                    setEditor(null);
                    load();
                  }}
                  onCancel={() => setEditor(null)}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </MVPPageLayout>
  );
}