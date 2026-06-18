import React, { createContext, useContext, useState, useCallback } from "react";

/**
 * AtreusContext — global context that lets any component in the tree
 * open the Atreus chat and pre-load a context payload + starter message.
 */

const AtreusContext = createContext({
  openWithContext: () => {},
  isOpen: false,
  pendingContext: null,
  pendingMessage: null,
  draftMessage: null,
  close: () => {},
  clearPending: () => {},
  emitCardFocus: () => {},
  lastCardFocus: null,
});

export function AtreusProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingContext, setPendingContext] = useState(null);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [draftMessage, setDraftMessage] = useState(null);
  const [lastCardFocus, setLastCardFocus] = useState(null);

  const openWithContext = useCallback(({ context = {}, starterMessage = null, draftMessage: draft = null } = {}) => {
    console.log("Atreus openWithContext called", { context, starterMessage, draft });
    const mergedContext = {
      ...context,
      starter_message: starterMessage
    };
    setPendingContext(mergedContext);
    setPendingMessage(starterMessage);
    setDraftMessage(draft);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setPendingContext(null);
    setDraftMessage(null);
  }, []);

  const clearPending = useCallback(() => {
    setPendingContext(null);
    setPendingMessage(null);
    setDraftMessage(null);
  }, []);

  // Pillar 4: card-level focus emission
  // action: 'expanded' | 'cta_clicked' | 'dismissed' | 'dwell'
  const emitCardFocus = useCallback(({ card_id, action, card_data = {} } = {}) => {
    const event = { card_id, action, card_data, emitted_at: new Date().toISOString() };
    setLastCardFocus(event);
    // If Atreus is already open, enrich the pending context with the card focus
    if (isOpen) {
      setPendingContext(prev => ({ ...(prev || {}), focused_card: card_id, last_card_action: action, card_data }));
    }
  }, [isOpen]);

  return (
    <AtreusContext.Provider value={{ openWithContext, isOpen, pendingContext, pendingMessage, draftMessage, close, clearPending, emitCardFocus, lastCardFocus }}>
      {children}
    </AtreusContext.Provider>
  );
}

export function useAtreusChat() {
  return useContext(AtreusContext);
}