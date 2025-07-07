
'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode, useEffect } from 'react';
import type { Polygon } from '@/components/admin/image-editor';
import { db, storage } from '@/lib/firebase';
import { 
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    query,
    where,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export type EntityType = string;
export type ViewType = string;

// Interfaces
export interface Hotspot {
  id: number;
  x: number;
  y: number;
  linkedViewId: string;
  rotation?: number; // Field of view rotation in degrees
  fov?: number; // Field of view angle in degrees
}

export interface View {
  id: string;
  name: string;
  imageUrl?: string;
  type: ViewType;
  selections?: Polygon[];
  hotspots?: Hotspot[];
}

export interface RoomDetail {
  id: string;
  name: string;
  size: number;
}

export interface Entity {
  id: string;
  projectId: string;
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
  addView: (entityId: string, viewName: string, viewType: ViewType) => Promise<string>;
  deleteView: (entityId: string, viewId: string) => void;
  getView: (entityId: string, viewId: string) => View | undefined;
  updateViewImage: (entityId: string, viewId: string, imageUrl: string) => Promise<void>;
  updateViewSelections: (entityId: string, viewId: string, selections: Polygon[]) => void;
  updateViewHotspots: (entityId: string, viewId: string, hotspots: Hotspot[]) => void;
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

const defaultViewTypes: ViewType[] = ['2d', '360', '2d plan'];

// Helper function to recursively get all descendant IDs
const getDescendantIds = (entityId: string, allEntities: Entity[]): string[] => {
    const descendants = new Set<string>();
    const toProcess = [entityId];
    while (toProcess.length > 0) {
        const currentId = toProcess.pop()!;
        if (currentId !== entityId) { // Exclude the initial entity itself from descendants list
            descendants.add(currentId);
        }
        const children = allEntities.filter(e => e.parentId === currentId);
        children.forEach(child => toProcess.push(child.id));
    }
    return Array.from(descendants);
};


export function ViewsProvider({ children, projectId }: { children: ReactNode; projectId?: string }) {
  const [isMounted, setIsMounted] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [landingPageEntityId, setLandingPageEntityIdState] = useState<string | null>(null);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [viewTypes, setViewTypes] = useState<ViewType[]>([]);

  // Load global types
  useEffect(() => {
    const loadTypes = async () => {
        try {
            const entityTypesDoc = await getDoc(doc(db, 'app_config', 'entity_types'));
            if (entityTypesDoc.exists()) {
                setEntityTypes(entityTypesDoc.data().types);
            } else {
                await setDoc(doc(db, 'app_config', 'entity_types'), { types: defaultEntityTypes });
                setEntityTypes(defaultEntityTypes);
            }

            const viewTypesDoc = await getDoc(doc(db, 'app_config', 'view_types'));
            if (viewTypesDoc.exists()) {
                setViewTypes(viewTypesDoc.data().types);
            } else {
                await setDoc(doc(db, 'app_config', 'view_types'), { types: defaultViewTypes });
                setViewTypes(defaultViewTypes);
            }
        } catch (error) {
            console.error("Failed to load types from Firestore", error);
        }
    };
    loadTypes();
  }, []);
  
  // Project-specific data loading
  useEffect(() => {
    if (!projectId) {
      setEntities([]);
      setLandingPageEntityIdState(null);
      return;
    };

    const loadProjectData = async () => {
        try {
            // Fetch project metadata
            const projectDocRef = doc(db, 'projects', projectId);
            const projectDoc = await getDoc(projectDocRef);
            const projectData = projectDoc.exists() ? projectDoc.data() : {};
            setLandingPageEntityIdState(projectData.landingPageEntityId || null);

            // Fetch all entities for the project from the top-level collection
            const entitiesQuery = query(collection(db, 'entities'), where('projectId', '==', projectId));
            const entitiesSnapshot = await getDocs(entitiesQuery);
            const fetchedEntities = entitiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Entity[];
            
            // Set entities and mark as mounted
            setEntities(fetchedEntities);
            setIsMounted(true);

        } catch (error) {
            console.error(`Failed to load data for project ${projectId}:`, error);
            setEntities([]);
            setLandingPageEntityIdState(null);
            setIsMounted(true);
        }
    };

    loadProjectData();
  }, [projectId]);


  const getEntity = useCallback((entityId: string) => {
    return entities.find(e => e.id === entityId);
  }, [entities]);

  const getView = useCallback((entityId: string, viewId: string) => {
    const entity = getEntity(entityId);
    return entity?.views.find(v => v.id === viewId);
  }, [getEntity]);

  const addEntity = useCallback(async (entityName: string, entityType: EntityType, parentId: string | null = null) => {
    if (!projectId) return;

    const slug = entityName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!slug) {
        alert("Invalid entity name.");
        return;
    }

    const entityRef = doc(db, 'entities', slug);
    const entitySnap = await getDoc(entityRef);

    if (entitySnap.exists()) {
        alert(`Entity with name "${entityName}" already exists or name is invalid.`);
        return;
    }

    const newEntityData: Omit<Entity, 'id'> = {
      projectId: projectId,
      name: entityName,
      entityType: entityType,
      parentId: parentId,
      views: [],
      defaultViewId: null,
    };
    
    if (entityType === 'Apartment' || entityType === 'house') {
        newEntityData.status = 'available';
        newEntityData.floors = 1;
        newEntityData.rooms = 1;
    }
    
    // Filter out undefined values
    const finalData = Object.fromEntries(Object.entries(newEntityData).filter(([_, v]) => v !== undefined));

    await setDoc(entityRef, finalData);
    setEntities(prev => [...prev, { id: slug, ...finalData } as Entity]);

  }, [projectId]);

  const updateEntity = useCallback(async (entityId: string, data: Partial<Entity>) => {
    // Create a new object with only defined values to prevent Firestore errors.
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
    
    // Only update if there is data to update. This prevents empty updates.
    if (Object.keys(cleanData).length > 0) {
        const entityRef = doc(db, 'entities', entityId);
        await updateDoc(entityRef, cleanData);
        
        // Update the local state with the cleaned data.
        // This ensures the local state is consistent with what was saved to Firestore
        // and prevents overwriting existing values with 'undefined'.
        setEntities(prev => prev.map(e => e.id === entityId ? { ...e, ...cleanData } : e));
    }
  }, []);

  const deleteEntity = useCallback(async (entityId: string) => {
    if (!projectId) return;

    const allDescendantIds = getDescendantIds(entityId, entities);
    const allIdsToDelete = [entityId, ...allDescendantIds];

    const batch = writeBatch(db);

    allIdsToDelete.forEach(id => {
        const entityRef = doc(db, 'entities', id);
        batch.delete(entityRef);
    });

    await batch.commit();

    setEntities(prev => prev.filter(e => !allIdsToDelete.includes(e.id)));
    
    if (landingPageEntityId && allIdsToDelete.includes(landingPageEntityId)) {
        setLandingPageEntityIdState(null);
        await updateDoc(doc(db, 'projects', projectId), { landingPageEntityId: null });
    }

  }, [projectId, entities, landingPageEntityId]);

  const setLandingPageEntityId = useCallback(async (entityId: string | null) => {
    if (!projectId) return;
    await updateDoc(doc(db, 'projects', projectId), { landingPageEntityId: entityId });
    setLandingPageEntityIdState(entityId);
    
    // Also set the global landing project ID
    const globalsRef = doc(db, 'globals', 'config');
    if (entityId) {
        await setDoc(globalsRef, { landingProjectId: projectId }, { merge: true });
    } else {
        const globalsDoc = await getDoc(globalsRef);
        if (globalsDoc.exists() && globalsDoc.data().landingProjectId === projectId) {
             await updateDoc(globalsRef, { landingProjectId: null });
        }
    }
  }, [projectId]);

 const addView = useCallback(async (entityId: string, viewName: string, viewType: ViewType) => {
    if (!projectId) return '';
    
    const targetEntity = entities.find(e => e.id === entityId);
    if (!targetEntity) {
        console.error(`Entity with id "${entityId}" not found.`);
        return '';
    }

    const viewSlug = viewName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!viewSlug) {
        alert("Invalid view name.");
        return '';
    }
    
    const newViewId = `${entityId}__${viewSlug}`;
    if (targetEntity.views.some(v => v.id === newViewId)) {
        alert(`A view with a similar name already exists in this entity.`);
        return '';
    }

    const newView: View = {
        id: newViewId,
        name: viewName,
        type: viewType,
        selections: [],
        hotspots: [],
    };
    
    const entityRef = doc(db, 'entities', entityId);
    
    const newDefaultViewId = targetEntity.views.length === 0 ? newViewId : targetEntity.defaultViewId;

    await updateDoc(entityRef, {
        views: arrayUnion(newView),
        defaultViewId: newDefaultViewId
    });

    setEntities(prev => prev.map(e => e.id === entityId ? {
        ...e,
        views: [...e.views, newView],
        defaultViewId: newDefaultViewId
    } : e));

    return `/admin/projects/${projectId}/entities/${entityId}/views/${encodeURIComponent(newViewId)}`;

  }, [projectId, entities]);

  const deleteView = useCallback(async (entityId: string, viewId: string) => {
    const entity = getEntity(entityId);
    const viewToDelete = entity?.views.find(v => v.id === viewId);
    if (!entity || !viewToDelete) return;

    const entityRef = doc(db, 'entities', entityId);
    await updateDoc(entityRef, {
        views: arrayRemove(viewToDelete)
    });

    // If deleted view was the default, set a new default
    if (entity.defaultViewId === viewId) {
        const remainingViews = entity.views.filter(v => v.id !== viewId);
        const newDefault = remainingViews.length > 0 ? remainingViews[0].id : null;
        await updateDoc(entityRef, { defaultViewId: newDefault });
    }
    
    // This is a special case since we store all view data inside the entity doc for simplicity now.
    // If view data were in separate docs, we would delete them here.
    // The update to the entity doc is sufficient with the current model.

    // Refresh local state
    setEntities(prev => prev.map(e => {
        if (e.id === entityId) {
            const updatedViews = e.views.filter(v => v.id !== viewId);
            let newDefaultViewId = e.defaultViewId;
             if (e.defaultViewId === viewId) {
                newDefaultViewId = updatedViews.length > 0 ? updatedViews[0].id : null;
             }
            return { ...e, views: updatedViews, defaultViewId: newDefaultViewId };
        }
        return e;
    }));

  }, [getEntity]);

  const updateViewData = async (entityId: string, viewId: string, data: Partial<View>) => {
    const entityRef = doc(db, 'entities', entityId);
    const entitySnap = await getDoc(entityRef);
    if (!entitySnap.exists()) return;

    const entityData = entitySnap.data() as Entity;
    const views = entityData.views || [];
    const viewIndex = views.findIndex(v => v.id === viewId);
    if (viewIndex === -1) return;

    const updatedView = { ...views[viewIndex], ...data };
    const updatedViews = [...views];
    updatedViews[viewIndex] = updatedView;

    await updateDoc(entityRef, { views: updatedViews });
    
    setEntities(prev => prev.map(e => e.id === entityId ? { ...e, views: updatedViews } : e));
  };

  const updateViewImage = async (entityId: string, viewId: string, imageDataUrl: string) => {
    if (!projectId) return;
    const storageRef = ref(storage, `projects/${projectId}/views/${viewId}.jpg`);
    try {
        const snapshot = await uploadString(storageRef, imageDataUrl, 'data_url');
        const downloadURL = await getDownloadURL(snapshot.ref);
        await updateViewData(entityId, viewId, { imageUrl: downloadURL });
    } catch (error) {
        console.error("Error uploading image:", error);
    }
  };
  
  const updateViewSelections = (entityId: string, viewId: string, selections: Polygon[]) => updateViewData(entityId, viewId, { selections });
  const updateViewHotspots = (entityId: string, viewId: string, hotspots: Hotspot[]) => updateViewData(entityId, viewId, { hotspots });
  
  const setDefaultViewId = useCallback(async (entityId: string, viewId: string) => {
    const entityRef = doc(db, 'entities', entityId);
    await updateDoc(entityRef, { defaultViewId: viewId });
    setEntities(prev => prev.map(e => e.id === entityId ? { ...e, defaultViewId: viewId } : e));
  }, []);

  const addEntityType = useCallback(async (typeName: string) => {
    if (entityTypes.map(t => t.toLowerCase()).includes(typeName.toLowerCase())) {
        alert('This entity type already exists.');
        return;
    }
    const updatedTypes = [...entityTypes, typeName];
    await setDoc(doc(db, 'app_config', 'entity_types'), { types: updatedTypes });
    setEntityTypes(updatedTypes);
  }, [entityTypes]);

  const deleteEntityType = useCallback(async (typeName: string) => {
    const updatedTypes = entityTypes.filter(t => t !== typeName);
    await setDoc(doc(db, 'app_config', 'entity_types'), { types: updatedTypes });
    setEntityTypes(updatedTypes);
  }, [entityTypes]);

  const addViewType = useCallback(async (typeName: ViewType) => {
     if (viewTypes.map(t => t.toLowerCase()).includes(typeName.toLowerCase())) {
        alert('This view type already exists.');
        return;
    }
    const updatedTypes = [...viewTypes, typeName];
    await setDoc(doc(db, 'app_config', 'view_types'), { types: updatedTypes });
    setViewTypes(updatedTypes);
  }, [viewTypes]);

  const deleteViewType = useCallback(async (typeName: ViewType) => {
    const updatedTypes = viewTypes.filter(t => t !== typeName);
    await setDoc(doc(db, 'app_config', 'view_types'), { types: updatedTypes });
    setViewTypes(updatedTypes);
  }, [viewTypes]);

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
    updateViewHotspots,
    setDefaultViewId,
    addEntityType,
    deleteEntityType,
    addViewType,
    deleteViewType
  };

  if (!isMounted && projectId) return null;

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectData() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectData must be used within a ViewsProvider');
  }
  return context;
}
