import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import type { Lead } from '../types';

export interface TVMessage {
  lead: Lead;
  welcomeMessage: string;
}

interface TVMessageContextType {
  message: TVMessage | null;
  showMessage: (lead: Lead, welcomeMessage: string) => void;
  clearMessage: () => void;
}

const TVMessageContext = createContext<TVMessageContextType | undefined>(undefined);

export const TVMessageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState<TVMessage | null>(null);

  const showMessage = useCallback((lead: Lead, welcomeMessage: string) => {
    setMessage({ lead, welcomeMessage });
  }, []);

  const clearMessage = useCallback(() => {
    setMessage(null);
  }, []);

  const value = { message, showMessage, clearMessage };

  return (
    <TVMessageContext.Provider value={value}>
      {children}
    </TVMessageContext.Provider>
  );
};

export const useTVMessage = (): TVMessageContextType => {
  const context = useContext(TVMessageContext);
  if (context === undefined) {
    throw new Error('useTVMessage must be used within a TVMessageProvider');
  }
  return context;
};
