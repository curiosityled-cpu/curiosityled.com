/**
 * VisibilityShareFlags — Category C Privacy Taxonomy
 *
 * Presents the manager's sharing controls across four dimensions:
 *   - Energy/load trends → their own manager
 *   - Energy/load trends → HR analytics
 *   - Goal progress → their own manager (default on)
 *   - Learning activity → HR analytics (default on)
 *
 * Raw check-in text (Category A) is ALWAYS private and never shown here.
 * This panel only controls opt-in/opt-out for aggregated signals.
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Users, BarChart3, BookOpen, Target, Info, Trophy, Brain } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_A_FIELDS = [
  "Your raw check-in text (e.g. 'biggest weight today')",
  "Your personal reflections and notes",
  "Your conversations with Atreus",
  "Identity friction signals",
  "Avoidance flags and confidence scores",
];

const TOGGLE_ITEMS = [
  {
    key: "share_energy_with_manager",
    label: "Share energy & load trends with my manager",
    sub: "Directional signals only (e.g. 'trending stretched'). Never raw check-in text.",
    icon: Users,
    iconColor: "text-blue-500",
    defaultOn: true,
    category: "Category B signal",
  },
  {
    key: "share_energy_with_hr",
    label: "Include my energy trends in HR analytics",
    sub: "Aggregated with other managers, anonymised below group thresholds. No individual identification.",
    icon: BarChart3,
    iconColor: "text-purple-500",
    defaultOn: true,
    category: "Category B signal",
  },
  {
    key: "share_weekly_focus",
    label: "Share Weekly Focus & Intentions",
    sub: "Opt-in to sharing your active weekly leadership theme or morning intentions with my manager for coaching alignment.",
    icon: Target,
    iconColor: "text-green-500",
    defaultOn: true,
    category: "Category B signal",
  },
  {
    key: "share_decision_lessons",
    label: "Share Decision Journal Lessons",
    sub: "Share completed post-mortems or outcomes of critical choices from your Decision Journal with my manager for coaching insights.",
    icon: BookOpen,
    iconColor: "text-amber-500",
    defaultOn: true,
    category: "Category C preference",
  },
  {
    key: "share_practices_with_manager",
    label: "Share Active Practices & Workouts with my manager",
    sub: "Opt-in to sharing your active developmental practices (e.g., active listening exercises) with your manager for targeted coaching support.",
    icon: Brain,
    iconColor: "text-blue-500",
    defaultOn: false,
    category: "Category B signal",
  },
];

/**
 * userEmail prop: pass directly when rendering from a legacy auth context
 * (e.g. PrivacySettings which uses @/components/useAuth).
 * When omitted, fetches from base44.auth.me() directly.
 */
export default function VisibilityShareFlags({ userEmail: userEmailProp }) {
  const [userEmail, setUserEmail] = useState(userEmailProp || null);
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState({});
  const [loading, setLoading] = useState(true);

  // Resolve email: use prop if given, else fetch from SDK
  useEffect(() => {
    if (userEmailProp) { setUserEmail(userEmailProp); return; }
    base44.auth.me().then(u => { if (u?.email) setUserEmail(u.email); }).catch(() => {});
  }, [userEmailProp]);

  useEffect(() => {
    if (!userEmail) return;
    base44.entities.TonePreference.filter({ user_email: userEmail }, null, 1)
      .then(rows => {
        setPrefs(rows[0] || {
          share_energy_with_manager: true,
          share_energy_with_hr: true,
          share_weekly_focus: true,
          share_decision_lessons: true,
          share_practices_with_manager: false,
        });
      })
      .catch(() => {
        setPrefs({
          share_energy_with_manager: true,
          share_energy_with_hr: true,
          share_weekly_focus: true,
          share_decision_lessons: true,
          share_practices_with_manager: false,
        });
      })
      .finally(() => setLoading(false));
  }, [userEmail]);

  const handleToggle = async (key) => {
    const current = prefs?.[key] ?? TOGGLE_ITEMS.find(t => t.key === key)?.defaultOn ?? false;
    const newVal = !current;

    setSaving(s => ({ ...s, [key]: true }));
    const updated = { ...prefs, [key]: newVal, visibility_last_reviewed_at: new Date().toISOString() };
    setPrefs(updated);

    try {
      if (prefs?.id) {
        await base44.entities.TonePreference.update(prefs.id, {
          [key]: newVal,
          visibility_last_reviewed_at: updated.visibility_last_reviewed_at,
        });
      } else {
        const created = await base44.entities.TonePreference.create({
          user_email: userEmail,
          [key]: newVal,
          visibility_last_reviewed_at: updated.visibility_last_reviewed_at,
        });
        setPrefs(prev => ({ ...prev, id: created.id }));
      }
      toast.success('Preference saved');
    } catch (err) {
      console.error(err);
      toast.error('Could not save preference');
      setPrefs(prev => ({ ...prev, [key]: current }));
    } finally {
      setSaving(s => ({ ...s, [key]: false }));
    }
  };

  if (loading) {
    return <div className="h-48 rounded-2xl bg-gray-100 animate-pulse" />;
  }

  return (
    <div className="space-y-5">

      {/* Controllable sharing */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#0202ff]" />
          <p className="text-sm font-semibold text-gray-900">What you can choose to share</p>
        </div>
        <div className="px-5 pb-5 space-y-3">
          {TOGGLE_ITEMS.map((item) => {
            const Icon = item.icon;
            const isOn = prefs?.[item.key] ?? item.defaultOn;
            const isSaving = saving[item.key];

            return (
              <div
                key={item.key}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                  isOn ? 'bg-[#0202ff]/3 border-[#0202ff]/15' : 'bg-gray-50 border-gray-100'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isOn ? 'bg-[#0202ff]/10' : 'bg-gray-100'
                }`}>
                  <Icon className={`w-3.5 h-3.5 ${isOn ? 'text-[#0202ff]' : item.iconColor}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.sub}</p>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => handleToggle(item.key)}
                  disabled={isSaving}
                  className={`flex-shrink-0 w-10 h-6 rounded-full transition-colors relative ${
                    isSaving ? 'opacity-50' : ''
                  } ${isOn ? 'bg-[#0202ff]' : 'bg-gray-300'}`}
                  aria-label={isOn ? 'Turn off' : 'Turn on'}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                    isOn ? 'left-5' : 'left-1'
                  }`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {prefs?.visibility_last_reviewed_at && (
        <p className="text-[10px] text-gray-400 text-center">
          Last reviewed: {new Date(prefs.visibility_last_reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}
    </div>
  );
}