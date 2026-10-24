import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import AudienceSelector from "@/components/checkin/AudienceSelector";
import useRoleTaxonomy from "@/hooks/useRoleTaxonomy";
import { Loader2, Users, AlertCircle } from "lucide-react";

export const EMPTY_AUDIENCE = { target_tiers: [], target_tracks: [], target_titles: [] };

/**
 * RoleAudiencePicker — picks an audience by role and resolves who is in it.
 * Matching happens server-side so learning uses the same audience rules as
 * check-ins. Resolved emails are reported back for the caller to assign to.
 */
export default function RoleAudiencePicker({ clientId, value, onChange, onResolved }) {
  const { tiers, tracks, titleMappings, loading: taxonomyLoading } = useRoleTaxonomy(clientId);
  const [people, setPeople] = useState([]);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState(null);

  const audienceKey = JSON.stringify(value || EMPTY_AUDIENCE);

  useEffect(() => {
    let cancelled = false;
    setResolving(true);

    base44.functions
      .invoke("resolveAudienceMembers", {
        client_id: clientId,
        target_tiers: value?.target_tiers || [],
        target_tracks: value?.target_tracks || [],
        target_titles: value?.target_titles || [],
      })
      .then((res) => {
        if (cancelled) return;
        const data = res?.data || res;
        if (data?.error) throw new Error(data.error);
        const rows = data?.people || [];
        setPeople(rows);
        setError(null);
        onResolved?.(rows.map((p) => p.email));
      })
      .catch((e) => {
        if (cancelled) return;
        setPeople([]);
        setError(e?.message || "Could not resolve that audience");
        onResolved?.([]);
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, audienceKey]);

  const isEveryone =
    !value?.target_tiers?.length && !value?.target_tracks?.length && !value?.target_titles?.length;

  return (
    <div className="space-y-3">
      <AudienceSelector
        tiers={tiers}
        tracks={tracks}
        titles={titleMappings}
        value={value}
        onChange={onChange}
      />

      <div className="rounded-lg border border-border px-3 py-2.5">
        {resolving || taxonomyLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Working out who this reaches...
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 text-xs text-red-600">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-[#0202ff]" />
              <p className={`text-xs font-medium ${isEveryone && people.length > 1 ? "text-amber-600" : "text-foreground"}`}>
                {people.length} {people.length === 1 ? "person" : "people"}{" "}
                {isEveryone ? "in this organisation — everyone" : "match this audience"}
              </p>
            </div>
            {people.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {people.slice(0, 8).map((p) => (
                  <span
                    key={p.email}
                    className="text-[11px] bg-muted text-muted-foreground border border-border rounded-md px-2 py-0.5"
                  >
                    {p.name}
                  </span>
                ))}
                {people.length > 8 && (
                  <span className="text-[11px] text-muted-foreground px-1 py-0.5">
                    +{people.length - 8} more
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}