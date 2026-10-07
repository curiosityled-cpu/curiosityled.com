import React, { useState, useRef, useEffect } from "react";
import { Brain } from "lucide-react";

const STORAGE_KEY = "atreus-fab-pos";
const DRAG_THRESHOLD = 6;
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

export function resetAtreusButtonPosition() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export default function DraggableAtreusButton({ onClick, visible }) {
  // null = use default bottom-left position via left/bottom CSS
  const [pos, setPos] = useState(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  // Always start at the default lower-right position on mount / refresh.
  // Only clamp an in-session drag position on resize.
  useEffect(() => {
    const clampPos = () => {
      setPos((prev) => {
        if (!prev) return prev;
        return {
          x: clamp(prev.x, EDGE_MARGIN, window.innerWidth - BTN_SIZE - EDGE_MARGIN),
          y: clamp(prev.y, EDGE_MARGIN, window.innerHeight - BTN_SIZE - EDGE_MARGIN),
        };
      });
    };
    window.addEventListener("resize", clampPos);
    return () => window.removeEventListener("resize", clampPos);
  }, []);

  const onPointerDown = (e) => {
    // Capture current screen position when drag starts
    const rect = e.currentTarget.getBoundingClientRect();
    dragging.current = true;
    moved.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    startPos.current = { x: rect.left, y: rect.top };
    setPos({ x: rect.left, y: rect.top }); // switch to left/top mode
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) moved.current = true;

    const nx = clamp(startPos.current.x + dx, EDGE_MARGIN, window.innerWidth - BTN_SIZE - EDGE_MARGIN);
    const ny = clamp(startPos.current.y + dy, EDGE_MARGIN, window.innerHeight - BTN_SIZE - EDGE_MARGIN);
    setPos({ x: nx, y: ny });
  };

  const onPointerUp = (e) => {
    if (!dragging.current) return;
    dragging.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    if (moved.current) {
      // Position is kept in-session only; refresh resets to the default corner.
    } else {
      onClick?.();
    }
  };

  if (!visible) return null;

  const positionStyle = pos
    ? { left: pos.x, top: pos.y }
    : { right: 24, bottom: 24 };

  return (
    <div
      className="fixed z-[200]"
      style={{ ...positionStyle, touchAction: "none" }}
    >
      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow select-none cursor-grab active:cursor-grabbing flex items-center justify-center"
        style={{ backgroundColor: "#0202ff", touchAction: "none" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0101dd")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0202ff")}
        title="Ask Atreus — Your AI Coach (drag to move, click to open)"
      >
        <Brain className="w-6 h-6 text-white select-none pointer-events-none" />
      </button>
    </div>
  );
}