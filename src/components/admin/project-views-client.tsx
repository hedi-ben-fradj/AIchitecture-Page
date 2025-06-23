'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Building } from 'lucide-react';
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

// New recursive component
function EntityCardRecursive({ 
    entity, 
    allEntities, 
    onDelete, 
    landingPageEntityId,
    onSetLandingEntity, 
    projectId, 
    level = 0 
}: { 
    entity: Entity, 
    allEntities: Entity[],
    onDelete: (entityId: string) => void, 
    landingPageEntityId: string | null,
    onSetLandingEntity: (entityId: string | null) => void, 
    projectId: string, 
    level?: number 
}) {
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    
    const children = useMemo(() => allEntities.filter(e => e.parentId === entity.id), [allEntities, entity.id]);
    const isLandingEntity = landingPageEntityId === entity.id;

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
                            This action cannot be undone. This will permanently delete the "{entity.name}" entity and all its children and associated views.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="hover:bg-neutral-700">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className="w-full">
                <div className="group relative">
                    <Link href={`/admin/projects/${projectId}/entities/${entity.id}`}>
                        <Card className="bg-[#2a2a2a] border-neutral-700 text-white rounded-lg cursor-pointer hover:border-yellow-500 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <Building className="h-8 w-8 text-yellow-500" />
                                  <CardTitle className="text-lg font-medium">{entity.name}</CardTitle>
                                </div>
                                <div className="text-sm text-neutral-400">
                                    Contains {entity.views?.length || 0} views.
                                </div>
                            </CardHeader>
                        </Card>
                    </Link>
                    <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="flex items-center gap-2">
                            <Label htmlFor={`landing-${entity.id}`} className="text-xs text-neutral-400 select-none">Use on Landing</Label>
                            <Switch
                              id={`landing-${entity.id}`}
                              checked={isLandingEntity}
                              onCheckedChange={(checked) => onSetLandingEntity(checked ? entity.id : null)}
                              disabled={!entity.defaultViewId}
                            />
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-600" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                    </div>
                </div>

                {children.length > 0 && (
                    <div className="pl-8 pt-4 border-l-2 border-neutral-700 ml-4 space-y-4">
                        {children.map(child => (
                            <EntityCardRecursive
                                key={child.id}
                                entity={child}
                                allEntities={allEntities}
                                onDelete={onDelete}
                                landingPageEntityId={landingPageEntityId}
                                onSetLandingEntity={onSetLandingEntity}
                                projectId={projectId}
                                level={level + 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

export default function ProjectEntitiesClient({ projectName, projectId }: { projectName: string, projectId: string }) {
    const { entities, deleteEntity, landingPageEntityId, setLandingPageEntityId } = useProjectData();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const handleSetLanding = (entityId: string | null) => {
        setLandingPageEntityId(entityId);
    };
    
    const rootEntities = useMemo(() => entities.filter(e => !e.parentId), [entities]);

    return (
        <>
        <AddEntityModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
        <div className="space-y-6">
            {rootEntities.map((entity) => (
                <EntityCardRecursive
                  key={entity.id}
                  entity={entity}
                  allEntities={entities}
                  onDelete={deleteEntity}
                  landingPageEntityId={landingPageEntityId}
                  onSetLandingEntity={handleSetLanding}
                  projectId={projectId}
                />
            ))}
             <Card 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-[#2a2a2a] border-neutral-700 text-white flex flex-col items-center justify-center min-h-[150px] rounded-lg border-2 border-dashed border-neutral-600 hover:border-yellow-500 hover:text-yellow-500 cursor-pointer transition-colors"
             >
                <CardHeader className="items-center text-center p-4">
                    <Plus className="h-8 w-8 mb-2" />
                    <CardTitle className="text-lg font-medium">Add New Top-Level Entity</CardTitle>
                </CardHeader>
            </Card>
        </div>
        </>
    );
}
