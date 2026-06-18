/**
 * useAtreusMemoryWriter — Phase 2: Memory write after every message exchange
 *
 * Call writeMemory(messages) after each assistant response to persist
 * a structured memory patch derived from the conversation.
 *
 * This is a lightweight write — it doesn't do full LLM synthesis
 * (that's Phase 2+ / scheduled compression). It just patches
 * key scalar fields: last_seen_at, last_page, recent_topics.
 */
import { useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export function useAtreusMemoryWriter({ userEmail, pageType }) {
  const pendingWrite = useRef(null);
  const lastWrittenCount = useRef(0);

  const writeMemory = useCallback(async (messages) => {
    if (!userEmail || !messages?.length) return;
    // Only write if at least one new message since last write
    if (messages.length <= lastWrittenCount.current) return;

    // Debounce: clear pending, schedule new write in 3 seconds
    if (pendingWrite.current) clearTimeout(pendingWrite.current);

    pendingWrite.current = setTimeout(async () => {
      try {
        // Extract recent topics from last 4 messages
        const recentMessages = messages.slice(-4).filter(m => m.role === 'user');
        const recent_topics = recentMessages
          .map(m => (m.content || '').slice(0, 80))
          .filter(Boolean);

        // Build a minimal patch — no LLM call, just structured fields
        const patch = {
          last_seen_at: new Date().toISOString(),
          last_page_visited: pageType || 'unknown',
          recent_topics,
          session_message_count: messages.length,
        };

        // Check if conversation contains any high-signal keywords
        const allText = messages.map(m => m.content || '').join(' ').toLowerCase();
        if (allText.includes('delegat')) patch.delegation_discussed = true;
        if (allText.includes('difficult conversation') || allText.includes('hard conversation')) patch.difficult_conversation_discussed = true;
        if (allText.includes('overload') || allText.includes('too much')) patch.overload_discussed = true;
        if (allText.includes('confidence') || allText.includes('uncertain')) patch.confidence_discussed = true;

        // Upsert ManagerMemory
        const existing = await base44.entities.ManagerMemory.filter(
          { user_email: userEmail }, null, 1
        );

        if (existing[0]) {
          await base44.entities.ManagerMemory.update(existing[0].id, patch);
        } else {
          await base44.entities.ManagerMemory.create({ user_email: userEmail, ...patch });
        }

        lastWrittenCount.current = messages.length;
      } catch (e) {
        // Memory writes are non-blocking — never surface errors to the user
        console.warn('AtreusMemoryWriter: write failed', e?.message);
      }
    }, 3000);
  }, [userEmail, pageType]);

  return { writeMemory };
}