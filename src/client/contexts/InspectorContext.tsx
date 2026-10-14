import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type InspectedItemType = 'entry' | 'paper' | 'task' | 'resource';

export interface InspectedItem {
  id: string;
  type: InspectedItemType;
  title: string;
  subtitle?: string;
  content?: string;
  date?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: string;
  project_id?: string;
  projectName?: string;
  authors?: string[];
  doi?: string;
  venue?: string;
  citations?: number;
  year?: string | number;
  pdfUrl?: string;
  url?: string;
  metadata?: Record<string, any>;
  onStatusChange?: (newStatus: string) => void | Promise<void>;
  onEdit?: () => void;
  onDelete?: () => void;
}

export type InspectorTab = 'overview' | 'notes' | 'citations' | 'ai';

interface InspectorContextType {
  isOpen: boolean;
  item: InspectedItem | null;
  activeTab: InspectorTab;
  setActiveTab: (tab: InspectorTab) => void;
  openInspector: (item: InspectedItem, initialTab?: InspectorTab) => void;
  closeInspector: () => void;
  toggleInspector: () => void;
}

const InspectorContext = createContext<InspectorContextType | undefined>(undefined);

export function InspectorProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [item, setItem] = useState<InspectedItem | null>(null);
  const [activeTab, setActiveTab] = useState<InspectorTab>('overview');

  const openInspector = useCallback((newItem: InspectedItem, initialTab: InspectorTab = 'overview') => {
    setItem(newItem);
    setActiveTab(initialTab);
    setIsOpen(true);
  }, []);

  const closeInspector = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleInspector = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Keyboard shortcut: Esc to close inspector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeInspector();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeInspector]);

  return (
    <InspectorContext.Provider
      value={{
        isOpen,
        item,
        activeTab,
        setActiveTab,
        openInspector,
        closeInspector,
        toggleInspector,
      }}
    >
      {children}
    </InspectorContext.Provider>
  );
}

export function useInspector() {
  const context = useContext(InspectorContext);
  if (!context) {
    throw new Error('useInspector must be used within an InspectorProvider');
  }
  return context;
}
