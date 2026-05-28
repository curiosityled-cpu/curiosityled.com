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
import { useAuth } from "@/lib/AuthContext";
import { Shield, Users, BarChart3, BookOpen, Target, Info, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_A_FIELDS = [
  "Your raw check-in text (e.g. 'biggest weight today')",
  "Your personal reflections and notes",
  "Your conversations with Atreus",
  "Identity friction signals",
  "Avoidance flags and confidence scores",
];

const CATEGORY_B_FIELDS = [
  "Overall energy & confidence trends (directional only)",
  "Overload pattern score (0–100 composite)",
  "Delegation intent vs actuals gaps",
  "Stretch frequency over 14 days",
];

const TOGGLE_ITEMS = [
  {
    key: "share_energy_with_manager",
    label: "Share energy & load trends with my manager",
    sub: "Directional signals only (e.g. 'trending stretched'). Never raw check-in text.",
    icon: Users,
    iconColor: "text-blue-500",
    defaultOn: false,
    category: "Category B signal",
  },
  {
    key: "share_energy_with_hr",
    label: "Include my energy trends in HR analytics",
    sub: "Aggregated with other managers, anonymised below group thresholds. No individual identification.",
    icon: BarChart3,
    iconColor: "text-purple-500",
    defaultOn: false,
    category: "Category B signal",
  },
  {
    key: "share_goals_progress_with_manager",
    label: "Goal progress visible to my manager",
    sub: "Standard professional transparency — your manager can see your goal titles and progress.",
    icon: Target,
    iconColor: "text-emerald-500",
    defaultOn: true,
    category: "Standard development data",
  },
  {
    key: "share_learning_with_hr",
    label: "Learning & development activity in HR analytics",
    sub: "Programme participation, learning completions, and journey progress — standard L&D data.",
    icon: BookOpen,
    iconColor: "text-amber-500",
    defaultOn: true,
    category: "Standard development data",
  },
];

export default function VisibilityShareFlags() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    base44.entities.TonePreference.filter({ user_email: user.email }, null, 1)
      .then(rows => {
        setPrefs(rows[0] || {
          share_energy_with_manager: false,
          share_energy_with_hr: false,
          share_goals_progress_with_manager: true,
          share_learning_with_hr: true,
        });
        setLoading(false);
      });
  }, [user?.email]);

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
          user_email: user.email,
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

      {/* Always-private block */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-semibold text-gray-900">Always private — no option to share</p>
        </div>
        <div className="px-5 pb-5 space-y-1.5">
          {CATEGORY_A_FIELDS.map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-xs text-gray-600">{f}</p>
            </div>
          ))}
          <div className="mt-3 flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
            <Info className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-700 leading-relaxed">
              These fields are protected at the database level and cannot be accessed even by platform administrators.
            </p>
          </div>
        </div>
      </div>

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

      {/* What aggregated looks like */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
        <div className="flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-blue-800">What "aggregated" means in practice</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              When sharing is on, HR sees things like <em>"managers in this team averaged 'stretched' energy 60% of days last month"</em> — never your name attached to a specific check-in answer.
              Groups below 5 people are never broken out individually.
            </p>
          </div>
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