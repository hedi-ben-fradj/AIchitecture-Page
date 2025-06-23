'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode, useEffect } from 'react';
import { Eye, type LucideIcon } from 'lucide-react';
import type { Polygon } from '@/components/admin/image-editor';

// Interfaces
export interface View {
  id: string;
  name: string;
  imageUrl?: string;
  selections?: Polygon[];
}

export interface Entity {
  id: string;
  name: string;
  views: View[];
  defaultViewId: string | null;
}

interface ProjectContextType {
  entities: Entity[];
  landingPageEntityId: string | null;
  
  // Entity methods
  addEntity: (entityName: string) => void;
  deleteEntity: (entityId: string) => void;
  getEntity: (entityId: string) => Entity | undefined;
  setLandingPageEntityId: (entityId: string | null) => void;

  // View methods
  addView: (entityId: string, viewName: string) => string;
  deleteView: (entityId: string, viewId: string) => void;
  getView: (entityId: string, viewId: string) => View | undefined;
  updateViewImage: (entityId: string, viewId: string, imageUrl: string) => void;
  updateViewSelections: (entityId: string, viewId: string, selections: Polygon[]) => void;
  setDefaultViewId: (entityId: string, viewId: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Storage a single key for all metadata, and separate keys for large data (images)
type ProjectMetadata = {
  landingPageEntityId: string | null;
  entities: Entity[];
};

export function ViewsProvider({ children, projectId }: { children: ReactNode; projectId: string }) {
  const getStorageKey = useCallback((key: string) => `project-${projectId}-${key}`, [projectId]);

  const [isMounted, setIsMounted] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [landingPageEntityId, setLandingPageEntityIdState] = useState<string | null>(null);

  const saveMetadata = useCallback((updatedEntities: Entity[], updatedLandingId: string | null) => {
    if (typeof window !== 'undefined') {
      try {
        const metadata: ProjectMetadata = {
          landingPageEntityId: updatedLandingId,
          // Strip large data fields before saving metadata
          entities: updatedEntities.map(entity => ({
            ...entity,
            views: entity.views.map(view => ({
              id: view.id,
              name: view.name,
              defaultViewId: (entity as any).defaultViewId, // Keep defaultViewId for entity
            }))
          }))
        };
        window.localStorage.setItem(getStorageKey('data'), JSON.stringify(metadata));
      } catch (error) {
        console.error("Failed to save project metadata to storage", error);
      }
    }
  }, [getStorageKey]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const projectDataStr = window.localStorage.getItem(getStorageKey('data'));
        let loadedEntities: Entity[] = [];
        let loadedLandingId: string | null = null;
        
        if (projectDataStr) {
          const projectData: ProjectMetadata = JSON.parse(projectDataStr);
          
          if (projectData && Array.isArray(projectData.entities)) {
            loadedLandingId = projectData.landingPageEntityId || null;
            
            loadedEntities = projectData.entities.map(entityMeta => ({
              ...entityMeta,
              views: entityMeta.views.map(viewMeta => {
                const imageUrl = window.localStorage.getItem(getStorageKey(`view-image-${viewMeta.id}`)) || undefined;
                const selectionsStr = window.localStorage.getItem(getStorageKey(`view-selections-${viewMeta.id}`));
                const selections = selectionsStr ? JSON.parse(selectionsStr) : undefined;
                return { ...viewMeta, imageUrl, selections };
              })
            }));
          } else {
             console.warn("Project data in localStorage is malformed. Resetting state.", projectData);
          }
        }
        setEntities(loadedEntities);
        setLandingPageEntityIdState(loadedLandingId);
      } catch (error) {
        console.error("Failed to load project data from storage", error);
        setEntities([]);
        setLandingPageEntityIdState(null);
      }
      setIsMounted(true);
    }
  }, [getStorageKey]);


  const getEntity = useCallback((entityId: string) => {
    return entities.find(e => e.id === entityId);
  }, [entities]);

  const getView = useCallback((entityId: string, viewId: string) => {
    const entity = getEntity(entityId);
    return entity?.views.find(v => v.id === viewId);
  }, [getEntity]);

  const addEntity = useCallback((entityName: string) => {
    setEntities(prevEntities => {
      const slug = entityName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (!slug || prevEntities.some(e => e.id === slug)) {
        alert(`Entity with name "${entityName}" already exists or name is invalid.`);
        return prevEntities;
      }
      const newEntity: Entity = {
        id: slug,
        name: entityName,
        views: [],
        defaultViewId: null,
      };
      const updatedEntities = [...prevEntities, newEntity];
      saveMetadata(updatedEntities, landingPageEntityId);
      return updatedEntities;
    });
  }, [landingPageEntityId, saveMetadata]);

  const deleteEntity = useCallback((entityId: string) => {
    const updatedLandingId = landingPageEntityId === entityId ? null : landingPageEntityId;
    setEntities(prevEntities => {
      const entityToDelete = prevEntities.find(e => e.id === entityId);
      if (entityToDelete) {
        // Clean up associated view data from localStorage
        entityToDelete.views.forEach(view => {
          try {
            window.localStorage.removeItem(getStorageKey(`view-image-${view.id}`));
            window.localStorage.removeItem(getStorageKey(`view-selections-${view.id}`));
          } catch (error) {
            console.error(`Failed to remove data for view ${view.id}:`, error);
          }
        });
      }
      const updatedEntities = prevEntities.filter(e => e.id !== entityId);
      saveMetadata(updatedEntities, updatedLandingId);
      return updatedEntities;
    });

    if (landingPageEntityId === entityId) {
      setLandingPageEntityIdState(null);
    }
  }, [landingPageEntityId, saveMetadata, getStorageKey]);

  const setLandingPageEntityId = useCallback((entityId: string | null) => {
    setLandingPageEntityIdState(entityId);
    saveMetadata(entities, entityId);
  }, [entities, saveMetadata]);

  const addView = useCallback((entityId: string, viewName: string) => {
    const slug = viewName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let newViewHref = '';

    setEntities(prevEntities => {
      const allViewIds = prevEntities.flatMap(e => e.views.map(v => v.id));
      if (!slug || allViewIds.includes(slug)) {
        alert(`A view with name "${viewName}" already exists in the project or the name is invalid. Please choose a unique name.`);
        return prevEntities;
      }
      
      const newView: View = { id: slug, name: viewName };
      newViewHref = `/admin/projects/${projectId}/entities/${entityId}/views/${slug}`;

      const updatedEntities = prevEntities.map(entity => {
        if (entity.id === entityId) {
          const updatedViews = [...entity.views, newView];
          // If this is the first view, set it as default
          const newDefaultViewId = updatedViews.length === 1 ? slug : entity.defaultViewId;
          return { ...entity, views: updatedViews, defaultViewId: newDefaultViewId };
        }
        return entity;
      });

      saveMetadata(updatedEntities, landingPageEntityId);
      return updatedEntities;
    });

    return newViewHref;
  }, [projectId, landingPageEntityId, saveMetadata]);

  const deleteView = useCallback((entityId: string, viewId: string) => {
    setEntities(prevEntities => {
      const updatedEntities = prevEntities.map(entity => {
        if (entity.id === entityId) {
          const updatedViews = entity.views.filter(v => v.id !== viewId);
          let newDefaultViewId = entity.defaultViewId;
          // If the deleted view was the default, pick a new default
          if (entity.defaultViewId === viewId) {
            newDefaultViewId = updatedViews.length > 0 ? updatedViews[0].id : null;
          }
          return { ...entity, views: updatedViews, defaultViewId: newDefaultViewId };
        }
        return entity;
      });
      saveMetadata(updatedEntities, landingPageEntityId);
      return updatedEntities;
    });
    
    // Clean up storage
    try {
      window.localStorage.removeItem(getStorageKey(`view-image-${viewId}`));
      window.localStorage.removeItem(getStorageKey(`view-selections-${viewId}`));
    } catch (error) {
      console.error(`Failed to remove data for view ${viewId}:`, error);
    }
  }, [landingPageEntityId, saveMetadata, getStorageKey]);

  const updateViewImage = useCallback((entityId: string, viewId: string, imageUrl: string) => {
    setEntities(prev => prev.map(entity => 
      entity.id === entityId 
        ? { ...entity, views: entity.views.map(view => view.id === viewId ? { ...view, imageUrl } : view) }
        : entity
    ));
    try {
      window.localStorage.setItem(getStorageKey(`view-image-${viewId}`), imageUrl);
    } catch (error) {
      console.error(`Failed to save image for view ${viewId}:`, error);
      alert("Error: Could not save image due to browser storage limits. Your changes are visible now but won't be saved. Please try a smaller image or clear some space by removing other views.");
    }
  }, [getStorageKey]);

  const updateViewSelections = useCallback((entityId: string, viewId: string, selections: Polygon[]) => {
    setEntities(prev => prev.map(entity => 
      entity.id === entityId
        ? { ...entity, views: entity.views.map(view => view.id === viewId ? { ...view, selections } : view) }
        : entity
    ));
    try {
      window.localStorage.setItem(getStorageKey(`view-selections-${viewId}`), JSON.stringify(selections));
    } catch (error) {
      console.error(`Failed to save selections for view ${viewId}:`, error);
    }
  }, [getStorageKey]);

  const setDefaultViewId = useCallback((entityId: string, viewId: string) => {
    setEntities(prev => {
      const updated = prev.map(entity => 
        entity.id === entityId ? { ...entity, defaultViewId: viewId } : entity
      );
      saveMetadata(updated, landingPageEntityId);
      return updated;
    });
  }, [landingPageEntityId, saveMetadata]);

  const value = { 
    entities, 
    landingPageEntityId, 
    getEntity, 
    getView,
    addEntity,
    deleteEntity,
    setLandingPageEntityId,
    addView,
    deleteView,
    updateViewImage,
    updateViewSelections,
    setDefaultViewId
  };

  if (!isMounted) return null;

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectData() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectData must be used within a ProjectProvider');
  }
  return context;
}
