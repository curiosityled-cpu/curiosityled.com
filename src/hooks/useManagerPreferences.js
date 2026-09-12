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
import { getPreset, DEFAULT_PRESET_ID } from "@/lib/checkInPresets";

export function useManagerPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["manager-preferences", user?.email],
    queryFn: async () => {
      if (!user?.email) return { userPref: null, client: null };
      const [prefRows, clients] = await Promise.all([
        base44.entities.UserPreference.filter({ user_email: user.email }, null, 1).catch(() => []),
        base44.entities.Client.list().catch(() => []),
      ]);
      return {
        userPref: prefRows[0] || null,
        client: clients[0] || null,
      };
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const orgPresetId = data?.client?.settings?.check_in_config?.preset_id || DEFAULT_PRESET_ID;
  const userPresetOverride = data?.userPref?.check_in_preset_override;
  const presetId = userPresetOverride || orgPresetId;
  const preset = getPreset(presetId);

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