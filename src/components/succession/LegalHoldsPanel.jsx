import React, { useCallback, useEffect, useState } from "react";
import { useSuccessionApi } from "@/components/succession/useSuccessionApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Lock, LockOpen, AlertCircle } from "lucide-react";

/**
 * LegalHoldsPanel — place and release legal holds.
 *
 * A hold outranks every retention window: while it is active the covered
 * records cannot be purged, archived, withdrawn or superseded. Both placing and
 * releasing demand a written reason, because a freeze that cannot be explained
 * afterwards is worse than no freeze at all.
 */
export default function LegalHoldsPanel({ cycles = [] }) {
  const { invoke, loading, error } = useSuccessionApi();
  const [holds, setHolds] = useState([]);
  const [loadingHolds, setLoadingHolds] = useState(true);
  const [cycleId, setCycleId] = useState("");
  const [matter, setMatter] = useState("");
  const [reason, setReason] = useState("");
  const [releaseNotes, setReleaseNotes] = useState({});

  const loadHolds = useCallback(async () => {
    setLoadingHolds(true);
    try {
      const res = await invoke("successionManageLegalHold", { action: "list" });
      setHolds(res?.holds || []);
    } catch {
      setHolds([]);
    } finally {
      setLoadingHolds(false);
    }
  }, [invoke]);

  useEffect(() => {
    loadHolds();
  }, [loadHolds]);

  const placeHold = async () => {
    if (!cycleId || reason.trim().length < 20) return;
    await invoke("successionManageLegalHold", {
      action: "place",
      scope_type: "cycle",
      cycle_id: cycleId,
      matter_reference: matter.trim() || undefined,
      reason: reason.trim(),
    });
    setReason("");
    setMatter("");
    loadHolds();
  };

  const releaseHold = async (holdId) => {
    const note = (releaseNotes[holdId] || "").trim();
    if (note.length < 10) return;
    await invoke("successionManageLegalHold", {
      action: "release",
      hold_id: holdId,
      release_reason: note,
    });
    setReleaseNotes((prev) => ({ ...prev, [holdId]: "" }));
    loadHolds();
  };

  const active = holds.filter((h) => h.status === "active");
  const released = holds.filter((h) => h.status !== "active");

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <Card>
        <CardContent className="py-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Place a hold</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Freezes every succession record belonging to one cycle. Nothing covered by the hold can be
              purged, archived, withdrawn or superseded while it is active.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Cycle</Label>
              <Select value={cycleId} onValueChange={setCycleId}>
                <SelectTrigger className="mt-1" aria-label="Cycle to hold">
                  <SelectValue placeholder="Select cycle" />
                </SelectTrigger>
                <SelectContent>
                  {cycles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name || c.cycle_name || c.id.slice(-8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Matter reference (optional)</Label>
              <Input
                className="mt-1"
                value={matter}
                onChange={(e) => setMatter(e.target.value)}
                placeholder="e.g. Matter 2026-114"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Why the hold applies</Label>
            <Textarea
              className="mt-1"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State what this hold answers to — an investigation, a claim, an audit request."
            />
            <p className="text-xs text-gray-400 mt-1">At least 20 characters. Recorded with your name and the time.</p>
          </div>

          <Button
            size="sm"
            onClick={placeHold}
            disabled={loading || !cycleId || reason.trim().length < 20}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Lock className="w-3.5 h-3.5 mr-1" />}
            Place hold
          </Button>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Active holds</h3>
        {loadingHolds ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
          </div>
        ) : active.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-gray-500">
              No active holds. Records follow their normal retention windows.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {active.map((hold) => (
              <Card key={hold.id}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Active hold</Badge>
                        <span className="text-xs text-gray-500 capitalize">{hold.scope_type}</span>
                      </div>
                      <p className="text-sm text-gray-900 mt-1">{hold.reason}</p>
                      {hold.matter_reference && (
                        <p className="text-xs text-gray-500 mt-0.5">Matter: {hold.matter_reference}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Placed by {hold.placed_by_email} on{" "}
                        {hold.placed_at ? new Date(hold.placed_at).toLocaleString() : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Reason for release</Label>
                      <Input
                        className="mt-1"
                        value={releaseNotes[hold.id] || ""}
                        onChange={(e) => setReleaseNotes((prev) => ({ ...prev, [hold.id]: e.target.value }))}
                        placeholder="e.g. Matter closed, outside counsel confirmed release"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => releaseHold(hold.id)}
                      disabled={loading || (releaseNotes[hold.id] || "").trim().length < 10}
                    >
                      <LockOpen className="w-3.5 h-3.5 mr-1" />
                      Release
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {released.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Released</h3>
          <div className="space-y-2">
            {released.map((hold) => (
              <Card key={hold.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-700">{hold.reason}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Released by {hold.released_by_email} on{" "}
                        {hold.released_at ? new Date(hold.released_at).toLocaleDateString() : "—"}
                        {hold.release_reason ? ` — ${hold.release_reason}` : ""}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">Released</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}