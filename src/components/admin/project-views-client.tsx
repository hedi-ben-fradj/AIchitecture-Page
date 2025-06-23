'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Check, Eye, ArrowLeft } from 'lucide-react';
import { useProjectData, type Entity } from '@/contexts/views-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AddEntityModal } from '@/components/admin/add-entity-modal';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

function EntityCard({ entity, onDelete, isLandingEntity, onSetLandingEntity, projectId }: { entity: Entity, onDelete: (entityId: string) => void, isLandingEntity: boolean, onSetLandingEntity: (entityId: string | null) => void, projectId: string }) {
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsAlertOpen(true);
    };

    const confirmDelete = () => {
        onDelete(entity.id);
        setIsAlertOpen(false);
    }

    return (
        <>
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the "{entity.name}" entity and all its views.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="hover:bg-neutral-700">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className="group relative">
                <Link href={`/admin/projects/${projectId}/entities/${entity.id}`}>
                    <Card className="bg-[#2a2a2a] border-neutral-700 text-white rounded-lg h-full cursor-pointer hover:border-yellow-500 transition-colors min-h-[240px]">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <Eye className="h-8 w-8 text-yellow-500" />
                            <CardTitle className="text-lg font-medium">{entity.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-neutral-400">
                                Contains {entity.views?.length || 0} views.
                            </p>
                        </CardContent>
                    </Card>
                </Link>
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-600" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
                 <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    <Label htmlFor={`landing-${entity.id}`} className="text-xs text-neutral-400 select-none">Use on Landing</Label>
                    <Switch
                      id={`landing-${entity.id}`}
                      checked={isLandingEntity}
                      onCheckedChange={(checked) => onSetLandingEntity(checked ? entity.id : null)}
                      disabled={!entity.defaultViewId}
                    />
                </div>
            </div>
        </>
    );
}

export default function ProjectEntitiesClient({ projectName, projectId }: { projectName: string, projectId: string }) {
    const { entities, deleteEntity, landingPageEntityId, setLandingPageEntityId } = useProjectData();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // This component now manages the selected landing entity ID directly
    const handleSetLanding = (entityId: string | null) => {
        setLandingPageEntityId(entityId);
    };

    return (
        <>
        <AddEntityModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
        <div className="flex flex-col h-full bg-[#313131]">
             <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-neutral-700 bg-[#3c3c3c]">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="hover:bg-neutral-700">
                        <Link href="/admin">
                            <ArrowLeft className="h-5 w-5 text-white" />
                        </Link>
                    </Button>
                    <h1 className="text-xl font-semibold text-white">{projectName} / Entities</h1>
                </div>
            </header>
            <div className="flex-1 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {entities.map((entity) => (
                        <EntityCard
                          key={entity.id}
                          entity={entity}
                          onDelete={deleteEntity}
                          isLandingEntity={landingPageEntityId === entity.id}
                          onSetLandingEntity={handleSetLanding}
                          projectId={projectId}
                        />
                    ))}
                     <Card 
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-[#2a2a2a] border-neutral-700 text-white flex flex-col items-center justify-center min-h-[240px] rounded-lg border-2 border-dashed border-neutral-600 hover:border-yellow-500 hover:text-yellow-500 cursor-pointer transition-colors"
                     >
                        <CardHeader className="items-center text-center p-4">
                            <Plus className="h-8 w-8 mb-2" />
                            <CardTitle className="text-lg font-medium">Add New Entity</CardTitle>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        </div>
        </>
    );
}
