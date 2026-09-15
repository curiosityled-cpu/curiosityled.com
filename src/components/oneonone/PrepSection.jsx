import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList, Wand2, Loader2, Sparkles, CheckCircle2, Circle,
  Plus, MessageCircle, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AttendeeSelector from "./AttendeeSelector";
import { base44 } from "@/api/base44Client";

/**
 * PrepSection — standalone 1:1 preparation area.
 * Pick who you're meeting, build an agenda (with AI suggestions),
 * and rehearse the conversation with Atreus.
 *
 * Props:
 *  - record: MeetingRecord | null
 *  - directReports, rollupReports
 *  - onCreate(attendee)        — hub creates a new record
 *  - onUpdate(patch)           — hub updates the current record
 *  - onPractice()              — hub opens the role-play modal
 */
export default function PrepSection({ record, directReports = [], rollupReports = [], onCreate, onUpdate, onPractice }) {
  const [newAgendaText, setNewAgendaText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);

  const attendee = {
    email: record?.employee_email || "",
    name: record?.attendee_name || "",
    isUser: false,
  };

  const handleAttendeeChange = (v) => {
    if (!record) {
      onCreate(v);
    } else {
      onUpdate({ attendee_name: v.name || "", employee_email: v.email || "" });
    }
  };

  const generateAgendaSuggestions = async () => {
    setAiLoading(true);
    setAiSuggestions(null);
    try {
      const openCommitments = (record?.commitments || []).filter(c => c.status === "open").map(c => c.action);
      const prompt = `You are a leadership coach helping a manager prepare for a 1:1 meeting. Suggest 4-5 relevant agenda items.

Meeting: ${record?.title || "1:1 Meeting"}
With: ${record?.attendee_name || "Direct report"}
Existing notes: ${record?.meeting_notes || "None yet"}
Open commitments from last time: ${openCommitments.length ? openCommitments.join("; ") : "None"}

Return practical, conversational agenda items that a manager would actually discuss — for example: "Review progress on [X]", "Check in on workload and energy", "Discuss upcoming priorities", "Get feedback on my communication style". Keep each item to one short sentence.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: { items: { type: "array", items: { type: "string" } } },
        },
      });
      setAiSuggestions(res.items || []);
    } catch (e) {
      console.error("AI agenda suggestions failed:", e);
    } finally {
      setAiLoading(false);
    }
  };

  const addSuggestedItem = (text) => {
    const items = [...(record?.agenda_items || []), { id: crypto.randomUUID(), text, completed: false }];
    onUpdate({ agenda_items: items });
    setAiSuggestions((prev) => (prev ? prev.filter((s) => s !== text) : null));
  };

  const addAgendaItem = () => {
    if (!newAgendaText.trim() || !record) return;
    const items = [...(record.agenda_items || []), { id: crypto.randomUUID(), text: newAgendaText.trim(), completed: false }];
    onUpdate({ agenda_items: items });
    setNewAgendaText("");
  };

  const toggleAgendaItem = (id) => {
    const items = (record?.agenda_items || []).map((i) => (i.id === id ? { ...i, completed: !i.completed } : i));
    onUpdate({ agenda_items: items });
  };

  const removeAgendaItem = (id) => {
    const items = (record?.agenda_items || []).filter((i) => i.id !== id);
    onUpdate({ agenda_items: items });
  };

  const hasRecord = !!record;
  const agendaItems = record?.agenda_items || [];

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/30">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-card-foreground">Prep</h2>
          <p className="text-[11px] text-muted-foreground">Pick who you're meeting, build your agenda, rehearse with Atreus.</p>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Attendee */}
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Who is this 1:1 with?
          </label>
          <AttendeeSelector
            value={attendee}
            onChange={handleAttendeeChange}
            directReports={directReports}
            rollupReports={rollupReports}
          />
        </div>

        {/* Agenda */}
        <div className={hasRecord ? "" : "opacity-50 pointer-events-none"}>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Agenda
            </label>
            <Button
              size="sm"
              variant="ghost"
              onClick={generateAgendaSuggestions}
              disabled={aiLoading || !hasRecord}
              className="h-7 text-[11px] text-[#0202ff] hover:bg-[#0202ff]/5 px-2"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Wand2 className="w-3 h-3 mr-1" /> Suggest agenda
                </>
              )}
            </Button>
          </div>

          {/* AI suggestions */}
          <AnimatePresence>
            {aiSuggestions && aiSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mb-2 rounded-xl border border-[#0202ff]/20 bg-[#0202ff]/5 dark:bg-[#0202ff]/10 p-3 space-y-1.5">
                  <p className="text-[10px] font-semibold text-[#0202ff] uppercase tracking-wide flex items-center gap-1 mb-1">
                    <Sparkles className="w-3 h-3" /> Suggested by AI
                  </p>
                  {aiSuggestions.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 group">
                      <Plus className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-card-foreground flex-1">{item}</span>
                      <button
                        onClick={() => addSuggestedItem(item)}
                        className="text-[10px] font-medium text-[#0202ff] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                  <button onClick={() => setAiSuggestions(null)} className="text-[10px] text-muted-foreground hover:text-foreground mt-1">
                    Dismiss
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            {agendaItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 group">
                <button onClick={() => toggleAgendaItem(item.id)} className="flex-shrink-0">
                  {item.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                <span className={`text-sm flex-1 ${item.completed ? "line-through text-muted-foreground" : "text-card-foreground"}`}>
                  {item.text}
                </span>
                <button
                  onClick={() => removeAgendaItem(item.id)}
                  className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newAgendaText}
                onChange={(e) => setNewAgendaText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAgendaItem()}
                placeholder={hasRecord ? "Add a topic to discuss…" : "Select someone above to start prepping"}
                disabled={!hasRecord}
                className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed"
              />
              <Button size="sm" variant="outline" onClick={addAgendaItem} disabled={!hasRecord || !newAgendaText.trim()}>
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Practice */}
        {hasRecord && record.attendee_name && (
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onPractice}
              className="text-[#0202ff] border-[#0202ff]/30 hover:bg-[#0202ff]/5"
            >
              <MessageCircle className="w-4 h-4 mr-1.5" /> Practice this 1:1 with Atreus
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}