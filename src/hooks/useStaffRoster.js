import { useState, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const APP_URL = "https://curiosityled.ai";

/**
 * useStaffRoster — loads and manages non-user frontline staff (ICRoster)
 * for the current tenant. Staff are roster records, never app accounts.
 */
export function useStaffRoster(clientId) {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!clientId) {
      setRoster([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await base44.entities.ICRoster.list("-created_date", 200);
      setRoster(rows || []);
    } catch (e) {
      console.warn("Could not load staff roster:", e.message);
      setRoster([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createStaff = (payload, createdByEmail) =>
    base44.entities.ICRoster.create({
      ...payload,
      client_id: clientId,
      created_by_email: createdByEmail || "",
      source_system: "manual",
      web_access_token: crypto.randomUUID(),
    });

  const updateStaff = (id, payload) => base44.entities.ICRoster.update(id, payload);

  const removeStaff = async (ic) => {
    await base44.entities.ICRoster.delete(ic.id);
    await reload();
  };

  const toggleField = async (ic, field) => {
    try {
      await base44.entities.ICRoster.update(ic.id, { [field]: !ic[field] });
      setRoster((prev) =>
        prev.map((x) => (x.id === ic.id ? { ...x, [field]: !x[field] } : x))
      );
    } catch (e) {
      toast.error("Could not update: " + (e.message || ""));
      await reload();
    }
  };

  const copyWebLink = (ic) => {
    if (!ic.web_access_token) {
      toast.error("No web link yet — re-save this staff member to generate one.");
      return;
    }
    const link = `${APP_URL}/ic-checkin?token=${ic.web_access_token}`;
    navigator.clipboard?.writeText(link).then(
      () => toast.success("Web check-in link copied"),
      () => toast.error("Could not copy link")
    );
  };

  const sendCards = async (checkInType = "morning") => {
    if (!clientId) {
      toast.error("No organization is associated with your account.");
      return;
    }
    try {
      const res = await base44.functions.invoke("sendICCheckInCards", {
        client_id: clientId,
        check_in_type: checkInType,
      });
      const d = res?.data || res;
      toast.success(
        `Sent ${d.sent || 0} check-in card(s)` +
          (d.skipped_no_conversation
            ? ` · ${d.skipped_no_conversation} not connected to Teams`
            : "") +
          (d.failed ? ` · ${d.failed} failed` : "")
      );
    } catch (e) {
      toast.error("Send failed: " + (e.message || ""));
    }
  };

  return {
    roster,
    loading,
    reload,
    createStaff,
    updateStaff,
    removeStaff,
    toggleField,
    copyWebLink,
    sendCards,
  };
}