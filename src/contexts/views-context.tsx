
'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode, useEffect } from 'react';
import type { Polygon } from '@/components/admin/image-editor';

export type EntityType = string;
export type ViewType = string;

// Interfaces
export interface View {
  id: string;
  name: string;
  imageUrl?: string;
  type: ViewType;
  selections?: Polygon[];
}

export interface RoomDetail {
  id: string;
  name: string;
  size: number;
}

export interface Entity {
  id: string;
  name: string;
  entityType: EntityType;
  parentId?: string | null;
  views: View[];
  defaultViewId: string | null;
  // New property-specific fields
  plotArea?: number;
  houseArea?: number;
  price?: number;
  status?: 'available' | 'sold';
  availableDate?: string;
  floors?: number;
  rooms?: number;
  detailedRooms?: RoomDetail[];
}


interface ProjectContextType {
  entities: Entity[];
  landingPageEntityId: string | null;
  entityTypes: EntityType[];
  viewTypes: ViewType[];
  
  // Entity methods
  addEntity: (entityName: string, entityType: EntityType, parentId?: string | null) => void;
  deleteEntity: (entityId: string) => void;
  updateEntity: (entityId: string, data: Partial<Entity>) => void;
  getEntity: (entityId: string) => Entity | undefined;
  setLandingPageEntityId: (entityId: string | null) => void;

  // View methods
  addView: (entityId: string, viewName: string, viewType: ViewType) => string;
  deleteView: (entityId: string, viewId: string) => void;
  getView: (entityId: string, viewId: string) => View | undefined;
  updateViewImage: (entityId: string, viewId: string, imageUrl: string) => void;
  updateViewSelections: (entityId: string, viewId: string, selections: Polygon[]) => void;
  setDefaultViewId: (entityId: string, viewId: string) => void;

  // Entity Type methods
  addEntityType: (typeName: string) => void;
  deleteEntityType: (typeName: string) => void;

  // View Type methods
  addViewType: (typeName: ViewType) => void;
  deleteViewType: (typeName: ViewType) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const defaultEntityTypes: EntityType[] = [
    'residential compound',
    'residential building',
    'Apartment',
    'Floor',
    'Room',
    'house',
];
const ENTITY_TYPES_STORAGE_KEY = 'entity_types_list';

const defaultViewTypes: ViewType[] = ['2d', '360'];
const VIEW_TYPES_STORAGE_KEY = 'view_types_list';


export function ViewsProvider({ children, projectId }: { children: ReactNode; projectId?: string }) {
  const [isMounted, setIsMounted] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [landingPageEntityId, setLandingPageEntityIdState] = useState<string | null>(null);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>(defaultEntityTypes);
  const [viewTypes, setViewTypes] = useState<ViewType[]>(defaultViewTypes);

  const getStorageKey = useCallback((key: string) => {
    if (!projectId) return '';
    return `project-${projectId}-${key}`
  }, [projectId]);
  const getStorageSafeViewId = (viewId: string) => viewId.replace(/\//g, '__');
  
  // Project-specific data loading
  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      try {
        const projectDataStr = window.localStorage.getItem(getStorageKey('data'));
        let loadedEntities: Entity[] = [];
        let loadedLandingId: string | null = null;
        
        if (projectDataStr) {
          const projectData = JSON.parse(projectDataStr);
          
          if (projectData && Array.isArray(projectData.entities)) {
            loadedLandingId = projectData.landingPageEntityId || null;
            
            loadedEntities = projectData.entities.map((entityMeta: any) => ({
              ...entityMeta,
              views: entityMeta.views.map((viewMeta: any) => {
                const imageUrl = window.localStorage.getItem(getStorageKey(`view-image-${getStorageSafeViewId(viewMeta.id)}`)) || undefined;
                const selectionsStr = window.localStorage.getItem(getStorageKey(`view-selections-${getStorageSafeViewId(viewMeta.id)}`));
                const selections = selectionsStr ? JSON.parse(selectionsStr) : undefined;
                return { ...viewMeta, imageUrl, selections };
              }),
              defaultViewId: entityMeta.defaultViewId || (entityMeta.views.length > 0 ? entityMeta.views[0].id : null)
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
    }
  }, [projectId, getStorageKey]);

  // Global data loading (entity types and view types)
  useEffect(() => {
    if (typeof window !== 'undefined') {
        try {
            const storedEntityTypes = window.localStorage.getItem(ENTITY_TYPES_STORAGE_KEY);
            if (storedEntityTypes) {
                setEntityTypes(JSON.parse(storedEntityTypes));
            } else {
                window.localStorage.setItem(ENTITY_TYPES_STORAGE_KEY, JSON.stringify(defaultEntityTypes));
            }

            const storedViewTypes = window.localStorage.getItem(VIEW_TYPES_STORAGE_KEY);
            if (storedViewTypes) {
                setViewTypes(JSON.parse(storedViewTypes));
            } else {
                window.localStorage.setItem(VIEW_TYPES_STORAGE_KEY, JSON.stringify(defaultViewTypes));
            }
        } catch (error) {
            console.error("Failed to load types from storage", error);
            setEntityTypes(defaultEntityTypes);
            setViewTypes(defaultViewTypes);
        }
        setIsMounted(true);
    }
  }, []);

  const saveMetadata = useCallback((updatedEntities: Entity[], updatedLandingId: string | null) => {
    if (typeof window !== 'undefined' && projectId) {
      try {
        const metadata = {
          landingPageEntityId: updatedLandingId,
          // Strip large data fields before saving metadata
          entities: updatedEntities.map(entity => ({
            id: entity.id,
            name: entity.name,
            entityType: entity.entityType,
            parentId: entity.parentId,
            defaultViewId: entity.defaultViewId,
            plotArea: entity.plotArea,
            houseArea: entity.houseArea,
            price: entity.price,
            status: entity.status,
            availableDate: entity.availableDate,
            floors: entity.floors,
            rooms: entity.rooms,
            detailedRooms: entity.detailedRooms,
            views: entity.views.map(view => ({
              id: view.id,
              name: view.name,
              type: view.type
            })),
          })),
        };
        window.localStorage.setItem(getStorageKey('data'), JSON.stringify(metadata));
      } catch (error) {
        console.error("Failed to save project metadata to storage", error);
      }
    }
  }, [projectId, getStorageKey]);


  const getEntity = useCallback((entityId: string) => {
    return entities.find(e => e.id === entityId);
  }, [entities]);

  const getView = useCallback((entityId: string, viewId: string) => {
    const entity = getEntity(entityId);
    return entity?.views.find(v => v.id === viewId);
  }, [getEntity]);

  const addEntity = useCallback((entityName: string, entityType: EntityType, parentId: string | null = null) => {
    if (!projectId) {
        console.error("Cannot add an entity without a project context.");
        return;
    }
    setEntities(prevEntities => {
      const slug = entityName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (!slug || prevEntities.some(e => e.id === slug)) {
        alert(`Entity with name "${entityName}" already exists or name is invalid.`);
        return prevEntities;
      }
      const newEntity: Entity = {
        id: slug,
        name: entityName,
        entityType: entityType,
        parentId: parentId,
        views: [],
        defaultViewId: null,
      };

      if (entityType === 'Apartment' || entityType === 'house') {
        newEntity.floors = 1;
        newEntity.rooms = 1;
        newEntity.status = 'available';
      }

      const updatedEntities = [...prevEntities, newEntity];
      saveMetadata(updatedEntities, landingPageEntityId);
      return updatedEntities;
    });
  }, [projectId, landingPageEntityId, saveMetadata]);

  const updateEntity = useCallback((entityId: string, data: Partial<Entity>) => {
    if (!projectId) {
        console.error("Cannot update an entity without a project context.");
        return;
    }
    setEntities(prevEntities => {
        const updatedEntities = prevEntities.map(entity => {
            if (entity.id === entityId) {
                return { ...entity, ...data };
            }
            return entity;
        });
        saveMetadata(updatedEntities, landingPageEntityId);
        return updatedEntities;
    });
  }, [projectId, landingPageEntityId, saveMetadata]);

  const deleteEntity = useCallback((entityId: string) => {
    if (!projectId) {
        console.error("Cannot delete an entity without a project context.");
        return;
    }
    const updatedLandingId = landingPageEntityId === entityId ? null : landingPageEntityId;
    
    setEntities(prevEntities => {
      const entitiesToDelete = new Set<string>([entityId]);
      let changed = true;
      // Find all children, grandchildren, etc.
      while(changed) {
        changed = false;
        const currentSize = entitiesToDelete.size;
        prevEntities.forEach(e => {
          if (e.parentId && entitiesToDelete.has(e.parentId)) {
            entitiesToDelete.add(e.id);
          }
        });
        if (entitiesToDelete.size > currentSize) {
          changed = true;
        }
      }

      const entitiesToDeleteArray = Array.from(entitiesToDelete);

      // Clean up associated view data from localStorage
      entitiesToDeleteArray.forEach(idToDelete => {
        const entityToDelete = prevEntities.find(e => e.id === idToDelete);
        if (entityToDelete) {
          entityToDelete.views.forEach(view => {
            try {
              window.localStorage.removeItem(getStorageKey(`view-image-${getStorageSafeViewId(view.id)}`));
              window.localStorage.removeItem(getStorageKey(`view-selections-${getStorageSafeViewId(view.id)}`));
            } catch (error) {
              console.error(`Failed to remove data for view ${view.id}:`, error);
            }
          });
        }
      });
      
      const updatedEntities = prevEntities.filter(e => !entitiesToDelete.has(e.id));
      saveMetadata(updatedEntities, updatedLandingId);
      return updatedEntities;
    });

    if (landingPageEntityId === entityId) {
      setLandingPageEntityIdState(null);
    }
  }, [projectId, landingPageEntityId, saveMetadata, getStorageKey]);

  const setLandingPageEntityId = useCallback((entityId: string | null) => {
    if (!projectId) return;
    setLandingPageEntityIdState(entityId);
    saveMetadata(entities, entityId);
     if (typeof window !== 'undefined') {
        if (entityId) {
            window.localStorage.setItem('landing_project_id', projectId);
        } else {
            const currentLandingProject = window.localStorage.getItem('landing_project_id');
            if (currentLandingProject === projectId) {
                window.localStorage.removeItem('landing_project_id');
            }
        }
    }
  }, [projectId, entities, saveMetadata]);

 const addView = useCallback((entityId: string, viewName: string, viewType: ViewType) => {
    if (!projectId) {
        console.error("Cannot add a view without a project context.");
        return '';
    }
    let newViewHref = '';

    setEntities(prevEntities => {
      const targetEntity = prevEntities.find(e => e.id === entityId);
      if (!targetEntity) {
        console.error(`Entity with id "${entityId}" not found.`);
        return prevEntities;
      }
      
      const viewSlug = viewName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (!viewSlug) {
        alert("Invalid view name. The name must contain alphanumeric characters.");
        return prevEntities;
      }

      const alreadyExists = targetEntity.views.some(v => {
          const existingSlug = v.id.split('__').pop();
          return existingSlug === viewSlug;
      });
      
      if (alreadyExists) {
        alert(`A view with a name that generates the same URL slug ("${viewSlug}") already exists in this entity. Please choose a different name.`);
        return prevEntities;
      }

      const getEntityPath = (currentEntityId: string, allEntities: Entity[]): string[] => {
        const path: string[] = [];
        let currentId: string | undefined | null = currentEntityId;
        while(currentId) {
          const entity = allEntities.find(e => e.id === currentId);
          if (entity) {
            path.unshift(entity.id);
            currentId = entity.parentId;
          } else {
            currentId = null;
          }
        }
        return path;
      };
      
      const entityPath = getEntityPath(entityId, prevEntities);
      const newViewId = [...entityPath, viewSlug].join('__');

      const newView: View = { id: newViewId, name: viewName, type: viewType };
      newViewHref = `/admin/projects/${projectId}/entities/${entityId}/views/${encodeURIComponent(newViewId)}`;

      const updatedEntities = prevEntities.map(entity => {
        if (entity.id === entityId) {
          const updatedViews = [...entity.views, newView];
          const newDefaultViewId = updatedViews.length === 1 ? newViewId : entity.defaultViewId;
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
    if (!projectId) return;
    setEntities(prevEntities => {
      const updatedEntities = prevEntities.map(entity => {
        if (entity.id === entityId) {
          const updatedViews = entity.views.filter(v => v.id !== viewId);
          let newDefaultViewId = entity.defaultViewId;
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
    
    try {
      window.localStorage.removeItem(getStorageKey(`view-image-${getStorageSafeViewId(viewId)}`));
      window.localStorage.removeItem(getStorageKey(`view-selections-${getStorageSafeViewId(viewId)}`));
    } catch (error) {
      console.error(`Failed to remove data for view ${viewId}:`, error);
    }
  }, [projectId, landingPageEntityId, saveMetadata, getStorageKey]);

  const updateViewImage = useCallback((entityId: string, viewId: string, imageUrl: string) => {
    if (!projectId) return;
    setEntities(prev => prev.map(entity => 
      entity.id === entityId 
        ? { ...entity, views: entity.views.map(view => view.id === viewId ? { ...view, imageUrl } : view) }
        : entity
    ));
    try {
      window.localStorage.setItem(getStorageKey(`view-image-${getStorageSafeViewId(viewId)}`), imageUrl);
    } catch (error) {
      console.error(`Failed to save image for view ${viewId}:`, error);
      alert("Error: Could not save image due to browser storage limits. Your changes are visible now but won't be saved. Please try a smaller image or clear some space by removing other views.");
    }
  }, [projectId, getStorageKey]);

  const updateViewSelections = useCallback((entityId: string, viewId: string, selections: Polygon[]) => {
    if (!projectId) return;
    setEntities(prev => prev.map(entity => 
      entity.id === entityId
        ? { ...entity, views: entity.views.map(view => view.id === viewId ? { ...view, selections } : view) }
        : entity
    ));
    try {
      window.localStorage.setItem(getStorageKey(`view-selections-${getStorageSafeViewId(viewId)}`), JSON.stringify(selections));
    } catch (error) {
      console.error(`Failed to save selections for view ${viewId}:`, error);
    }
  }, [projectId, getStorageKey]);

  const setDefaultViewId = useCallback((entityId: string, viewId: string) => {
    if (!projectId) return;
    setEntities(prev => {
      const updated = prev.map(entity => 
        entity.id === entityId ? { ...entity, defaultViewId: viewId } : entity
      );
      saveMetadata(updated, landingPageEntityId);
      return updated;
    });
  }, [projectId, landingPageEntityId, saveMetadata]);

  const addEntityType = useCallback((typeName: string) => {
    setEntityTypes(prevTypes => {
        if (prevTypes.map(t => t.toLowerCase()).includes(typeName.toLowerCase())) {
            alert('This entity type already exists.');
            return prevTypes;
        }
        const updatedTypes = [...prevTypes, typeName];
        window.localStorage.setItem(ENTITY_TYPES_STORAGE_KEY, JSON.stringify(updatedTypes));
        return updatedTypes;
    });
  }, []);

  const deleteEntityType = useCallback((typeName: string) => {
    setEntityTypes(prevTypes => {
        const updatedTypes = prevTypes.filter(t => t !== typeName);
        window.localStorage.setItem(ENTITY_TYPES_STORAGE_KEY, JSON.stringify(updatedTypes));
        return updatedTypes;
    });
  }, []);

  const addViewType = useCallback((typeName: ViewType) => {
    setViewTypes(prevTypes => {
        if (prevTypes.map(t => t.toLowerCase()).includes(typeName.toLowerCase())) {
            alert('This view type already exists.');
            return prevTypes;
        }
        const updatedTypes = [...prevTypes, typeName];
        window.localStorage.setItem(VIEW_TYPES_STORAGE_KEY, JSON.stringify(updatedTypes));
        return updatedTypes;
    });
  }, []);

  const deleteViewType = useCallback((typeName: ViewType) => {
    setViewTypes(prevTypes => {
        const updatedTypes = prevTypes.filter(t => t !== typeName);
        window.localStorage.setItem(VIEW_TYPES_STORAGE_KEY, JSON.stringify(updatedTypes));
        return updatedTypes;
    });
  }, []);

  const value = { 
    entities, 
    landingPageEntityId, 
    entityTypes,
    viewTypes,
    getEntity, 
    getView,
    addEntity,
    deleteEntity,
    updateEntity,
    setLandingPageEntityId,
    addView,
    deleteView,
    updateViewImage,
    updateViewSelections,
    setDefaultViewId,
    addEntityType,
    deleteEntityType,
    addViewType,
    deleteViewType
  };

  if (!isMounted && projectId) return null; // Only pause rendering for project-specific contexts

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
