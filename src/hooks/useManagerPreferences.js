/**
 * useManagerPreferences — resolves the effective check-in preset and UI density
 * for the current user.
 *
 * Resolution order (per PRD: org default + user override):
 *   preset  = user override (UserPreference.check_in_preset_override) → org default (Client.settings.check_in_config.preset_id) → "balance"
 *   density = user override (UserPreference.ui_density) → org default (Client.settings.ui_density_default) → "compact"
 *
 * Fetches UserPreference + Client once, cached via react-query.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useActiveClientId } from "@/components/contexts/ClientContext";
import {
  getPreset,
  getEnabledMeasureKeys,
  DEFAULT_PRESET_ID,
} from "@/lib/checkInPresets";

export function useManagerPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // The person's own organisation, not simply the first client the caller can see
  // (an administrator can see every tenant, which would otherwise apply another
  // organisation's check-in configuration to everyone).
  const activeClientId = useActiveClientId();

  const { data, isLoading } = useQuery({
    queryKey: ["manager-preferences", user?.email, activeClientId],
    queryFn: async () => {
      if (!user?.email) return { userPref: null, client: null };
      const [prefRows, client] = await Promise.all([
        base44.entities.UserPreference.filter({ user_email: user.email }, null, 1).catch(() => []),
        activeClientId
          ? base44.entities.Client.get(activeClientId).catch(() => null)
          : Promise.resolve(null),
      ]);
      return {
        userPref: prefRows[0] || null,
        client: client || null,
      };
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const orgPresetId = data?.client?.settings?.check_in_config?.preset_id || DEFAULT_PRESET_ID;
  const userPresetOverride = data?.userPref?.check_in_preset_override;
  const presetId = userPresetOverride || orgPresetId;
  // The organization decides which standard measures are in play, one by one.
  const enabledMeasureKeys = getEnabledMeasureKeys(
    data?.client?.settings?.check_in_config
  );
  const basePreset = getPreset(presetId);
  const preset = {
    ...basePreset,
    measures: basePreset.measures.filter((m) => enabledMeasureKeys.includes(m.key)),
  };

  const orgDensityDefault = data?.client?.settings?.ui_density_default;
  const userDensityOverride = data?.userPref?.ui_density;
  const density = userDensityOverride || orgDensityDefault || "compact";

  const _saveUserPref = async (fields) => {
    if (data?.userPref?.id) {
      await base44.entities.UserPreference.update(data.userPref.id, fields);
      queryClient.setQueryData(["manager-preferences", user?.email], (old) => ({
        ...old,
        userPref: { ...old?.userPref, ...fields },
      }));
    } else {
      const created = await base44.entities.UserPreference.create({
        user_email: user.email,
        ...fields,
      });
      queryClient.setQueryData(["manager-preferences", user?.email], (old) => ({
        ...old,
        userPref: created,
      }));
    }
  };

  const updateDensity = async (newDensity) => {
    try {
      await _saveUserPref({ ui_density: newDensity });
    } catch (e) {
      console.error("updateDensity error:", e);
    }
  };

  const updatePresetOverride = async (newPresetId) => {
    try {
      await _saveUserPref({ check_in_preset_override: newPresetId });
    } catch (e) {
      console.error("updatePresetOverride error:", e);
    }
  };

  return {
    preset,
    presetId: preset.id,
    orgPresetId,
    userPresetOverride,
    density,
    updateDensity,
    updatePresetOverride,
    client: data?.client || null,
    isLoading,
  };
}