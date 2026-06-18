import React, { createContext, useContext, useState, useCallback } from "react";
// Phase 3: orchestratorData can be injected into context from any page

/**
 * AtreusContext — global context that lets any component in the tree
 * open the Atreus chat and pre-load a context payload + starter message.
 */

const AtreusContext = createContext({
  openWithContext: () => {},
  openWithOrchestrator: () => {},
  isOpen: false,
  pendingContext: null,
  pendingMessage: null,
  draftMessage: null,
  orchestratorData: null,
  close: () => {},
  clearPending: () => {},
});

export function AtreusProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingContext, setPendingContext] = useState(null);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [draftMessage, setDraftMessage] = useState(null);
  const [orchestratorData, setOrchestratorData] = useState(null);

  // Phase 3: openWithOrchestrator — enriches context with orchestrator payload
  const openWithOrchestrator = useCallback(({ orchestratorResult, page, starterMessage = null } = {}) => {
    const mergedContext = {
      pageType: page,
      orchestrator_mode: orchestratorResult?.mode,
      orchestrator_signals: orchestratorResult?.signals,
      signal_score: orchestratorResult?.signal_score,
      situation: orchestratorResult?.situation,
      suggested_actions: orchestratorResult?.suggested_actions,
      starter_message: starterMessage || orchestratorResult?.opening_message,
    };
    setOrchestratorData(orchestratorResult);
    setPendingContext(mergedContext);
    setPendingMessage(starterMessage || orchestratorResult?.opening_message || null);
    setIsOpen(true);
  }, []);

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

  return (
    <AtreusContext.Provider value={{ openWithContext, openWithOrchestrator, isOpen, pendingContext, pendingMessage, draftMessage, orchestratorData, close, clearPending }}>
      {children}
    </AtreusContext.Provider>
  );
}

export function useAtreusChat() {
  return useContext(AtreusContext);
}