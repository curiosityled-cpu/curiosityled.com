/**
 * CheckInLookbackSetting — admin control for the retroactive check-in lookback
 * window (Client.settings.check_in_config.retroactive_lookback_days).
 *
 * Shown at the top of the Check-In Setup tab. Only renders for users who
 * belong to a client (tenant admins). Platform admins without a client see
 * nothing here — they configure per-tenant via the client record directly.
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarClock } from "lucide-react";
import { toast } from "sonner";

export default function CheckInLookbackSetting() {
  const { user } = useAuth();
  const clientId = user?.data?.client_id || user?.client_id;
  const [lookback, setLookback] = useState(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const client = await base44.entities.Client.get(clientId);
        const cfg = client?.settings?.check_in_config || {};
        setLookback(cfg.retroactive_lookback_days ?? 7);
      } catch {
        /* default */
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  const handleSave = async () => {
    if (!clientId) {
      toast.error("No client associated with your account.");
      return;
    }
    setSaving(true);
    try {
      const client = await base44.entities.Client.get(clientId);
      const settings = { ...(client.settings || {}) };
      settings.check_in_config = { ...(settings.check_in_config || {}) };
      settings.check_in_config.retroactive_lookback_days =
        Number(lookback) || 0;
      await base44.entities.Client.update(clientId, { settings });
      toast.success("Retroactive lookback window updated.");
    } catch (e) {
      toast.error("Could not save: " + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };

  if (!clientId) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
            <CalendarClock className="w-4 h-4 text-[#0202ff]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Retroactive check-in window
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              How many days back users can complete a missed check-in. Set to 0
              to disable retroactive check-ins.
            </p>
            <div className="flex items-end gap-2 mt-3">
              <div className="space-y-1">
                <Label className="text-xs">Days back</Label>
                <Input
                  type="number"
                  min={0}
                  max={90}
                  value={lookback}
                  onChange={(e) => setLookback(e.target.value)}
                  disabled={loading}
                  className="w-28 text-sm"
                />
              </div>
              <Button
                onClick={handleSave}
                disabled={saving || loading}
                size="sm"
                className="bg-[#0202ff] hover:bg-[#0101dd]"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}