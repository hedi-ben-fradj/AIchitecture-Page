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

// Helper type for what's stored in the main project data key
type ViewMetadata = Omit<View, 'icon' | 'imageUrl' | 'selections'>;

export function ViewsProvider({ children, projectId }: { children: ReactNode; projectId: string }) {
  const getStorageKey = useCallback((key: string) => `project-${projectId}-${key}`, [projectId]);

  const [isMounted, setIsMounted] = useState(false);
  const [views, setViews] = useState<View[]>([]);
  const [landingPageViewId, setLandingPageViewIdState] = useState<string | null>(null);

  // Load initial data from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const projectDataStr = window.localStorage.getItem(getStorageKey('data'));
        let initialViews: View[] = [];
        let initialLandingId: string | null = null;
        
        if (projectDataStr) {
            const projectData = JSON.parse(projectDataStr);
            initialLandingId = projectData.landingPageViewId || null;
            const viewMetadatas: ViewMetadata[] = projectData.views || [];
            
            initialViews = viewMetadatas.map((meta) => {
                const imageUrl = window.localStorage.getItem(getStorageKey(`view-image-${meta.id}`)) || undefined;
                const selectionsStr = window.localStorage.getItem(getStorageKey(`view-selections-${meta.id}`));
                const selections = selectionsStr ? JSON.parse(selectionsStr) : undefined;

                return {
                    ...meta,
                    icon: Eye,
                    imageUrl,
                    selections,
                };
            });
        }
        setViews(initialViews);
        setLandingPageViewIdState(initialLandingId);
      } catch (error) {
        console.error("Failed to load views from storage", error);
        setViews([]);
        setLandingPageViewIdState(null);
      }
      setIsMounted(true);
    }
  }, [getStorageKey]);

  // Helper to save only the metadata
  const saveProjectMetadata = useCallback((updatedViews: View[], updatedLandingId: string | null) => {
    if (typeof window !== 'undefined') {
        try {
            const viewsToStore: ViewMetadata[] = updatedViews.map(({ id, name, href }) => ({ id, name, href }));
            const data = JSON.stringify({ views: viewsToStore, landingPageViewId: updatedLandingId });
            window.localStorage.setItem(getStorageKey('data'), data);
        } catch (error) {
            console.error("Failed to save project metadata to storage", error);
        }
    }
  }, [getStorageKey]);


  const getView = useCallback((viewId: string) => {
    return views.find(v => v.id === viewId);
  }, [views]);

  const updateViewImage = useCallback((viewId: string, imageUrl: string) => {
    setViews(prevViews => {
        const newViews = prevViews.map(view =>
            view.id === viewId ? { ...view, imageUrl } : view
        );
        try {
            window.localStorage.setItem(getStorageKey(`view-image-${viewId}`), imageUrl);
        } catch (error) {
            console.error(`Failed to save image for view ${viewId}:`, error);
            alert("Error: Could not save image. It might be too large (limit is 4MB).");
            return prevViews;
        }
        return newViews;
    });
  }, [getStorageKey]);
  
  const updateViewSelections = useCallback((viewId: string, selections: Polygon[]) => {
    setViews(prevViews => {
        const newViews = prevViews.map(view =>
            view.id === viewId ? { ...view, selections } : view
        );
        try {
            const selectionsStr = JSON.stringify(selections);
            window.localStorage.setItem(getStorageKey(`view-selections-${viewId}`), selectionsStr);
        } catch (error) {
            console.error(`Failed to save selections for view ${viewId}:`, error);
        }
        return newViews;
    });
  }, [getStorageKey]);

  const addView = useCallback((viewName: string): string => {
    const slug = viewName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let newView: View | null = null;
    
    setViews(prevViews => {
        if (prevViews.some(v => v.id === slug)) {
            return prevViews;
        }
        newView = {
          id: slug,
          name: viewName,
          icon: Eye,
          href: `/admin/projects/${projectId}/views/${slug}`,
        };
        const updatedViews = [...prevViews, newView];
        saveProjectMetadata(updatedViews, landingPageViewId);
        return updatedViews;
    });

    return newView ? newView.href : `/admin/projects/${projectId}`;
  }, [projectId, landingPageViewId, saveProjectMetadata]);

  const deleteView = useCallback((viewId: string) => {
    const updatedLandingId = landingPageViewId === viewId ? null : landingPageViewId;
    
    setViews(prevViews => {
        const updatedViews = prevViews.filter(view => view.id !== viewId);
        saveProjectMetadata(updatedViews, updatedLandingId);
        return updatedViews;
    });

    if (landingPageViewId === viewId) {
        setLandingPageViewIdState(null);
    }
    
    try {
        window.localStorage.removeItem(getStorageKey(`view-image-${viewId}`));
        window.localStorage.removeItem(getStorageKey(`view-selections-${viewId}`));
    } catch (error) {
        console.error(`Failed to remove data for view ${viewId}:`, error);
    }
  }, [landingPageViewId, saveProjectMetadata, getStorageKey]);

  const setLandingPageViewId = useCallback((viewId: string | null) => {
    setLandingPageViewIdState(viewId);
    saveProjectMetadata(views, viewId);
  }, [views, saveProjectMetadata]);

  const value = { views, landingPageViewId, setLandingPageViewId, getView, addView, deleteView, updateViewImage, updateViewSelections };

  if (!isMounted) {
    return null;
  }

  return (
    <ViewsContext.Provider value={value}>
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
