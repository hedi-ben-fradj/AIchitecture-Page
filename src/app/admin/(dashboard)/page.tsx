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

interface Project {
    id: string;
    name: string;
    description: string;
}

// Minimal type for entity to avoid full context dependency
interface ProjectEntity {
    entityType: string;
    status?: 'available' | 'sold';
}

interface ProjectStats {
    totalUnits: number;
    soldUnits: number;
    availableUnits: number;
}

const PROJECTS_STORAGE_KEY = 'projects_list';

export default function AdminProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectStats, setProjectStats] = useState<Record<string, ProjectStats>>({});
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const router = useRouter();


    useEffect(() => {
        if (typeof window !== 'undefined') {
            let currentProjects: Project[] = [];
            try {
                const storedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
                if (storedProjects) {
                    currentProjects = JSON.parse(storedProjects);
                }
                
                if (currentProjects.length === 0) {
                    const defaultProjects = [{ id: 'porto-montenegro', name: 'Porto Montenegro', description: 'description placeholder' }];
                    currentProjects = defaultProjects;
                    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(defaultProjects));
                }
            } catch (error) {
                console.error("Failed to load or parse projects from localStorage", error);
                currentProjects = [{ id: 'porto-montenegro', name: 'Porto Montenegro', description: 'description placeholder' }];
            }
            setProjects(currentProjects);

            const stats: Record<string, ProjectStats> = {};
            currentProjects.forEach(project => {
                const projectDataStr = localStorage.getItem(`project-${project.id}-data`);
                let totalUnits = 0;
                let soldUnits = 0;
                let availableUnits = 0;
                if (projectDataStr) {
                    try {
                        const projectData = JSON.parse(projectDataStr);
                        if (projectData && Array.isArray(projectData.entities)) {
                            const units = projectData.entities.filter(
                                (e: ProjectEntity) => e.entityType === 'Apartment' || e.entityType === 'house'
                            );
                            totalUnits = units.length;
                            soldUnits = units.filter((u: ProjectEntity) => u.status === 'sold').length;
                            availableUnits = units.length - soldUnits;
                        }
                    } catch(e) {
                        console.error(`Error parsing data for project ${project.id}:`, e);
                    }
                }
                stats[project.id] = { totalUnits, soldUnits, availableUnits };
            });
            setProjectStats(stats);
            setIsMounted(true);
        }
    }, []);
    
    const updateProjectsInStorage = (updatedProjects: Project[]) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updatedProjects));
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
        e.preventDefault();
        e.stopPropagation();
        setProjectToDelete(project);
    };

    const confirmDelete = () => {
        if (!projectToDelete) return;

        // Remove project-specific data from localStorage
        if (typeof window !== 'undefined') {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(`project-${projectToDelete.id}-`)) {
                    localStorage.removeItem(key);
                }
            });
        }

        // Update the main projects list in state and storage
        const updatedProjects = projects.filter(p => p.id !== projectToDelete.id);
        setProjects(updatedProjects);
        updateProjectsInStorage(updatedProjects);
        
        setProjectToDelete(null);
    };
    
    const handleAddProject = (name: string, description: string) => {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        if (!slug || projects.some(p => p.id === slug)) {
            alert(`A project with a similar name already exists or is invalid.`);
            return;
        }

        const newProject: Project = {
            id: slug,
            name,
            description,
        };

        const updatedProjects = [...projects, newProject];
        setProjects(updatedProjects);
        updateProjectsInStorage(updatedProjects);
        router.push(`/admin/projects/${slug}`);
    };

    const handleAddProjectFromTemplate = (name: string, description: string, template: string) => {
        // For now, this function is the same as creating a basic project.
        // The logic for handling templates will be implemented later.
        console.log(`Creating project "${name}" from template "${template}"`);
        handleAddProject(name, description);
    };
    
    // Prevent hydration errors by not rendering until the client has mounted and loaded state
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
                            This action cannot be undone. This will permanently delete the "{projectToDelete?.name}" project and all of its associated data.
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
                            <DropdownMenuItem onSelect={() => setIsTemplateModalOpen(true)} className="cursor-pointer hover:bg-neutral-700">Create project from template</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                </div>
            </main>
        </>
    );
}
