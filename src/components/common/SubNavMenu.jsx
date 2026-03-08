import React, { useState, useRef, useEffect } from "react";
import { Menu, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

/**
 * SubNavMenu - Hamburger menu for section subtabs
 * @param {Array} items - Array of menu items with { id, label, icon }
 * @param {string} activeId - Currently active item id
 * @param {Function} onItemClick - Callback when an item is clicked
 * @param {string} variant - "header" (white text on dark) or "content" (dark text on light). Default: "header"
 * @param {string} label - Optional label to display before the hamburger icon
 */
export default function SubNavMenu({ items, activeId, onItemClick, variant = "header", label }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleItemClick = (item) => {
    onItemClick(item.id);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        className={variant === "header" ? "text-white hover:bg-white/20" : "text-gray-700 hover:bg-gray-100"}
        title="Navigation menu"
      >
        {label && (
          <span className="mr-2 text-sm font-medium">{label}</span>
        )}
        <Menu className="w-5 h-5" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
          >
            <div className="py-2">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeId;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className={isActive ? 'font-medium' : 'font-normal'}>
                        {item.label}
                      </span>
                    </div>
                    {isActive && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}