
import React, { createContext, useState, useContext, ReactNode } from 'react';

interface HighlightState {
  targetId: string | null;
  parentId?: string | null;
  tab?: string | null;
}

interface HighlightContextType {
  targetId: string | null;
  parentId: string | null;
  highlightTab: string | null;
  setHighlight: (state: HighlightState) => void;
  clearHighlight: () => void;
}

const HighlightContext = createContext<HighlightContextType | undefined>(undefined);

export const HighlightProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [highlight, setHighlight] = useState<HighlightState>({ targetId: null, parentId: null, tab: null });

  const setHighlightState = (state: HighlightState) => {
    setHighlight(state);
  };

  const clearHighlightState = () => {
    setHighlight({ targetId: null, parentId: null, tab: null });
  };

  return (
    <HighlightContext.Provider value={{
      targetId: highlight.targetId,
      parentId: highlight.parentId || null,
      highlightTab: highlight.tab || null,
      setHighlight: setHighlightState,
      clearHighlight: clearHighlightState
    }}>
      {children}
    </HighlightContext.Provider>
  );
};

export const useHighlight = (): HighlightContextType => {
  const context = useContext(HighlightContext);
  if (context === undefined) {
    throw new Error('useHighlight must be used within a HighlightProvider');
  }
  return context;
};