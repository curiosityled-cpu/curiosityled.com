import React, { useState, useRef } from "react";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "atreus-fab-pos";
const DRAG_THRESHOLD = 6;
const EDGE_MARGIN = 8;
const BTN_SIZE = 56;

function getDefaultPos() {
  if (typeof window === "undefined") return { x: 100, y: 100 };
  return {
    x: window.innerWidth - BTN_SIZE - 24,
    y: window.innerHeight - BTN_SIZE - 120,
  };
}

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
  const [pos, setPos] = useState(() => loadSavedPos() || getDefaultPos());
  const dragging = useRef(false);
  const moved = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const onPointerDown = (e) => {
    dragging.current = true;
    moved.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    startPos.current = { ...pos };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) moved.current = true;

    let nx = startPos.current.x + dx;
    let ny = startPos.current.y + dy;
    nx = Math.max(EDGE_MARGIN, Math.min(window.innerWidth - BTN_SIZE - EDGE_MARGIN, nx));
    ny = Math.max(EDGE_MARGIN, Math.min(window.innerHeight - BTN_SIZE - EDGE_MARGIN, ny));
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

  return (
    <div
      className="fixed z-40"
      style={{
        left: pos.x,
        top: pos.y,
        touchAction: "none",
      }}
    >
      <Button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-colors select-none cursor-grab active:cursor-grabbing"
        style={{ backgroundColor: "#0202ff", touchAction: "none" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0101dd")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0202ff")}
        title="Ask Atreus - Your AI Coach (drag to move, click to open)"
      >
        <Brain className="w-6 h-6 text-white select-none pointer-events-none" />
      </Button>
    </div>
  );
}