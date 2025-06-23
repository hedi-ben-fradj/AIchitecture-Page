
'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Eye, ArrowLeft, Building } from 'lucide-react';
import { useProjectData, type View, type Entity } from '@/contexts/views-context';
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
import { AddViewModal } from '@/components/admin/add-view-modal';
import { AddEntityModal } from '@/components/admin/add-entity-modal';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

function ViewCard({ view, onDelete, isDefaultView, onSetDefaultView, projectId, entityId }: { view: View, onDelete: (viewId: string) => void, isDefaultView: boolean, onSetDefaultView: (viewId: string) => void, projectId: string, entityId: string }) {
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const href = `/admin/projects/${projectId}/entities/${entityId}/views/${view.id}`;

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsAlertOpen(true);
    };

    const confirmDelete = () => {
        onDelete(view.id);
        setIsAlertOpen(false);
    }

    return (
        <>
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent className="bg-[#2a2a2a] border-neutral-700 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the "{view.name}" view.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="hover:bg-neutral-700">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className="group relative">
                <Link href={href}>
                    <Card className="bg-[#2a2a2a] border-neutral-700 text-white rounded-lg h-full cursor-pointer hover:border-yellow-500 transition-colors flex flex-col min-h-[240px] overflow-hidden">
                        <div className="relative flex-grow bg-neutral-800">
                            {view.imageUrl ? (
                                <>
                                    <Image src={view.imageUrl} alt={view.name} layout="fill" objectFit="cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full p-4 text-neutral-500">
                                    <Eye className="h-12 w-12" />
                                    <p className="mt-2 text-sm">No image uploaded</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-neutral-700 shrink-0">
                            <CardTitle className="text-lg font-medium truncate">{view.name}</CardTitle>
                            <p className="text-sm text-neutral-400 mt-1">
                                {`Contains ${view.selections?.length || 0} selections.`}
                            </p>
                        </div>
                    </Card>
                </Link>
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-600" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
                 <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    <Label htmlFor={`default-view-${view.id}`} className="text-xs text-neutral-400 select-none">Set as Default</Label>
                    <Switch
                      id={`default-view-${view.id}`}
                      checked={isDefaultView}
                      onCheckedChange={(checked) => { if(checked) onSetDefaultView(view.id) }}
                      disabled={isDefaultView}
                    />
                </div>
            </div>
        </>
    );
}

function EntityCard({ entity, onDelete, projectId }: { entity: Entity, onDelete: (entityId: string) => void, projectId: string }) {
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const { entities } = useProjectData();
    const childCount = useMemo(() => entities.filter(e => e.parentId === entity.id).length, [entities, entity.id]);
    
    const href = `/admin/projects/${projectId}/entities/${entity.id}`;

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
            <div className="group relative">
                <Link href={href}>
                    <Card className="bg-[#2a2a2a] border-neutral-700 text-white rounded-lg h-full cursor-pointer hover:border-yellow-500 transition-colors flex flex-col justify-between min-h-[240px]">
                       <div className="flex flex-col items-center justify-center flex-grow p-4 text-neutral-500">
                           <Building className="h-12 w-12 text-yellow-500" />
                       </div>
                       <div className="p-4 border-t border-neutral-700 shrink-0">
                            <CardTitle className="text-lg font-medium truncate">{entity.name}</CardTitle>
                            <p className="text-sm text-neutral-400 mt-1 capitalize">
                                {entity.entityType} &middot; {`Contains ${entity.views?.length || 0} views, ${childCount} children.`}
                            </p>
                        </div>
                    </Card>
                </Link>
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-600" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </>
    )
}

export default function EntityViewsClient({ projectId, entityId }: { projectId: string, entityId: string }) {
    const { getEntity, deleteView, setDefaultViewId, entities, deleteEntity } = useProjectData();
    const router = useRouter();
    const [isAddViewModalOpen, setIsAddViewModalOpen] = useState(false);
    const [isAddEntityModalOpen, setIsAddEntityModalOpen] = useState(false);

    const entity = getEntity(entityId);
    const childEntities = useMemo(() => entities.filter(e => e.parentId === entityId), [entities, entityId]);

    if (!entity) {
        // Could show a loading state or redirect
        return (
            <div className="flex-1 p-8 text-white">
                Entity not found. It may have been deleted.
                <Button onClick={() => router.push(`/admin/projects/${projectId}`)} className="mt-4">Back to project</Button>
            </div>
        );
    }
    
    return (
        <div className="space-y-12">
            <AddViewModal isOpen={isAddViewModalOpen} onClose={() => setIsAddViewModalOpen(false)} entityId={entityId} />
            <AddEntityModal isOpen={isAddEntityModalOpen} onClose={() => setIsAddEntityModalOpen(false)} parentId={entityId} />
            
            <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Views</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {entity.views.map((view) => (
                        <ViewCard
                          key={view.id}
                          view={view}
                          onDelete={(viewId) => deleteView(entityId, viewId)}
                          isDefaultView={entity.defaultViewId === view.id}
                          onSetDefaultView={(viewId) => setDefaultViewId(entityId, viewId)}
                          projectId={projectId}
                          entityId={entityId}
                        />
                    ))}
                    <Card 
                        onClick={() => setIsAddViewModalOpen(true)}
                        className="bg-[#2a2a2a] border-neutral-700 text-white flex flex-col items-center justify-center min-h-[240px] rounded-lg border-2 border-dashed border-neutral-600 hover:border-yellow-500 hover:text-yellow-500 cursor-pointer transition-colors"
                     >
                        <CardHeader className="items-center text-center p-4">
                            <Plus className="h-8 w-8 mb-2" />
                            <CardTitle className="text-lg font-medium">Add New View</CardTitle>
                        </CardHeader>
                    </Card>
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Child Entities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {childEntities.map((child) => (
                        <EntityCard 
                            key={child.id}
                            entity={child}
                            onDelete={deleteEntity}
                            projectId={projectId}
                        />
                    ))}
                    <Card 
                        onClick={() => setIsAddEntityModalOpen(true)}
                        className="bg-[#2a2a2a] border-neutral-700 text-white flex flex-col items-center justify-center min-h-[240px] rounded-lg border-2 border-dashed border-neutral-600 hover:border-yellow-500 hover:text-yellow-500 cursor-pointer transition-colors"
                    >
                        <CardHeader className="items-center text-center p-4">
                            <Plus className="h-8 w-8 mb-2" />
                            <CardTitle className="text-lg font-medium">Add Child Entity</CardTitle>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        </div>
    );
}
