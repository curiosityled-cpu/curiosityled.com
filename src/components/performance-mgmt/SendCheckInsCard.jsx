/**
 * SendCheckInsCard — admin surface for sending daily check-in cards to
 * frontline staff (ICRoster). Lives in Performance Manager > Check-Ins and
 * 1:1s > Check-In > Check-In Settings.
 *
 * Supports:
 *  - Bulk send to all active staff (morning/evening)
 *  - Send to selected individuals
 *  - Automation toggle (enables scheduled sending via the IC Daily Check-In
 *    Automation workflow, stored in Client.settings.check_in_config)
 */
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Loader2,
  Users,
  UserCog,
  AlertCircle,
  Clock,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export default function SendCheckInsCard({ user }) {
  const { user: authUser } = useAuth();
  const currentUser = user || authUser;
  const clientId = currentUser?.data?.client_id || currentUser?.client_id;

  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [checkInType, setCheckInType] = useState("morning");
  const [selectedIds, setSelectedIds] = useState([]);
  const [client, setClient] = useState(null);
  const [savingAutomation, setSavingAutomation] = useState(false);

  const loadData = useCallback(async () => {
    if (!clientId) {
      setRoster([]);
      setClient(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [icRows, clientRow] = await Promise.all([
        base44.entities.ICRoster.filter(
          { client_id: clientId, is_active: true, check_in_enabled: true },
          "-created_date",
          500
        ).catch(() => []),
        base44.entities.Client.get(clientId).catch(() => null),
      ]);
      setRoster(icRows || []);
      setClient(clientRow);
    } catch {
      setRoster([]);
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const automationEnabled =
    client?.settings?.check_in_config?.ic_automation_enabled === true;
  const automationType =
    client?.settings?.check_in_config?.ic_automation_type || "morning";

  const toggleAutomation = async (enabled) => {
    if (!client) return;
    setSavingAutomation(true);
    try {
      const currentSettings = client.settings || {};
      const currentCheckInConfig = currentSettings.check_in_config || {};
      const updatedSettings = {
        ...currentSettings,
        check_in_config: {
          ...currentCheckInConfig,
          ic_automation_enabled: enabled,
          ic_automation_type: automationType,
        },
      };
      await base44.entities.Client.update(client.id, { settings: updatedSettings });
      setClient({ ...client, settings: updatedSettings });
      toast.success(enabled ? "Automation enabled" : "Automation paused");
    } catch (e) {
      toast.error("Could not update automation: " + (e.message || ""));
    } finally {
      setSavingAutomation(false);
    }
  };

  const updateAutomationType = async (type) => {
    if (!client) return;
    setSavingAutomation(true);
    try {
      const currentSettings = client.settings || {};
      const currentCheckInConfig = currentSettings.check_in_config || {};
      const updatedSettings = {
        ...currentSettings,
        check_in_config: {
          ...currentCheckInConfig,
          ic_automation_type: type,
        },
      };
      await base44.entities.Client.update(client.id, { settings: updatedSettings });
      setClient({ ...client, settings: updatedSettings });
      toast.success("Automation type updated");
    } catch (e) {
      toast.error("Could not update: " + (e.message || ""));
    } finally {
      setSavingAutomation(false);
    }
  };

  const handleSend = async (icIds = null) => {
    if (!clientId) {
      toast.error("No organization is associated with your account.");
      return;
    }
    setSending(true);
    try {
      const payload = {
        client_id: clientId,
        check_in_type: checkInType,
      };
      if (icIds && icIds.length > 0) {
        payload.ic_ids = icIds;
      }
      const res = await base44.functions.invoke("sendICCheckInCards", payload);
      const d = res?.data || res;
      const sentCount = (d.sent || 0) + (d.emailed || 0);
      const skipped = d.skipped_no_conversation || 0;
      const failed = d.failed || 0;
      const label = icIds && icIds.length > 0 ? `${icIds.length} staff` : "all staff";
      toast.success(
        `Sent ${sentCount} check-in(s) to ${label}` +
          (skipped ? ` · ${skipped} not connected to Teams` : "") +
          (failed ? ` · ${failed} failed` : "")
      );
      if (icIds) setSelectedIds([]);
    } catch (e) {
      toast.error("Send failed: " + (e.message || ""));
    } finally {
      setSending(false);
    }
  };

  const toggleSelect = (icId) => {
    setSelectedIds((prev) =>
      prev.includes(icId) ? prev.filter((id) => id !== icId) : [...prev, icId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === roster.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(roster.map((ic) => ic.id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Send className="w-4 h-4 text-[#0202ff]" />
              Send check-ins to staff
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
              Send daily check-in cards to frontline staff via Teams or email.
              Staff must be active with check-ins enabled to receive them.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            <UserCog className="w-3 h-3 mr-1" />
            {roster.length} eligible
          </Badge>
        </div>

        {roster.length === 0 && (
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              No eligible staff. Add staff in User Management and ensure they
              are active with check-ins enabled.
            </span>
          </div>
        )}

        {/* Check-in type selector + bulk send */}
        <div className="rounded-lg border border-border p-3 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">Check-in type:</span>
              <Select
                value={checkInType}
                onValueChange={setCheckInType}
              >
                <SelectTrigger className="h-8 text-xs w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              onClick={() => handleSend()}
              disabled={sending || roster.length === 0}
              className="bg-[#0202ff] hover:bg-[#0101dd] text-xs"
            >
              {sending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 mr-1" />
              )}
              Send to all staff
            </Button>
          </div>
        </div>

        {/* Individual selection */}
        {roster.length > 0 && (
          <div className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                Send to individuals
              </span>
              <button
                onClick={toggleSelectAll}
                className="text-[11px] text-[#0202ff] hover:underline"
              >
                {selectedIds.length === roster.length ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {roster.map((ic) => (
                <label
                  key={ic.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-xs"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(ic.id)}
                    onChange={() => toggleSelect(ic.id)}
                    className="w-3.5 h-3.5 rounded border-gray-300"
                  />
                  <span className="font-medium text-foreground flex-1 truncate">
                    {ic.name}
                  </span>
                  <span className="text-muted-foreground truncate">{ic.email}</span>
                  {ic.teams_conversation_id ? (
                    <span className="text-[10px] text-emerald-600">Teams</span>
                  ) : (
                    <span className="text-[10px] text-amber-600">Email</span>
                  )}
                </label>
              ))}
            </div>
            {selectedIds.length > 0 && (
              <Button
                size="sm"
                onClick={() => handleSend(selectedIds)}
                disabled={sending}
                className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-xs"
              >
                {sending ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 mr-1" />
                )}
                Send to {selectedIds.length} selected
              </Button>
            )}
          </div>
        )}

        {/* Automation */}
        <div className="rounded-lg border border-border p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-[#0202ff]" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  Automate daily check-ins
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 max-w-md">
                  When enabled, check-in cards are sent automatically every
                  weekday at 9am ET to all eligible staff.
                </p>
              </div>
            </div>
            <Switch
              checked={automationEnabled}
              onCheckedChange={toggleAutomation}
              disabled={savingAutomation}
            />
          </div>
          {automationEnabled && (
            <div className="flex items-center gap-2 pl-10">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">Send type:</span>
              <Select
                value={automationType}
                onValueChange={updateAutomationType}
                disabled={savingAutomation}
              >
                <SelectTrigger className="h-7 text-xs w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-[11px] text-muted-foreground">
                · Mon–Fri, 9am ET
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}