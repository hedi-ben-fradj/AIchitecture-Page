'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
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

interface Project {
    id: string;
    name: string;
    description: string;
}

const PROJECTS_STORAGE_KEY = 'projects_list';

export default function AdminProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const storedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
                if (storedProjects) {
                    setProjects(JSON.parse(storedProjects));
                } else {
                    // Initialize with a default project if nothing is stored
                    const defaultProjects = [{ id: 'porto-montenegro', name: 'Porto Montenegro', description: 'description placeholder' }];
                    setProjects(defaultProjects);
                    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(defaultProjects));
                }
            } catch (error) {
                console.error("Failed to load or parse projects from localStorage", error);
                // Fallback to default if storage is corrupted
                const defaultProjects = [{ id: 'porto-montenegro', name: 'Porto Montenegro', description: 'description placeholder' }];
                setProjects(defaultProjects);
            }
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
    
    // Prevent hydration errors by not rendering until the client has mounted and loaded state
    if (!isMounted) {
        return null;
    }

    return (
        <>
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
                <h1 className="text-xl font-semibold text-white">Projects</h1>
            </header>
            <main className="flex-1 p-8 bg-[#313131]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {projects.map(project => (
                        <div key={project.id} className="group relative">
                            <Link href={`/admin/projects/${project.id}`} className="block h-full">
                                <Card className="bg-[#2a2a2a] border-neutral-700 text-white rounded-lg h-full cursor-pointer hover:border-yellow-500 transition-colors flex flex-col justify-between min-h-[240px]">
                                    <div>
                                        <CardHeader>
                                            <CardTitle className="text-lg font-medium">{project.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-2">
                                            <p className="text-sm text-neutral-400">
                                                {project.description}
                                            </p>
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

                    <Card className="bg-[#2a2a2a] border-neutral-700 text-white flex flex-col items-center justify-center min-h-[240px] rounded-lg">
                        <CardHeader className="items-center text-center p-4">
                            <CardTitle className="text-lg font-medium">New Project</CardTitle>
                            <CardDescription className="text-neutral-400 pt-2 text-sm">
                                Create or import a new project
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" size="icon" className="h-14 w-14 rounded-full bg-transparent border-neutral-600 hover:bg-neutral-700 hover:border-neutral-500">
                                <Plus className="h-7 w-7 text-neutral-400" />
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </>
    );
}
