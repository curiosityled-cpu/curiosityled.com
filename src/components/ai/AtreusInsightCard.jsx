import React from "react";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAtreusChat } from "@/components/ai/AtreusContext";

/**
 * AtreusInsightCard — reusable contextual Atreus recommendation card.
 *
 * Props:
 *   title                    string   — card headline
 *   insight                  string   — short insight text
 *   recommended_action       string   — one-line recommended action
 *   primary_cta_label        string   — label for the primary button (opens Atreus)
 *   secondary_cta_label      string   — label for the secondary button
 *   context_payload          object   — context passed into Atreus when primary CTA clicked
 *   secondary_context_payload object  — if provided, secondary CTA opens Atreus with this context
 *                                       instead of acting as a dismiss button
 *   onDismiss                fn       — optional dismiss handler (shows X and dismiss button
 *                                       when secondary_context_payload is NOT provided)
 *   className                string   — optional wrapper class
 */
export default function AtreusInsightCard({
  title,
  insight,
  recommended_action,
  primary_cta_label = "Explore with Atreus",
  secondary_cta_label = "Dismiss",
  context_payload = {},
  secondary_context_payload = null,
  onDismiss,
  className = "",
}) {
  const { openWithContext } = useAtreusChat();

  // Don't render if there's nothing meaningful to show
  if (!title && !insight && !recommended_action) return null;

  const handlePrimary = () => {
    openWithContext(context_payload);
  };

  const handleSecondary = () => {
    if (secondary_context_payload) {
      openWithContext(secondary_context_payload);
    } else if (onDismiss) {
      onDismiss();
    }
  };

  // Show the secondary button if we have a secondary context OR a dismiss handler
  const showSecondaryBtn = secondary_context_payload != null || onDismiss != null;

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden ${className}`}
      style={{ borderColor: "rgba(2,2,255,0.18)", background: "linear-gradient(135deg, rgba(2,2,255,0.04) 0%, rgba(2,2,255,0.01) 100%)" }}
    >
      {/* Accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: "#0202ff" }} />

      <div className="pl-5 pr-4 py-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#0202ff" }} />
            {title && (
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#0202ff" }}>
                {title}
              </p>
            )}
          </div>
          {onDismiss && !secondary_context_payload && (
            <button
              onClick={onDismiss}
              className="p-0.5 rounded-md text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Insight */}
        {insight && (
          <p className="text-sm text-gray-700 leading-relaxed mb-2">{insight}</p>
        )}

        {/* Recommended action */}
        {recommended_action && (
          <div className="flex items-start gap-1.5 mb-3">
            <span className="text-xs font-semibold text-gray-500 flex-shrink-0 mt-0.5">Suggested:</span>
            <span className="text-xs text-gray-700 leading-relaxed">{recommended_action}</span>
          </div>
        )}

        {/* CTAs */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={handlePrimary}
            className="h-7 text-xs text-white px-3 gap-1"
            style={{ backgroundColor: "#0202ff" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0101dd")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0202ff")}
          >
            {primary_cta_label}
            <ArrowRight className="w-3 h-3" />
          </Button>
          {showSecondaryBtn && (
            secondary_context_payload ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSecondary}
                className="h-7 text-xs px-3 gap-1 border-gray-300 text-gray-600 hover:text-gray-900"
              >
                {secondary_cta_label}
              </Button>
            ) : (
              <button
                onClick={handleSecondary}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {secondary_cta_label}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}