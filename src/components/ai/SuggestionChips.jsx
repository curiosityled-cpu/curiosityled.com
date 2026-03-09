import React from "react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function SuggestionChips({ suggestions, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(suggestion)}
          className="group"
        >
          <Badge
            variant="outline"
            className="cursor-pointer bg-white transition-all text-xs px-3 py-1.5 flex items-center gap-1.5"
            style={{
              borderColor: '#e5e7eb'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 67, 239, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(0, 67, 239, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          >
            {suggestion.icon && <span>{suggestion.icon}</span>}
            <span>{suggestion.text}</span>
          </Badge>
        </motion.button>
      ))}
    </div>
  );
}