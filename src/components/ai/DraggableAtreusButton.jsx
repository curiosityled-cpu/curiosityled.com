import React, { useState, useRef } from "react";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const STORAGE_KEY = "atreus-fab-pos";
const DRAG_THRESHOLD = 6; // px of movement before it counts as a drag, not a click
const EDGE_MARGIN = 8;
const BTN_SIZE = 56;

function loadSavedPos() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const p = JSON.parse(saved);
      if (typeof p?.x === "number" && typeof p?.y === "number") return p;
    }
  } catch {}
  return null;
}

export default function DraggableAtreusButton({ onClick, visible }) {
  const [pos, setPos] = useState(loadSavedPos);
  const dragging = useRef(false);
  const moved = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const offset = useRef({ x: 0, y: 0 });
  const baseRect = useRef({ left: 0, top: 0 });

  const onPointerDown = (e) => {
    dragging.current = true;
    moved.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    const base = pos || { x: 0, y: 0 };
    offset.current = { x: base.x, y: base.y };
    const rect = e.currentTarget.getBoundingClientRect();
    baseRect.current = { left: rect.left - base.x, top: rect.top - base.y };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) moved.current = true;

    let nx = offset.current.x + dx;
    let ny = offset.current.y + dy;
    // Clamp so the button stays within the viewport
    const minLeft = EDGE_MARGIN - baseRect.current.left;
    const maxLeft = window.innerWidth - EDGE_MARGIN - BTN_SIZE - baseRect.current.left;
    const minTop = EDGE_MARGIN - baseRect.current.top;
    const maxTop = window.innerHeight - EDGE_MARGIN - BTN_SIZE - baseRect.current.top;
    nx = Math.max(minLeft, Math.min(maxLeft, nx));
    ny = Math.max(minTop, Math.min(maxTop, ny));
    setPos({ x: nx, y: ny });
  };

  const onPointerUp = (e) => {
    if (!dragging.current) return;
    dragging.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    if (moved.current) {
      setPos((p) => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
        return p;
      });
    } else {
      onClick?.();
    }
  };

  if (!visible) return null;

  const transform = pos ? `translate(${pos.x}px, ${pos.y}px)` : undefined;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className="fixed right-6 z-40"
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)",
        transform,
        touchAction: "none",
      }}
    >
      <Button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-colors select-none cursor-grab active:cursor-grabbing"
        style={{ backgroundColor: "#0202ff" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0101dd")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0202ff")}
        title="Ask Atreus - Your AI Coach (drag to move, click to open)"
      >
        <Brain className="w-6 h-6 text-white select-none pointer-events-none" />
      </Button>
    </motion.div>
  );
}