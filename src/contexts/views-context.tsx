'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Eye, type LucideIcon } from 'lucide-react';
import type { Polygon } from '@/components/admin/image-editor';

export interface View {
  id: string;
  name: string;
  icon: LucideIcon;
  href: string;
  imageUrl?: string;
  selections?: Polygon[];
}

interface ViewsContextType {
  views: View[];
  getView: (viewId: string) => View | undefined;
  addView: (viewName: string) => string;
  deleteView: (viewId: string) => void;
  updateViewImage: (viewId: string, imageUrl: string) => void;
  updateViewSelections: (viewId: string, selections: Polygon[]) => void;
}

const ViewsContext = createContext<ViewsContextType | undefined>(undefined);

export function ViewsProvider({ children, projectId }: { children: ReactNode; projectId: string }) {
  const [views, setViews] = useState<View[]>([]);

  const getView = useCallback((viewId: string) => {
    return views.find(v => v.id === viewId);
  }, [views]);

  const updateViewImage = useCallback((viewId: string, imageUrl: string) => {
    setViews(prevViews =>
      prevViews.map(view =>
        view.id === viewId ? { ...view, imageUrl } : view
      )
    );
  }, []);
  
  const updateViewSelections = useCallback((viewId: string, selections: Polygon[]) => {
    setViews(prevViews =>
      prevViews.map(view =>
        view.id === viewId ? { ...view, selections } : view
      )
    );
  }, []);

  const addView = useCallback((viewName: string): string => {
    const slug = viewName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newView: View = {
      id: slug,
      name: viewName,
      icon: Eye, // Default icon for new views
      href: `/admin/projects/${projectId}/views/${slug}`,
    };
    
    setViews(prevViews => {
        // Prevent adding duplicate views
        if (prevViews.some(v => v.id === slug)) {
            // Maybe show a toast message here in the future
            return prevViews;
        }
        return [...prevViews, newView];
    });

    return newView.href;
  }, [projectId]);

  const deleteView = useCallback((viewId: string) => {
    setViews(prevViews => prevViews.filter(view => view.id !== viewId));
  }, []);

  return (
    <ViewsContext.Provider value={{ views, getView, addView, deleteView, updateViewImage, updateViewSelections }}>
      {children}
    </ViewsContext.Provider>
  );
}

export function useViews() {
  const context = useContext(ViewsContext);
  if (context === undefined) {
    throw new Error('useViews must be used within a ViewsProvider');
  }
  return context;
}
