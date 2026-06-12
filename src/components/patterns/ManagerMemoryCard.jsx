/**
 * ManagerMemoryCard — Surfaces what Atreus has synthesized about this manager over time.
 * Reads from ManagerMemory entity. Lives on the Patterns page.
 */
import React, { useState } from "react";
import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function MemoryList({ items, emptyText }) {
  if (!items?.length) return <p className="text-xs text-muted-foreground italic">{emptyText}</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-foreground leading-relaxed">
          <span className="mt-1.5 w-1 h-1 rounded-full bg-[#0202ff]/40 flex-shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function ManagerMemoryCard({ memory }) {
  const [expanded, setExpanded] = useState(false);

  if (!memory) return null;

  const hasContent =
    memory.recurring_triggers?.length ||
    memory.what_has_helped?.length ||
    memory.stuck_points?.length ||
    memory.pressure_responses?.length;

  if (!hasContent) return null;

  const synthesizedDate = memory.last_synthesized_at
    ? new Date(memory.last_synthesized_at).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' })
    : null;

  return (
    <Card className="shadow-sm border border-[#0202ff]/15 bg-card rounded-2xl overflow-hidden">
      <button
        className="w-full px-5 pt-5 pb-4 flex items-start justify-between text-left hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center flex-shrink-0">
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-card-foreground">What Atreus remembers about you</p>
            {synthesizedDate && (
              <p className="text-[10px] text-muted-foreground">Synthesized from your check-ins · Updated {synthesizedDate}</p>
            )}
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        }
      </button>

      {expanded && (
        <CardContent className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            This is private to you — a living summary of patterns Atreus has noticed across your check-ins, reflections, and decisions. It informs how Atreus coaches you, but is never shared.
          </p>

          {memory.recurring_triggers?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-2">Recurring triggers</p>
              <MemoryList items={memory.recurring_triggers} />
            </div>
          )}

          {memory.what_has_helped?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">What's helped before</p>
              <MemoryList items={memory.what_has_helped} />
            </div>
          )}

          {memory.stuck_points?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[#0202ff] uppercase tracking-wide mb-2">Where you tend to get stuck</p>
              <MemoryList items={memory.stuck_points} />
            </div>
          )}

          {memory.pressure_responses?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-purple-700 uppercase tracking-wide mb-2">How you tend to respond under pressure</p>
              <MemoryList items={memory.pressure_responses} />
            </div>
          )}

          {memory.synthesis_count > 0 && (
            <p className="text-[10px] text-muted-foreground">
              Built from {memory.synthesis_count} synthesis{memory.synthesis_count !== 1 ? 'es' : ''} · Private to you
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}