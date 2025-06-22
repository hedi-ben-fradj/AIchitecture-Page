'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode, useEffect } from 'react';
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
  landingPageViewId: string | null;
  getView: (viewId: string) => View | undefined;
  addView: (viewName: string) => string;
  deleteView: (viewId: string) => void;
  updateViewImage: (viewId: string, imageUrl: string) => void;
  updateViewSelections: (viewId: string, selections: Polygon[]) => void;
  setLandingPageViewId: (viewId: string | null) => void;
}

const ViewsContext = createContext<ViewsContextType | undefined>(undefined);

export function ViewsProvider({ children, projectId }: { children: ReactNode; projectId: string }) {
  const getStorageKey = useCallback(() => `project-data-${projectId}`, [projectId]);

  const [views, setViews] = useState<View[]>([]);
  const [landingPageViewId, setLandingPageViewIdState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(getStorageKey());
      if (item) {
        const data = JSON.parse(item);
        setViews(data.views || []);
        setLandingPageViewIdState(data.landingPageViewId || null);
      }
    } catch (error) {
      console.error("Failed to load data from storage", error);
    }
    setIsLoaded(true);
  }, [projectId, getStorageKey]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      const data = JSON.stringify({ views, landingPageViewId });
      window.localStorage.setItem(getStorageKey(), data);
    } catch (error) {
      console.error("Failed to save data to storage", error);
    }
  }, [views, landingPageViewId, getStorageKey, isLoaded]);

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
      icon: Eye,
      href: `/admin/projects/${projectId}/views/${slug}`,
    };
    
    setViews(prevViews => {
        if (prevViews.some(v => v.id === slug)) {
            return prevViews;
        }
        return [...prevViews, newView];
    });

    return newView.href;
  }, [projectId]);

  const deleteView = useCallback((viewId: string) => {
    setViews(prevViews => prevViews.filter(view => view.id !== viewId));
    setLandingPageViewIdState(prevId => prevId === viewId ? null : prevId);
  }, []);

  const setLandingPageViewId = useCallback((viewId: string | null) => {
    setLandingPageViewIdState(viewId);
  }, []);

  return (
    <ViewsContext.Provider value={{ views, landingPageViewId, setLandingPageViewId, getView, addView, deleteView, updateViewImage, updateViewSelections }}>
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
