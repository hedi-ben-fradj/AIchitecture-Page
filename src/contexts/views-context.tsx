'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Eye, Building2, Home, type LucideIcon } from 'lucide-react';

export interface View {
  id: string;
  name: string;
  icon: LucideIcon;
  href: string;
}

interface ViewsContextType {
  views: View[];
  addView: (viewName: string) => string;
}

const ViewsContext = createContext<ViewsContextType | undefined>(undefined);

export function ViewsProvider({ children, projectId }: { children: ReactNode; projectId: string }) {
  const initialViews: View[] = [
    { id: 'birds-eye-view', name: "Bird's Eye View", icon: Eye, href: `/admin/projects/${projectId}/views/birds-eye-view` },
    { id: 'building-view', name: 'Building View', icon: Building2, href: `/admin/projects/${projectId}/views/building-view` },
    { id: 'apartment-view', name: 'Apartment View', icon: Home, href: `/admin/projects/${projectId}/views/apartment-view` },
  ];

  const [views, setViews] = useState<View[]>(initialViews);

  const addView = useCallback((viewName: string): string => {
    const slug = viewName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newView: View = {
      id: slug,
      name: viewName,
      icon: Home, // Default icon for new views
      href: `/admin/projects/${projectId}/views/${slug}`,
    };
    
    setViews(prevViews => {
        // Prevent adding duplicate views
        if (prevViews.some(v => v.id === slug)) {
            return prevViews;
        }
        return [...prevViews, newView];
    });

    return newView.href;
  }, [projectId]);

  return (
    <ViewsContext.Provider value={{ views, addView }}>
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
