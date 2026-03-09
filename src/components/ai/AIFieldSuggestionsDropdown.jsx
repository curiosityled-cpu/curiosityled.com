import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Dropdown component that displays AI-powered field suggestions
 * Positions itself relative to the input field
 */
export default function AIFieldSuggestionsDropdown({
  suggestions = [],
  loading = false,
  onSelect,
  onDismiss,
  anchorRef,
  className
}) {
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        anchorRef?.current &&
        !anchorRef.current.contains(event.target)
      ) {
        onDismiss?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onDismiss, anchorRef]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onDismiss?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  if (!loading && (!suggestions || suggestions.length === 0)) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "absolute z-50 mt-1 w-full bg-white border-2 rounded-lg shadow-xl overflow-hidden",
          className
        )}
        style={{ 
          borderColor: '#A25DDC',
          maxHeight: '320px'
        }}
      >
        {/* Header */}
        <div 
          className="px-3 py-2 flex items-center gap-2 border-b"
          style={{ 
            background: 'linear-gradient(to right, #faf5ff, #eff6ff)',
            borderBottomColor: '#e9d5ff'
          }}
        >
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-medium text-gray-700">AI Suggestions</span>
          {loading && <Loader2 className="w-3 h-3 animate-spin text-purple-600 ml-auto" />}
        </div>

        {/* Suggestions List */}
        <div className="overflow-y-auto max-h-64">
          {loading && suggestions.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
              Generating suggestions...
            </div>
          ) : (
            <div className="py-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => onSelect(suggestion)}
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-purple-50 transition-colors flex items-start gap-2 group"
                >
                  <Lightbulb className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0 group-hover:text-purple-600" />
                  <span className="text-gray-700 group-hover:text-gray-900 flex-1">
                    {suggestion}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Hint */}
        {!loading && suggestions.length > 0 && (
          <div 
            className="px-3 py-1.5 text-xs text-gray-500 border-t"
            style={{ borderTopColor: '#e9d5ff' }}
          >
            Click to use • Press Esc to dismiss
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}