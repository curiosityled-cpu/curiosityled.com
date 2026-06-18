/**
 * AtreusProactiveNudge — Floating banner shown when the orchestrator has
 * a pending insight for the current user. Clicking it opens Atreus with
 * the insight pre-populated as the starter message.
 *
 * Positioned above the Atreus FAB. Auto-dismisses after 30s if ignored.
 */
import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AtreusProactiveNudge({ insight, onOpen, onDismiss }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (insight) {
      // Auto-dismiss after 30 seconds
      timerRef.current = setTimeout(() => {
        onDismiss?.(insight.id);
      }, 30000);
    }
    return () => clearTimeout(timerRef.current);
  }, [insight?.id]);

  return (
    <AnimatePresence>
      {insight && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="fixed right-6 z-40 max-w-[300px] bg-white border rounded-2xl shadow-xl overflow-hidden"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom) + 9rem)',
            borderColor: 'rgba(2, 2, 255, 0.25)',
          }}
        >
          {/* Header strip */}
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ backgroundColor: 'rgba(2, 2, 255, 0.06)' }}
          >
            <div className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" style={{ color: '#0202ff' }} />
              <span className="text-xs font-semibold" style={{ color: '#0202ff' }}>
                Atreus
              </span>
              <Sparkles className="w-2.5 h-2.5 text-yellow-400" />
            </div>
            <button
              onClick={() => onDismiss?.(insight.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Message */}
          <div className="px-3 py-2.5">
            <p className="text-xs text-gray-700 leading-relaxed line-clamp-3">
              {insight.message}
            </p>
          </div>

          {/* Action */}
          <div className="px-3 pb-3">
            <Button
              size="sm"
              className="w-full text-xs text-white h-8 rounded-xl"
              style={{ backgroundColor: '#0202ff' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0101dd'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0202ff'}
              onClick={() => {
                onOpen?.(insight);
                onDismiss?.(insight.id);
              }}
            >
              Talk with Atreus →
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}