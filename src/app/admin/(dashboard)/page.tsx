
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Home, BadgeCheck, CircleDot } from 'lucide-react';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddProjectModal } from '@/components/admin/add-project-modal';
import { AddProjectFromTemplateModal } from '@/components/admin/add-project-from-template-modal';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import type { ProjectTemplate } from '@/components/admin/add-edit-template-modal';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, getDoc, setDoc, writeBatch, deleteDoc, query, where } from 'firebase/firestore';
import { ViewsProvider } from '@/contexts/views-context';


interface Project {
    id: string;
    name: string;
    description: string;
}

// Minimal type for entity to avoid full context dependency
interface ProjectEntity {
    id: string;
    projectId: string;
    entityType: string;
    status?: 'available' | 'sold';
}

interface ProjectStats {
    totalUnits: number;
    soldUnits: number;
    availableUnits: number;
}

function AdminProjectsPageComponent() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectStats, setProjectStats] = useState<Record<string, ProjectStats>>({});
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
    const { toast } = useToast();
    const router = useRouter();


    useEffect(() => {
        const loadProjects = async () => {
            try {
                // Load templates from Firestore
                const templatesSnapshot = await getDocs(collection(db, 'project_templates'));
                const loadedTemplates = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProjectTemplate[];
                setTemplates(loadedTemplates);
                
                // Load projects from Firestore
                const projectsSnapshot = await getDocs(collection(db, 'projects'));
                const loadedProjects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];
                setProjects(loadedProjects);

                // Load stats for each project
                const stats: Record<string, ProjectStats> = {};
                for (const project of loadedProjects) {
                    const entitiesQuery = query(collection(db, 'entities'), where('projectId', '==', project.id), where('entityType', 'in', ['Apartment', 'house']));
                    const entitiesSnapshot = await getDocs(entitiesQuery);
                    
                    let totalUnits = 0;
                    let soldUnits = 0;
                    if (!entitiesSnapshot.empty) {
                        const units = entitiesSnapshot.docs.map(doc => doc.data() as ProjectEntity);
                        totalUnits = units.length;
                        soldUnits = units.filter((u: ProjectEntity) => u.status === 'sold').length;
                    }
                    stats[project.id] = { totalUnits, soldUnits, availableUnits: totalUnits - soldUnits };
                }
                setProjectStats(stats);
            } catch (error) {
                console.error("Failed to load data from Firestore", error);
                toast({ title: "Error", description: "Could not load project data from the database.", variant: "destructive" });
            } finally {
                setIsMounted(true);
            }
        };
        
        loadProjects();
    }, [toast]);
    
    const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
        e.preventDefault();
        e.stopPropagation();
        setProjectToDelete(project);
    };

    const confirmDelete = async () => {
        if (!projectToDelete) return;
        
        try {
            // Delete all entities associated with the project
            const entitiesQuery = query(collection(db, 'entities'), where('projectId', '==', projectToDelete.id));
            const entitiesSnapshot = await getDocs(entitiesQuery);
            if (!entitiesSnapshot.empty) {
                const batch = writeBatch(db);
                entitiesSnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }
            
            // Delete the main project document
            await deleteDoc(doc(db, 'projects', projectToDelete.id));

            setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
            setProjectToDelete(null);
            toast({ title: "Project Deleted", description: `"${projectToDelete.name}" has been permanently removed.` });
        } catch (error) {
            console.error("Error deleting project:", error);
            toast({ title: "Error", description: "Could not delete the project.", variant: "destructive" });
        }
    };
    
    const handleAddProject = async (name: string, description: string) => {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        if (!slug) {
            alert(`Invalid project name.`);
            return;
        }

        const projectRef = doc(db, 'projects', slug);
        const projectSnap = await getDoc(projectRef);

        if (projectSnap.exists()) {
            alert(`A project with a similar name already exists or is invalid.`);
            return;
        }

        const newProject: Omit<Project, 'id'> = { name, description };
        await setDoc(projectRef, newProject);

        setProjects(prev => [...prev, { id: slug, ...newProject }]);
        router.push(`/admin/projects/${slug}`);
    };

    const handleAddProjectFromTemplate = async (name: string, description: string, templateContent: string) => {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        if (!slug) {
            toast({ title: "Project Creation Failed", description: `Invalid project name.`, variant: "destructive" });
            return;
        }

        const projectRef = doc(db, 'projects', slug);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
             toast({ title: "Project Creation Failed", description: `A project with a similar name already exists.`, variant: "destructive" });
            return;
        }

        try {
            const template = JSON.parse(templateContent);
            
            // Start a batch write
            const batch = writeBatch(db);

            // 1. Create the main project document
            const newProjectData = { name, description, landingPageEntityId: null };
            batch.set(projectRef, newProjectData);

            // 2. Recursively prepare entity documents for batch write
            const createEntitiesRecursive = (templateEntities: any[], parentId: string | null, allNewEntities: Map<string, any>) => {
                 if (!templateEntities || templateEntities.length === 0) return;

                for (const templateEntity of templateEntities) {
                    const entitySlugPart = templateEntity.entityName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    if (!entitySlugPart) continue;

                    let parentPath = '';
                    if (parentId) {
                         const parentEntityData = allNewEntities.get(parentId);
                         parentPath = parentEntityData ? parentEntityData.id : '';
                    }

                    const entityId = parentId ? `${parentPath}__${entitySlugPart}` : entitySlugPart;

                    let finalId = entityId;
                    let counter = 1;
                    while(allNewEntities.has(finalId)) {
                        finalId = `${entityId}-${counter++}`;
                    }

                    const newEntity = {
                        id: finalId, // Will be used for doc id
                        projectId: slug,
                        name: templateEntity.entityName,
                        entityType: templateEntity.entityType,
                        parentId: parentId,
                        views: [],
                        defaultViewId: null,
                        plotArea: undefined,
                        houseArea: undefined,
                        price: undefined,
                        status: undefined,
                        availableDate: undefined,
                        floors: undefined,
                        rooms: undefined,
                        detailedRooms: [],
                    };
                    
                    if (newEntity.entityType === 'Apartment' || newEntity.entityType === 'house') {
                        newEntity.status = 'available';
                        newEntity.floors = 1;
                        newEntity.rooms = 1;
                    }

                    allNewEntities.set(finalId, newEntity);
                    
                    if (templateEntity.childEntities && templateEntity.childEntities.length > 0) {
                        createEntitiesRecursive(templateEntity.childEntities, newEntity.id, allNewEntities);
                    }
                }
            };
            
            const allNewEntities = new Map<string, any>();
            createEntitiesRecursive(template.projectEntities, null, allNewEntities);
            
            allNewEntities.forEach((entityData, entityId) => {
                const entityDocRef = doc(db, 'entities', entityId);
                const { id, ...dataToSave } = entityData; // Don't save id inside the doc itself
                const finalData = Object.fromEntries(Object.entries(dataToSave).filter(([_, v]) => v !== undefined));
                batch.set(entityDocRef, finalData);
            });

            // Commit the batch
            await batch.commit();

            setProjects(prev => [...prev, { id: slug, name, description }]);

            toast({
                title: "Project Created!",
                description: `Project "${name}" has been created successfully from the template.`,
            });
            router.push(`/admin/projects/${slug}`);

        } catch (error) {
            console.error("Failed to parse template and create project:", error);
            toast({
                title: "Project Creation Error",
                description: "There was an error processing the template. Please check the JSON and try again.",
                variant: "destructive",
            });
        }
    };
    
    const handleCreateFromTemplateClick = () => {
        if (templates.length > 0) {
            setIsTemplateModalOpen(true);
        } else {
            toast({
                title: "No Templates Available",
                description: "Please create a project template in the Database section first.",
                variant: "destructive",
            });
        }
    };

    if (!isMounted) {
        return null;
    }

    return (
        <>
            <AddProjectModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onAddProject={handleAddProject} 
            />

            <AddProjectFromTemplateModal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                onAddProject={handleAddProjectFromTemplate}
            />

            <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
                <AlertDialogContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the "{projectToDelete?.name}" project and all of its associated data (entities, views, etc.).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="hover:bg-neutral-700" onClick={() => setProjectToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <header className="h-16 flex items-center px-6 border-b border-neutral-700 bg-[#2a2a2a] flex-shrink-0">
                <h1 className="text-xl font-semibold text-white">Projects Overview</h1>
            </header>
            <main className="flex-1 p-8 bg-[#313131]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {projects.map(project => (
                        <div key={project.id} className="group relative">
                            <Link href={`/admin/projects/${project.id}`} className="block h-full">
                                <Card className="bg-[#2a2a2a] border-neutral-700 text-white rounded-lg h-full cursor-pointer hover:border-yellow-500 transition-colors flex flex-col justify-between">
                                    <div>
                                        <CardHeader>
                                            <CardTitle className="text-lg font-medium">{project.name}</CardTitle>
                                            <CardDescription className="text-neutral-400 pt-1 text-sm">{project.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Separator className="my-2 bg-neutral-600" />
                                            <div className="mt-4 space-y-3 text-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-neutral-400 flex items-center"><Home className="mr-2 h-4 w-4" />Total Units</span>
                                                    <span className="font-semibold text-white">{projectStats[project.id]?.totalUnits ?? 0}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-neutral-400 flex items-center"><BadgeCheck className="mr-2 h-4 w-4 text-green-500" />Sold Units</span>
                                                    <span className="font-semibold text-white">{projectStats[project.id]?.soldUnits ?? 0}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-neutral-400 flex items-center"><CircleDot className="mr-2 h-4 w-4 text-yellow-500" />Available Units</span>
                                                    <span className="font-semibold text-white">{projectStats[project.id]?.availableUnits ?? 0}</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </div>
                                </Card>
                            </Link>
                             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-600 text-red-500 hover:text-red-400" onClick={(e) => handleDeleteClick(e, project)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                             <Card 
                                className="bg-[#2a2a2a] border-neutral-700 text-white flex flex-col items-center justify-center min-h-[240px] rounded-lg border-2 border-dashed border-neutral-600 hover:border-yellow-500 hover:text-yellow-500 cursor-pointer transition-colors"
                            >
                                <CardHeader className="items-center text-center p-4">
                                    <Plus className="h-8 w-8 mb-2" />
                                    <CardTitle className="text-lg font-medium">New Project</CardTitle>
                                    <CardDescription className="text-neutral-400 pt-2 text-sm">
                                        Create or import a new project
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                            <DropdownMenuItem onSelect={() => setIsAddModalOpen(true)} className="cursor-pointer hover:bg-neutral-700">Create basic project</DropdownMenuItem>
                            <DropdownMenuItem onSelect={handleCreateFromTemplateClick} className="cursor-pointer hover:bg-neutral-700">Create project from template</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                </div>
            </main>
        </>
    );
}

export default function AdminProjectsPage() {
    // projectId is not available on the overview page, so we pass undefined.
    // The provider is designed to handle this gracefully.
    return (
        <ViewsProvider projectId={undefined}>
            <AdminProjectsPageComponent />
        </ViewsProvider>
    );
}
