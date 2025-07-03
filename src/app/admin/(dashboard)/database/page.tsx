
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { entityTypes, type Entity, type EntityType } from '@/contexts/views-context';

interface Project {
    id: string;
    name: string;
    description: string;
}

interface EnrichedEntity extends Entity {
    projectName: string;
    parentName?: string;
}

const PROJECTS_STORAGE_KEY = 'projects_list';

export default function DatabasePage() {
    const [allEntities, setAllEntities] = useState<EnrichedEntity[]>([]);
    const [selectedEntityType, setSelectedEntityType] = useState<EntityType>('Apartment');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const storedProjectsStr = localStorage.getItem(PROJECTS_STORAGE_KEY);
                const projects: Project[] = storedProjectsStr ? JSON.parse(storedProjectsStr) : [];
                
                let entitiesFromAllProjects: EnrichedEntity[] = [];

                projects.forEach(project => {
                    const projectDataStr = localStorage.getItem(`project-${project.id}-data`);
                    if (projectDataStr) {
                        const projectData = JSON.parse(projectDataStr);
                        if (projectData && Array.isArray(projectData.entities)) {
                             const projectEntities = projectData.entities.map((entity: Entity) => ({
                                ...entity,
                                projectName: project.name,
                            }));
                            entitiesFromAllProjects.push(...projectEntities);
                        }
                    }
                });

                // Second pass to add parentName
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
            }
            setIsMounted(true);
        }
    }, []);

    const filteredEntities = useMemo(() => {
        return allEntities.filter(entity => entity.entityType === selectedEntityType);
    }, [allEntities, selectedEntityType]);
    
    const isPropertyType = selectedEntityType === 'Apartment' || selectedEntityType === 'house';

    const tableHeaders = useMemo(() => {
        const baseHeaders = ['Name', 'Parent Entity', 'Project'];
        if (isPropertyType) {
            return [...baseHeaders, 'Price (EUR)', 'Area (m²)', 'Status', 'Rooms'];
        }
        return baseHeaders;
    }, [isPropertyType]);

    if (!isMounted) {
        return <div className="text-center p-8 text-white">Loading database...</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <header className="h-16 flex items-center px-6 border-b border-neutral-700 bg-[#2a2a2a] flex-shrink-0">
                <h1 className="text-xl font-semibold text-white">Database</h1>
            </header>
            <main className="flex-1 p-8 bg-[#313131] overflow-y-auto">
                <Card className="bg-[#2a2a2a] border-neutral-700 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-medium">Entities</h2>
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
                        </div>
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
                                                <TableCell>{entity.projectName}</TableCell>
                                                {isPropertyType && (
                                                    <>
                                                        <TableCell>{entity.price ? `€${entity.price.toLocaleString()}` : '—'}</TableCell>
                                                        <TableCell>{entity.houseArea ? `${entity.houseArea} m²` : '—'}</TableCell>
                                                        <TableCell className="capitalize">{entity.status || '—'}</TableCell>
                                                        <TableCell>{entity.rooms || '—'}</TableCell>
                                                    </>
                                                )}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={tableHeaders.length} className="h-24 text-center text-neutral-400">
                                                No entities found for the selected type.
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
