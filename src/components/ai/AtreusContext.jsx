import React, { createContext, useContext, useState, useCallback } from "react";

/**
 * AtreusContext — global context that lets any component in the tree
 * open the Atreus chat and pre-load a context payload + starter message.
 */

const AtreusContext = createContext({
  openWithContext: () => {},
  isOpen: false,
  pendingContext: null,
  close: () => {},
  clearPending: () => {},
});

export function AtreusProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingContext, setPendingContext] = useState(null);

  const openWithContext = useCallback((contextPayload = {}) => {
    setPendingContext(contextPayload);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearPending = useCallback(() => {
    setPendingContext(null);
  }, []);

  return (
    <AtreusContext.Provider value={{ openWithContext, isOpen, pendingContext, close, clearPending }}>
      {children}
    </AtreusContext.Provider>
  );
}

export function useAtreusChat() {
  return useContext(AtreusContext);
}