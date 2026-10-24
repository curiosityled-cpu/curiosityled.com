import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const EMPTY = { tiers: [], tracks: [], title_mappings: [] };

/**
 * Loads one tenant's role taxonomy (tiers, tracks, title mappings) so screens
 * can show or edit a person's role profile and target an audience by role.
 */
export default function useRoleTaxonomy(clientId) {
  const [taxonomy, setTaxonomy] = useState(EMPTY);
  const [loading, setLoading] = useState(!!clientId);

  useEffect(() => {
    let cancelled = false;

    if (!clientId) {
      setTaxonomy(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);
    base44.entities.RoleTaxonomy.filter({ client_id: clientId })
      .then((rows) => {
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : rows?.items || [];
        const record = list[0] || null;
        setTaxonomy({
          tiers: record?.tiers || [],
          tracks: record?.tracks || [],
          title_mappings: record?.title_mappings || [],
        });
      })
      .catch(() => {
        if (!cancelled) setTaxonomy(EMPTY);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const normalize = (v) => String(v || "").trim().toLowerCase();

  const tierLabel = (id) => taxonomy.tiers.find((t) => t.id === id)?.label || "";
  const trackLabel = (id) => taxonomy.tracks.find((t) => t.id === id)?.label || "";
  const mappingForTitle = (title) => {
    const wanted = normalize(title);
    if (!wanted) return null;
    return taxonomy.title_mappings.find((m) => normalize(m.title) === wanted) || null;
  };

  return {
    taxonomy,
    tiers: taxonomy.tiers,
    tracks: taxonomy.tracks,
    titleMappings: taxonomy.title_mappings,
    loading,
    tierLabel,
    trackLabel,
    mappingForTitle,
    hasTaxonomy: taxonomy.tiers.length > 0 || taxonomy.tracks.length > 0,
  };
}