'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { entityTypes, type Entity, type EntityType, type View } from '@/contexts/views-context';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EditEntityModal } from '@/components/admin/edit-entity-modal';


interface Project {
    id: string;
    name: string;
    description: string;
}

interface EnrichedEntity extends Entity {
    projectId: string;
    projectName: string;
    parentName?: string;
}

const PROJECTS_STORAGE_KEY = 'projects_list';
const getStorageSafeViewId = (viewId: string) => viewId.replace(/\//g, '__');


export default function DatabasePage() {
    const [allEntities, setAllEntities] = useState<EnrichedEntity[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedEntityType, setSelectedEntityType] = useState<EntityType>('Apartment');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
    const [isMounted, setIsMounted] = useState(false);
    
    const [entityToEdit, setEntityToEdit] = useState<EnrichedEntity | null>(null);
    const [entityToDelete, setEntityToDelete] = useState<EnrichedEntity | null>(null);

    const loadData = useCallback(() => {
        if (typeof window !== 'undefined') {
            try {
                const storedProjectsStr = localStorage.getItem(PROJECTS_STORAGE_KEY);
                const loadedProjects: Project[] = storedProjectsStr ? JSON.parse(storedProjectsStr) : [];
                setProjects(loadedProjects);
                
                let entitiesFromAllProjects: EnrichedEntity[] = [];

                loadedProjects.forEach(project => {
                    const projectDataStr = localStorage.getItem(`project-${project.id}-data`);
                    if (projectDataStr) {
                        const projectData = JSON.parse(projectDataStr);
                        if (projectData && Array.isArray(projectData.entities)) {
                             const projectEntities = projectData.entities.map((entity: Entity) => ({
                                ...entity,
                                projectId: project.id,
                                projectName: project.name,
                            }));
                            entitiesFromAllProjects.push(...projectEntities);
                        }
                    }
                });

                const enrichedEntitiesWithParents = entitiesFromAllProjects.map(entity => {
                    if (entity.parentId) {
                        const parent = entitiesFromAllProjects.find(p => p.id === entity.parentId);
                        return { ...entity, parentName: parent?.name || 'N/A' };
                    }
                    return entity;
                });

                setAllEntities(enrichedEntitiesWithParents);

            } catch (error) {
                console.error("Failed to load data from localStorage", error);
                setAllEntities([]);
                setProjects([]);
            }
        }
    }, []);

    useEffect(() => {
        loadData();
        setIsMounted(true);
    }, [loadData]);

    const handleUpdateEntity = (entityId: string, dataToUpdate: Partial<Entity>) => {
        const entity = allEntities.find(e => e.id === entityId);
        if (!entity || typeof window === 'undefined') return;

        const projectDataStr = localStorage.getItem(`project-${entity.projectId}-data`);
        if (!projectDataStr) return;
        
        try {
            const projectData = JSON.parse(projectDataStr);
            const updatedEntities = projectData.entities.map((e: Entity) => 
                e.id === entityId ? { ...e, ...dataToUpdate } : e
            );
            projectData.entities = updatedEntities;
            
            localStorage.setItem(`project-${entity.projectId}-data`, JSON.stringify(projectData));
            loadData();
            setEntityToEdit(null);
        } catch(error) {
            console.error("Failed to update entity:", error);
        }
    };
    
    const confirmDelete = () => {
        if (!entityToDelete || typeof window === 'undefined') return;

        const projectDataStr = localStorage.getItem(`project-${entityToDelete.projectId}-data`);
        if (!projectDataStr) return;
        
        try {
            const projectData = JSON.parse(projectDataStr);
            
            const entitiesToDelete = new Set<string>([entityToDelete.id]);
            let changed = true;
            while(changed) {
                changed = false;
                const currentSize = entitiesToDelete.size;
                projectData.entities.forEach((e: Entity) => {
                    if (e.parentId && entitiesToDelete.has(e.parentId)) {
                        entitiesToDelete.add(e.id);
                    }
                });
                if (entitiesToDelete.size > currentSize) {
                    changed = true;
                }
            }
            
            const entitiesToDeleteArray = Array.from(entitiesToDelete);
            
            entitiesToDeleteArray.forEach(idToDelete => {
                const entityData = projectData.entities.find((e: Entity) => e.id === idToDelete);
                if(entityData?.views) {
                    entityData.views.forEach((view: View) => {
                        localStorage.removeItem(`project-${entityToDelete.projectId}-view-image-${getStorageSafeViewId(view.id)}`);
                        localStorage.removeItem(`project-${entityToDelete.projectId}-view-selections-${getStorageSafeViewId(view.id)}`);
                    });
                }
            });
            
            projectData.entities = projectData.entities.filter((e: Entity) => !entitiesToDelete.has(e.id));
            
            localStorage.setItem(`project-${entityToDelete.projectId}-data`, JSON.stringify(projectData));
            loadData();
            setEntityToDelete(null);
        } catch (error) {
            console.error("Failed to delete entity:", error);
        }
    };

    const filteredEntities = useMemo(() => {
        return allEntities
            .filter(entity => entity.entityType === selectedEntityType)
            .filter(entity => selectedProjectId === 'all' || entity.projectId === selectedProjectId);
    }, [allEntities, selectedEntityType, selectedProjectId]);
    
    const isPropertyType = selectedEntityType === 'Apartment' || selectedEntityType === 'house';

    const tableHeaders = useMemo(() => {
        const baseHeaders = ['Name', 'Parent Entity'];
        if (isPropertyType) {
            return [...baseHeaders, 'Price (EUR)', 'Area (m²)', 'Status', 'Rooms', 'Actions'];
        }
        return [...baseHeaders, 'Actions'];
    }, [isPropertyType]);

    if (!isMounted) {
        return <div className="text-center p-8 text-white">Loading database...</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <EditEntityModal
                isOpen={!!entityToEdit}
                onClose={() => setEntityToEdit(null)}
                entity={entityToEdit}
                onUpdate={handleUpdateEntity}
            />

            <AlertDialog open={!!entityToDelete} onOpenChange={() => setEntityToDelete(null)}>
                <AlertDialogContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the "{entityToDelete?.name}" entity and all of its associated data (including children entities and views).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="hover:bg-neutral-700" onClick={() => setEntityToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <header className="h-16 flex items-center px-6 border-b border-neutral-700 bg-[#2a2a2a] flex-shrink-0">
                <h1 className="text-xl font-semibold text-white">Database</h1>
            </header>
            <main className="flex-1 p-8 bg-[#313131] overflow-y-auto">
                <div className="flex gap-4 mb-6">
                    <Select onValueChange={(value) => setSelectedEntityType(value as EntityType)} defaultValue={selectedEntityType}>
                        <SelectTrigger className="w-[280px] bg-[#313131] border-neutral-600">
                            <SelectValue placeholder="Select an entity type" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                            {entityTypes.map(type => (
                                <SelectItem key={type} value={type} className="capitalize hover:bg-neutral-700">{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select onValueChange={setSelectedProjectId} value={selectedProjectId}>
                        <SelectTrigger className="w-[280px] bg-[#313131] border-neutral-600">
                            <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                           <SelectItem value="all">All Projects</SelectItem>
                           {projects.map(project => (
                             <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                           ))}
                        </SelectContent>
                    </Select>
                </div>
                <Card className="bg-[#2a2a2a] border-neutral-700 text-white">
                    <CardContent className="p-6">
                        <div className="rounded-md border border-neutral-700">
                             <Table>
                                <TableHeader>
                                    <TableRow className="border-neutral-700 hover:bg-[#2a2a2a]">
                                        {tableHeaders.map(header => <TableHead key={header} className="text-white">{header}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEntities.length > 0 ? (
                                        filteredEntities.map(entity => (
                                            <TableRow key={entity.id} className="border-neutral-700 hover:bg-[#313131]">
                                                <TableCell>{entity.name}</TableCell>
                                                <TableCell>{entity.parentName || '—'}</TableCell>
                                                {isPropertyType && (
                                                    <>
                                                        <TableCell>{entity.price ? `€${entity.price.toLocaleString()}` : '—'}</TableCell>
                                                        <TableCell>{entity.houseArea ? `${entity.houseArea} m²` : '—'}</TableCell>
                                                        <TableCell className="capitalize">{entity.status || '—'}</TableCell>
                                                        <TableCell>{entity.rooms || '—'}</TableCell>
                                                    </>
                                                )}
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-600" onClick={() => setEntityToEdit(entity)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-600 text-red-500 hover:text-red-400" onClick={() => setEntityToDelete(entity)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={tableHeaders.length} className="h-24 text-center text-neutral-400">
                                                No entities found for the selected filters.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
