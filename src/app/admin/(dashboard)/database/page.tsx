
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type Entity, type EntityType } from '@/contexts/views-context';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EditEntityModal } from '@/components/admin/edit-entity-modal';
import { AddEditTemplateModal, type ProjectTemplate } from '@/components/admin/add-edit-template-modal';
import { useProjectData } from '@/contexts/views-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, updateDoc, deleteDoc, writeBatch, setDoc, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface Project {
    id: string;
    name: string;
    description: string;
}

interface EnrichedEntity extends Entity {
    projectName: string;
    parentName?: string;
}

export default function DatabasePage() {
    const [allEntities, setAllEntities] = useState<EnrichedEntity[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedEntityType, setSelectedEntityType] = useState<EntityType>('Apartment');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
    const [isMounted, setIsMounted] = useState(false);
    
    const [entityToEdit, setEntityToEdit] = useState<EnrichedEntity | null>(null);
    const [entityToDelete, setEntityToDelete] = useState<EnrichedEntity | null>(null);
    
    const { 
        entityTypes, addEntityType, deleteEntityType, 
        viewTypes, addViewType, deleteViewType 
    } = useProjectData();
    
    const [entityTypeToDelete, setEntityTypeToDelete] = useState<string | null>(null);
    const [newEntityTypeName, setNewEntityTypeName] = useState('');
    
    const [viewTypeToDelete, setViewTypeToDelete] = useState<string | null>(null);
    const [newViewTypeName, setNewViewTypeName] = useState('');

    const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
    const [templateToEdit, setTemplateToEdit] = useState<ProjectTemplate | Omit<ProjectTemplate, 'id'> | null>(null);
    const [templateToDelete, setTemplateToDelete] = useState<ProjectTemplate | null>(null);
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        try {
            // Load Projects from Firestore
            const projectsSnapshot = await getDocs(collection(db, 'projects'));
            const loadedProjects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];
            setProjects(loadedProjects);

            const projectMap = new Map(loadedProjects.map(p => [p.id, p.name]));

            // Load all entities from the top-level collection
            const allEntitiesSnapshot = await getDocs(collection(db, 'entities'));
            const entitiesFromAllProjects = allEntitiesSnapshot.docs.map(doc => {
                const data = doc.data() as Entity;
                return {
                    id: doc.id,
                    ...data,
                    projectName: projectMap.get(data.projectId) || 'Unknown Project',
                };
            }) as EnrichedEntity[];

            const enrichedEntitiesWithParents = entitiesFromAllProjects.map(entity => {
                if (entity.parentId) {
                    const parent = entitiesFromAllProjects.find(p => p.id === entity.parentId);
                    return { ...entity, parentName: parent?.name || 'N/A' };
                }
                return entity;
            });
            setAllEntities(enrichedEntitiesWithParents);

            // Load Templates from Firestore
            const templatesSnapshot = await getDocs(collection(db, 'project_templates'));
            const loadedTemplates = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProjectTemplate[];
            setTemplates(loadedTemplates);
        } catch (error) {
            console.error("Failed to load data from Firestore", error);
            toast({ title: "Error", description: "Failed to load database content.", variant: "destructive" });
        }
    }, [toast]);

    useEffect(() => {
        loadData().finally(() => setIsMounted(true));
    }, [loadData]);

    const handleUpdateEntity = async (entityId: string, dataToUpdate: Partial<Entity>) => {
        if (!allEntities.find(e => e.id === entityId)) return;

        try {
            const entityRef = doc(db, 'entities', entityId);
            await updateDoc(entityRef, dataToUpdate);
            await loadData(); // Reload all data
            setEntityToEdit(null);
        } catch(error) {
            console.error("Failed to update entity:", error);
            toast({ title: "Error", description: "Could not update the entity.", variant: "destructive" });
        }
    };
    
    const confirmDelete = async () => {
        if (!entityToDelete) return;

        try {
            const getDescendantIds = (startId: string, all: EnrichedEntity[]): string[] => {
                const descendants = new Set<string>();
                const queue = [startId];
                while(queue.length > 0) {
                    const currentId = queue.shift()!;
                    const children = all.filter(e => e.parentId === currentId);
                    for (const child of children) {
                        descendants.add(child.id);
                        queue.push(child.id);
                    }
                }
                return Array.from(descendants);
            };
            
            const allIdsToDelete = [entityToDelete.id, ...getDescendantIds(entityToDelete.id, allEntities)];
            const batch = writeBatch(db);

            allIdsToDelete.forEach(id => {
                const entityRef = doc(db, 'entities', id);
                batch.delete(entityRef);
            });
            
            await batch.commit();
            await loadData();
            setEntityToDelete(null);
            toast({ title: "Success", description: "Entity and its children have been deleted." });
        } catch (error) {
            console.error("Failed to delete entity:", error);
            toast({ title: "Error", description: "Could not delete the entity.", variant: "destructive" });
        }
    };

    const handleAddEntityType = () => {
        if (newEntityTypeName.trim()) {
            addEntityType(newEntityTypeName.trim());
            setNewEntityTypeName('');
        }
    };

    const confirmDeleteEntityType = () => {
        if (entityTypeToDelete) {
            deleteEntityType(entityTypeToDelete);
            setEntityTypeToDelete(null);
        }
    };

    const handleAddViewType = () => {
        if (newViewTypeName.trim()) {
            addViewType(newViewTypeName.trim());
            setNewViewTypeName('');
        }
    };

    const confirmDeleteViewType = () => {
        if (viewTypeToDelete) {
            deleteViewType(viewTypeToDelete);
            setViewTypeToDelete(null);
        }
    };

    const handleSaveTemplate = async (templateData: Omit<ProjectTemplate, 'id'>, id?: string) => {
        try {
            let templateId = id;
            if (!templateId) {
                const newId = templateData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                if (templates.some(t => t.id === newId)) {
                    toast({ title: "Error", description: "A template with a similar name already exists.", variant: "destructive" });
                    return;
                }
                templateId = newId;
            }
            const templateRef = doc(db, 'project_templates', templateId);
            await setDoc(templateRef, templateData, { merge: !!id });
            await loadData();
            setTemplateToEdit(null);
            toast({ title: "Success", description: "Template saved." });
        } catch (error) {
            console.error("Failed to save template:", error);
            toast({ title: "Error", description: "Could not save the template.", variant: "destructive" });
        }
    };

    const confirmDeleteTemplate = async () => {
        if (!templateToDelete) return;
        try {
            await deleteDoc(doc(db, 'project_templates', templateToDelete.id));
            await loadData();
            setTemplateToDelete(null);
            toast({ title: "Success", description: "Template deleted." });
        } catch (error) {
            console.error("Failed to delete template:", error);
            toast({ title: "Error", description: "Could not delete the template.", variant: "destructive" });
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
            <AddEditTemplateModal
                isOpen={!!templateToEdit}
                onClose={() => setTemplateToEdit(null)}
                template={templateToEdit}
                onSave={handleSaveTemplate}
                entityTypes={entityTypes}
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
            
            <AlertDialog open={!!entityTypeToDelete} onOpenChange={() => setEntityTypeToDelete(null)}>
                <AlertDialogContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the "{entityTypeToDelete}" type. Any entities using this type may behave unexpectedly.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="hover:bg-neutral-700" onClick={() => setEntityTypeToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteEntityType} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={!!viewTypeToDelete} onOpenChange={() => setViewTypeToDelete(null)}>
                <AlertDialogContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the "{viewTypeToDelete}" type. Any views using this type may behave unexpectedly.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="hover:bg-neutral-700" onClick={() => setViewTypeToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteViewType} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
                <AlertDialogContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the "{templateToDelete?.name}" template.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="hover:bg-neutral-700" onClick={() => setTemplateToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteTemplate} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <header className="h-16 flex items-center px-6 border-b border-neutral-700 bg-[#2a2a2a] flex-shrink-0">
                <h1 className="text-xl font-semibold text-white">Database</h1>
            </header>
            <main className="flex-1 p-8 bg-[#313131] overflow-y-auto">
                <Tabs defaultValue="entities" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
                        <TabsTrigger value="entities">Entities</TabsTrigger>
                        <TabsTrigger value="types">Entity Types</TabsTrigger>
                        <TabsTrigger value="view-types">View Types</TabsTrigger>
                        <TabsTrigger value="templates">Project Templates</TabsTrigger>
                    </TabsList>

                    <TabsContent value="entities" className="mt-6">
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
                    </TabsContent>
                    
                    <TabsContent value="types" className="mt-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="bg-[#2a2a2a] border-neutral-700 text-white">
                                <CardHeader>
                                    <CardTitle>Add New Entity Type</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="e.g., Garage"
                                            value={newEntityTypeName}
                                            onChange={(e) => setNewEntityTypeName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddEntityType()}
                                            className="bg-[#313131] border-neutral-600"
                                        />
                                        <Button onClick={handleAddEntityType} disabled={!newEntityTypeName.trim()} className="bg-yellow-500 hover:bg-yellow-600 text-black">Add Type</Button>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-[#2a2a2a] border-neutral-700 text-white">
                                <CardHeader>
                                    <CardTitle>Manage Entity Types</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-md border border-neutral-700 max-h-96 overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-neutral-700 hover:bg-[#2a2a2a]">
                                                    <TableHead className="text-white">Type Name</TableHead>
                                                    <TableHead className="text-right text-white">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {entityTypes.map(type => (
                                                    <TableRow key={type} className="border-neutral-700 hover:bg-[#313131]">
                                                        <TableCell className="font-medium capitalize">{type}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-600 text-red-500 hover:text-red-400" onClick={() => setEntityTypeToDelete(type)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="view-types" className="mt-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="bg-[#2a2a2a] border-neutral-700 text-white">
                                <CardHeader>
                                    <CardTitle>Add New View Type</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="e.g., floorplan"
                                            value={newViewTypeName}
                                            onChange={(e) => setNewViewTypeName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddViewType()}
                                            className="bg-[#313131] border-neutral-600"
                                        />
                                        <Button onClick={handleAddViewType} disabled={!newViewTypeName.trim()} className="bg-yellow-500 hover:bg-yellow-600 text-black">Add Type</Button>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-[#2a2a2a] border-neutral-700 text-white">
                                <CardHeader>
                                    <CardTitle>Manage View Types</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-md border border-neutral-700 max-h-96 overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-neutral-700 hover:bg-[#2a2a2a]">
                                                    <TableHead className="text-white">Type Name</TableHead>
                                                    <TableHead className="text-right text-white">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {viewTypes.map(type => (
                                                    <TableRow key={type} className="border-neutral-700 hover:bg-[#313131]">
                                                        <TableCell className="font-medium capitalize">{type}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-600 text-red-500 hover:text-red-400" onClick={() => setViewTypeToDelete(type)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="templates" className="mt-6">
                        <Card className="bg-[#2a2a2a] border-neutral-700 text-white">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Project Templates</CardTitle>
                                    <CardDescription>
                                        Create and manage reusable templates for new projects.
                                    </CardDescription>
                                </div>
                                <Button onClick={() => setTemplateToEdit({ name: '', description: '', content: '' })} className="bg-yellow-500 hover:bg-yellow-600 text-black">
                                    <Plus className="mr-2 h-4 w-4" />
                                    New Template
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border border-neutral-700">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-neutral-700 hover:bg-[#2a2a2a]">
                                                <TableHead className="text-white">Template Name</TableHead>
                                                <TableHead className="text-white">Description</TableHead>
                                                <TableHead className="text-right text-white">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {templates.length > 0 ? (
                                                templates.map(template => (
                                                    <TableRow key={template.id} className="border-neutral-700 hover:bg-[#313131]">
                                                        <TableCell className="font-medium">{template.name}</TableCell>
                                                        <TableCell className="text-neutral-400">{template.description}</TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-600" onClick={() => setTemplateToEdit(template)}>
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-600 text-red-500 hover:text-red-400" onClick={() => setTemplateToDelete(template)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-24 text-center text-neutral-400">
                                                        No templates created yet.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
