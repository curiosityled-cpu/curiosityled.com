import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Sparkles, MessageCircle, RotateCcw, Trophy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";

/**
 * PracticeRolePlay — a conversational rehearsal where Atreus plays the
 * direct report and the manager practices the 1:1. Ends with a coaching debrief.
 *
 * Props:
 *  - open, onOpenChange
 *  - record: MeetingRecord (uses attendee_name, title, agenda_items, meeting_notes)
 */
export default function PracticeRolePlay({ open, onOpenChange, record }) {
  const [messages, setMessages] = useState([]); // { role: 'manager'|'report', text }
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [debrief, setDebrief] = useState(null);
  const [debriefLoading, setDebriefLoading] = useState(false);
  const scrollRef = useRef(null);

  const attendeeName = record?.attendee_name || "your direct report";
  const agenda = (record?.agenda_items || []).map(i => i.text).filter(Boolean);

  useEffect(() => {
    if (open) {
      setMessages([]);
      setDebrief(null);
      setInput("");
    }
  }, [open, record?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const buildSystemPrompt = () => {
    return `You are role-playing as ${attendeeName}, a direct report of the manager who is practicing this 1:1 with you (an AI coach named Atreus is running the simulation).

Stay in character as ${attendeeName} the whole time. Respond the way a real direct report would — sometimes brief, sometimes pushing back, sometimes sharing concerns or wins. Do NOT break character or mention that you are an AI. Keep each response to 1-3 short sentences, conversational and natural.

Context for this 1:1:
- Meeting: ${record?.title || '1:1 Meeting'}
- Planned agenda: ${agenda.length ? agenda.join('; ') : 'Open conversation'}
- Notes from last time: ${record?.meeting_notes ? record.meeting_notes.slice(0, 500) : 'None'}

If the manager hasn't said anything yet, open the conversation naturally as ${attendeeName} would (e.g. a quick update, a question, or waiting for the manager to start).`;
  };

  const transcriptString = () => {
    return messages.map(m => m.role === 'manager' ? `Manager: ${m.text}` : `${attendeeName}: ${m.text}`).join('\n');
  };

  const startConversation = async () => {
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `${buildSystemPrompt()}\n\nBegin the role-play now. Output ONLY ${attendeeName}'s opening line (no preamble, no quotes).`,
      });
      setMessages([{ role: 'report', text: res }]);
    } catch (e) {
      setMessages([{ role: 'report', text: "Hey, good to see you. How's your week been?" }]);
    } finally {
      setLoading(false);
    }
  };

  const sendManagerMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    const newMessages = [...messages, { role: 'manager', text: userMsg }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `${buildSystemPrompt()}\n\nConversation so far:\n${transcriptString()}\nManager: ${userMsg}\n\nNow respond as ${attendeeName}. Output ONLY ${attendeeName}'s next line (no preamble, no quotes).`,
      });
      setMessages([...newMessages, { role: 'report', text: res }]);
    } catch (e) {
      setMessages([...newMessages, { role: 'report', text: "…(no response)" }]);
    } finally {
      setLoading(false);
    }
  };

  const generateDebrief = async () => {
    setDebriefLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Atreus, a leadership coach. The manager just finished a practice 1:1 role-play with ${attendeeName}. Here is the transcript:

${transcriptString()}

Provide a concise coaching debrief (max 180 words) with three short sections:
1. "What worked" — 2-3 specific things the manager did well.
2. "What to try next time" — 2-3 concrete, specific adjustments.
3. "One question to sit with" — a single reflective question.

Be specific to what was actually said. Be direct but warm. No fluff.`,
        response_json_schema: {
          type: "object",
          properties: {
            what_worked: { type: "array", items: { type: "string" } },
            try_next: { type: "array", items: { type: "string" } },
            question: { type: "string" }
          }
        }
      });
      setDebrief(res);
    } catch (e) {
      setDebrief({ what_worked: [], try_next: [], question: "What's one thing you want to do differently in the real 1:1?" });
    } finally {
      setDebriefLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setDebrief(null);
    setInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            Practice with Atreus as {attendeeName}
          </DialogTitle>
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 space-y-3 min-h-[300px]">
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-card-foreground">Ready to rehearse?</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Atreus will play {attendeeName}. You respond as yourself. When you're done, get a coaching debrief.
              </p>
              <Button className="mt-4" size="sm" onClick={startConversation}>
                <Sparkles className="w-4 h-4 mr-1.5" /> Start the conversation
              </Button>
            </div>
          )}

          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'manager' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm ${
                m.role === 'manager'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted text-card-foreground rounded-bl-sm'
              }`}>
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mb-0.5">
                  {m.role === 'manager' ? 'You' : attendeeName}
                </p>
                {m.text}
              </div>
            </motion.div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Debrief */}
          <AnimatePresence>
            {debrief && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4 space-y-3 mt-2"
              >
                <p className="text-[11px] font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" /> Coaching Debrief
                </p>
                {debrief.what_worked?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-card-foreground mb-1">What worked</p>
                    <ul className="space-y-0.5">
                      {debrief.what_worked.map((w, i) => <li key={i} className="text-xs text-muted-foreground">• {w}</li>)}
                    </ul>
                  </div>
                )}
                {debrief.try_next?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-card-foreground mb-1">What to try next time</p>
                    <ul className="space-y-0.5">
                      {debrief.try_next.map((w, i) => <li key={i} className="text-xs text-muted-foreground">• {w}</li>)}
                    </ul>
                  </div>
                )}
                {debrief.question && (
                  <div>
                    <p className="text-xs font-semibold text-card-foreground mb-1">One question to sit with</p>
                    <p className="text-xs text-card-foreground italic">{debrief.question}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input / controls */}
        {!debrief && messages.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendManagerMessage()}
              placeholder="Respond as yourself…"
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button size="icon" onClick={sendManagerMessage} disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2">
          {messages.length > 0 && !debrief && (
            <>
              <Button variant="ghost" size="sm" onClick={reset} disabled={loading}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Restart
              </Button>
              <Button size="sm" onClick={generateDebrief} disabled={debriefLoading || messages.length < 2}>
                {debriefLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Trophy className="w-3.5 h-3.5 mr-1.5" />}
                End & get debrief
              </Button>
            </>
          )}
          {debrief && (
            <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}